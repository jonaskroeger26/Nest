import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  ComputeBudgetProgram,
} from "@solana/web3.js"
import { getKidsVaultProgramId } from "@/lib/solana-config"

const VAULT_SEED = "vault"
const TOKEN_VAULT_SEED = "token_vault"
const AUTO_SAVE_SEED = "auto_save"
const PROTOCOL_FEES_SEED = "protocol_fees"

// Anchor account sizes:
// SOL vault:   8 (disc) + 32 (creator) + 32 (beneficiary) + 8 (unlock_ts) + 1 (bump) = 81
// Token vault: 8 (disc) + 32 (creator) + 32 (beneficiary) + 32 (mint) + 8 (unlock_ts) + 1 (bump) = 113
const VAULT_DATA_SIZE = 81
const TOKEN_VAULT_DATA_SIZE = 113
const PARENT_PROFILE_DATA_SIZE = 73
const REGISTERED_CHILD_DATA_SIZE = 114
/** On-chain `AutoSaveSchedule` account size (8-byte Anchor disc + packed fields). */
export const AUTO_SAVE_SCHEDULE_DATA_SIZE = 138

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
)
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
)

/** Marinade mSOL mint (mainnet) */
export const MSOL_MINT_MAINNET = new PublicKey(
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface VaultInfo {
  vaultPda: string
  creator: string
  beneficiary: string
  unlockTimestamp: number
  balanceLamports: number
  balanceSol: number
  isToken: false
}

export interface TokenVaultInfo {
  vaultPda: string
  vaultAta: string
  creator: string
  beneficiary: string
  mint: string
  unlockTimestamp: number
  tokenAmount: bigint
  tokenAmountUi: number
  isToken: true
}

export type AnyVaultInfo = VaultInfo | TokenVaultInfo

export interface AutoSaveScheduleInfo {
  schedulePda: string
  parent: string
  beneficiary: string
  relayer: string
  amountPerPeriodLamports: bigint
  periodSeconds: number
  nextExecutionUnix: number
  vaultUnlockTimestamp: number
  bump: number
  active: boolean
}

// ---------------------------------------------------------------------------
// Instruction discriminator — Anchor uses SHA256("global:<ix_name>")[0..8]
// ---------------------------------------------------------------------------
async function instructionDiscriminator(name: string): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode("global:" + name)
  )
  return new Uint8Array(hash).slice(0, 8)
}

// ---------------------------------------------------------------------------
// PDA + ATA derivation
// ---------------------------------------------------------------------------
export function deriveVaultPDA(
  creator: PublicKey,
  beneficiary: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED, "utf8"), creator.toBuffer(), beneficiary.toBuffer()],
    getKidsVaultProgramId()
  )
  return pda
}

export function deriveTokenVaultPDA(
  creator: PublicKey,
  beneficiary: PublicKey,
  mint: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(TOKEN_VAULT_SEED, "utf8"),
      creator.toBuffer(),
      beneficiary.toBuffer(),
      mint.toBuffer(),
    ],
    getKidsVaultProgramId()
  )
  return pda
}

/** Global protocol fee config PDA (treasury + bps). Created with `init_protocol_fees`. */
export function deriveProtocolFeesPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(PROTOCOL_FEES_SEED, "utf8")],
    getKidsVaultProgramId()
  )
  return pda
}

export type ProtocolFeesConfig = {
  admin: PublicKey
  treasury: PublicKey
  feeBps: number
}

/** Read on-chain protocol fee settings; `null` if not initialized (locks/withdraws will fail until init). */
export async function fetchProtocolFeesConfig(
  connection: Connection
): Promise<ProtocolFeesConfig | null> {
  const pk = deriveProtocolFeesPDA()
  const info = await connection.getAccountInfo(pk)
  if (!info?.data || info.data.length < 75) return null
  const d = info.data
  const admin = new PublicKey(d.slice(8, 40))
  const treasury = new PublicKey(d.slice(40, 72))
  const feeBps = d.readUInt16LE(72)
  return { admin, treasury, feeBps }
}

/** Match on-chain `split_protocol_fee`: fee = floor(amount * bps / 10000), net = amount - fee. */
export function splitGrossLamportsWithFee(
  grossLamports: bigint,
  feeBps: number
): { netLamports: bigint; feeLamports: bigint } {
  if (feeBps <= 0 || grossLamports <= 0n) {
    return { netLamports: grossLamports, feeLamports: 0n }
  }
  const fee = (grossLamports * BigInt(feeBps)) / 10_000n
  const net = grossLamports - fee
  return { netLamports: net, feeLamports: fee }
}

/** Admin one-shot: initialize `protocol_fees` PDA (run once per cluster after program upgrade). */
export async function buildInitProtocolFeesInstruction(
  admin: PublicKey,
  treasury: PublicKey,
  feeBps: number
): Promise<TransactionInstruction> {
  if (feeBps < 0 || feeBps > 1_000) {
    throw new Error("fee_bps must be between 0 and 1000 (10%).")
  }
  const pda = deriveProtocolFeesPDA()
  const disc = await instructionDiscriminator("init_protocol_fees")
  const data = Buffer.alloc(8 + 32 + 2)
  for (let i = 0; i < 8; i++) data[i] = disc[i]!
  treasury.toBuffer().copy(data, 8)
  data.writeUInt16LE(feeBps, 40)
  return new TransactionInstruction({
    programId: getKidsVaultProgramId(),
    keys: [
      { pubkey: pda, isSigner: false, isWritable: true },
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

/** Admin: update treasury / fee bps (same limits as init). */
export async function buildSetProtocolFeesInstruction(
  admin: PublicKey,
  treasury: PublicKey,
  feeBps: number
): Promise<TransactionInstruction> {
  if (feeBps < 0 || feeBps > 1_000) {
    throw new Error("fee_bps must be between 0 and 1000 (10%).")
  }
  const pda = deriveProtocolFeesPDA()
  const disc = await instructionDiscriminator("set_protocol_fees")
  const data = Buffer.alloc(8 + 32 + 2)
  for (let i = 0; i < 8; i++) data[i] = disc[i]!
  treasury.toBuffer().copy(data, 8)
  data.writeUInt16LE(feeBps, 40)
  return new TransactionInstruction({
    programId: getKidsVaultProgramId(),
    keys: [
      { pubkey: pda, isSigner: false, isWritable: true },
      { pubkey: admin, isSigner: true, isWritable: false },
    ],
    data,
  })
}

/** PDA holding escrow SOL; relayer moves `amount_per_period` to the SOL vault on schedule. */
export function deriveAutoSaveSchedulePDA(
  parent: PublicKey,
  beneficiary: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(AUTO_SAVE_SEED, "utf8"),
      parent.toBuffer(),
      beneficiary.toBuffer(),
    ],
    getKidsVaultProgramId()
  )
  return pda
}

/** Schedule PDA account as loaded from RPC (includes balances). */
export type AutoSaveScheduleLoaded = {
  schedulePda: string
  parsed: AutoSaveScheduleInfo
  /** Total lamports on the schedule account (escrow + rent). */
  escrowLamports: number
  /** Lamports the program can use for drips after rent reserve. */
  spendableLamports: number
}

export async function fetchAutoSaveScheduleState(
  connection: Connection,
  parent: PublicKey,
  beneficiary: PublicKey
): Promise<AutoSaveScheduleLoaded | null> {
  const pda = deriveAutoSaveSchedulePDA(parent, beneficiary)
  const acc = await connection.getAccountInfo(pda)
  if (!acc?.data || acc.data.length < AUTO_SAVE_SCHEDULE_DATA_SIZE) return null
  if (!acc.owner.equals(getKidsVaultProgramId())) return null
  const parsed = parseAutoSaveScheduleAccount(pda, Buffer.from(acc.data))
  if (!parsed) return null
  const minRent = await connection.getMinimumBalanceForRentExemption(
    AUTO_SAVE_SCHEDULE_DATA_SIZE
  )
  const spendableLamports = Math.max(0, acc.lamports - minRent)
  return {
    schedulePda: pda.toBase58(),
    parsed,
    escrowLamports: acc.lamports,
    spendableLamports,
  }
}

export function parseAutoSaveScheduleAccount(
  pubkey: PublicKey,
  data: Buffer
): AutoSaveScheduleInfo | null {
  if (data.length < AUTO_SAVE_SCHEDULE_DATA_SIZE) return null
  const parent = new PublicKey(data.subarray(8, 40))
  const beneficiary = new PublicKey(data.subarray(40, 72))
  const relayer = new PublicKey(data.subarray(72, 104))
  const dv = new DataView(data.buffer, data.byteOffset, data.length)
  const amountPerPeriodLamports = dv.getBigUint64(104, true)
  const periodSeconds = Number(dv.getBigInt64(112, true))
  const nextExecutionUnix = Number(dv.getBigInt64(120, true))
  const vaultUnlockTimestamp = Number(dv.getBigInt64(128, true))
  const bump = data[136] ?? 0
  const active = (data[137] ?? 0) !== 0
  return {
    schedulePda: pubkey.toBase58(),
    parent: parent.toBase58(),
    beneficiary: beneficiary.toBase58(),
    relayer: relayer.toBase58(),
    amountPerPeriodLamports,
    periodSeconds,
    nextExecutionUnix,
    vaultUnlockTimestamp,
    bump,
    active,
  }
}

/** Unlock timestamp (unix seconds) for an existing SOL vault, or null if missing. */
export async function getSolVaultUnlockTimestamp(
  connection: Connection,
  creator: PublicKey,
  beneficiary: PublicKey
): Promise<number | null> {
  const vaultPda = deriveVaultPDA(creator, beneficiary)
  const info = await connection.getAccountInfo(vaultPda)
  if (!info?.data || info.data.length < VAULT_DATA_SIZE) return null
  const programId = getKidsVaultProgramId()
  if (!info.owner.equals(programId)) return null
  const dv = new DataView(
    info.data.buffer,
    info.data.byteOffset,
    info.data.length
  )
  return Number(dv.getBigInt64(72, true))
}

export function deriveATA(owner: PublicKey, mint: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
  return ata
}

export function encodeDisplayName32(name: string): Buffer {
  const buf = Buffer.alloc(32)
  const enc = Buffer.from(name.trim().slice(0, 32), "utf8")
  enc.copy(buf, 0, 0, Math.min(32, enc.length))
  return buf
}

export function decodeDisplayName32(data: Buffer | Uint8Array): string {
  const b = Buffer.from(data)
  const z = b.indexOf(0)
  return (z === -1 ? b : b.subarray(0, z)).toString("utf8").trim()
}

export function deriveParentProfilePda(parent: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("parent_profile", "utf8"), parent.toBuffer()],
    getKidsVaultProgramId()
  )
  return pda
}

export function deriveRegisteredChildPda(
  parent: PublicKey,
  beneficiary: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("registered_child", "utf8"),
      parent.toBuffer(),
      beneficiary.toBuffer(),
    ],
    getKidsVaultProgramId()
  )
  return pda
}

export interface RegisteredChildOnChain {
  beneficiary: string
  name: string
  registeredAt: number
  pda: string
}

export async function fetchParentDisplayNameFromChain(
  connection: Connection,
  parent: PublicKey
): Promise<string | null> {
  const pda = deriveParentProfilePda(parent)
  const acc = await connection.getAccountInfo(pda, "confirmed")
  if (!acc?.data || acc.data.length < PARENT_PROFILE_DATA_SIZE) return null
  const s = decodeDisplayName32(acc.data.subarray(8 + 32, 8 + 32 + 32))
  return s || null
}

export async function fetchRegisteredChildrenFromChain(
  connection: Connection,
  parent: PublicKey
): Promise<RegisteredChildOnChain[]> {
  const programId = getKidsVaultProgramId()
  let accounts: Awaited<
    ReturnType<Connection["getProgramAccounts"]>
  > = []
  try {
    accounts = await connection.getProgramAccounts(programId, {
      filters: [
        { dataSize: REGISTERED_CHILD_DATA_SIZE },
        { memcmp: { offset: 8, bytes: parent.toBase58() } },
      ],
    })
  } catch {
    return []
  }
  const out: RegisteredChildOnChain[] = []
  for (const { pubkey, account } of accounts) {
    const d = account.data
    if (d.length < REGISTERED_CHILD_DATA_SIZE) continue
    const beneficiary = new PublicKey(d.subarray(40, 72)).toBase58()
    const name = decodeDisplayName32(d.subarray(72, 104)) || "Child"
    const dv = new DataView(d.buffer, d.byteOffset, d.length)
    const registeredAt = Number(dv.getBigInt64(104, true))
    out.push({
      beneficiary,
      name,
      registeredAt,
      pda: pubkey.toBase58(),
    })
  }
  out.sort((a, b) => a.registeredAt - b.registeredAt)
  return out
}

/** Anchor IDL discriminators (avoids WebCrypto / SES issues in some wallets). */
const DISC_SET_PARENT_DISPLAY_NAME = Buffer.from([
  64, 98, 135, 209, 180, 33, 40, 99,
])
const DISC_REGISTER_CHILD = Buffer.from([147, 197, 225, 49, 210, 4, 21, 223])

async function txErrorDetail(
  connection: Connection,
  e: unknown
): Promise<string> {
  const base = (e as Error)?.message ?? String(e)
  try {
    const err = e as { getLogs?: (c: Connection) => Promise<string[] | null> }
    if (typeof err.getLogs === "function") {
      const logs = await err.getLogs(connection)
      if (logs?.length) return `${base}\n${logs.slice(-12).join("\n")}`
    }
  } catch {
    /* ignore */
  }
  const logs = (e as { logs?: string[] }).logs
  if (logs?.length) return `${base}\n${logs.slice(-12).join("\n")}`
  return base
}

function hintFromProgramLogs(logText: string): string | null {
  if (/already in use|Account.*already exists|0x0\b/i.test(logText))
    return "This child wallet is already registered for your account — refresh the page."
  if (/insufficient lamports|Insufficient funds/i.test(logText))
    return "Need a little more SOL in your wallet for account rent (~0.002 SOL on testnet)."
  if (/InstructionFallbackNotFound|custom program error: 0x65|0x65\b/i.test(logText))
    return (
      "On-chain program is still the OLD build (no register_child). Upgrade with the .so at " +
      "target/sbpf-solana-solana/release/kids_vault.so — see Nest README “program outdated”."
    )
  if (/Program .* failed: custom program error/i.test(logText))
    return "On-chain program rejected the transaction — check Phantom is on the same network as Nest (testnet)."
  return null
}

export async function setParentDisplayNameOnChain(
  connection: Connection,
  parent: PublicKey,
  displayName: string,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const data = Buffer.alloc(8 + 32)
  DISC_SET_PARENT_DISPLAY_NAME.copy(data, 0)
  encodeDisplayName32(displayName).copy(data, 8)
  const parentProfile = deriveParentProfilePda(parent)
  const ix = new TransactionInstruction({
    programId: getKidsVaultProgramId(),
    keys: [
      { pubkey: parentProfile, isSigner: false, isWritable: true },
      { pubkey: parent, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
  const tx = new Transaction().add(ix)
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed")
  tx.recentBlockhash = blockhash
  tx.feePayer = parent
  const signed = await signTransaction(tx)
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
  })
  try {
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    )
  } catch (e) {
    const detail = await txErrorDetail(connection, e)
    logTxError("setParentDisplayNameOnChain", e)
    const hint = hintFromProgramLogs(detail)
    throw new Error(hint ?? toUserMessage(e) ?? detail.slice(0, 220))
  }
  return sig
}

export async function registerChildOnChain(
  connection: Connection,
  parent: PublicKey,
  beneficiary: PublicKey,
  childName: string,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const programId = getKidsVaultProgramId()
  const registeredChild = deriveRegisteredChildPda(parent, beneficiary)
  const existing = await connection.getAccountInfo(registeredChild, "confirmed")
  if (
    existing &&
    existing.owner.equals(programId) &&
    existing.data.length >= REGISTERED_CHILD_DATA_SIZE
  ) {
    throw new Error(
      "This child wallet is already registered — refresh the page to see them."
    )
  }

  const data = Buffer.alloc(8 + 32)
  DISC_REGISTER_CHILD.copy(data, 0)
  encodeDisplayName32(childName).copy(data, 8)
  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: registeredChild, isSigner: false, isWritable: true },
      { pubkey: parent, isSigner: true, isWritable: true },
      { pubkey: beneficiary, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
  const tx = new Transaction().add(ix)
  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed")
    tx.recentBlockhash = blockhash
    tx.feePayer = parent
    const signed = await signTransaction(tx)
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
    })
    try {
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      )
    } catch (confirmErr) {
      const detail = await txErrorDetail(connection, confirmErr)
      logTxError("registerChildOnChain confirm", confirmErr, { signature: sig })
      throw new Error(
        hintFromProgramLogs(detail) ??
          `Transaction sent (${sig.slice(0, 8)}…) but confirmation timed out. Check Solscan.`
      )
    }
    return sig
  } catch (e) {
    const detail = await txErrorDetail(connection, e)
    logTxError("registerChildOnChain", e, { detail: detail.slice(0, 500) })
    const hint = hintFromProgramLogs(detail)
    if (hint) throw new Error(hint)
    const userMsg = toUserMessage(e)
    if (userMsg) throw new Error(userMsg)
    if (/already in use|0x0|Account.*exists/i.test(detail))
      throw new Error(
        "This child wallet is already registered — refresh the page."
      )
    throw new Error(detail.slice(0, 280))
  }
}

// ---------------------------------------------------------------------------
// Logging + user-facing error messages
// ---------------------------------------------------------------------------
function logTxError(
  where: string,
  error: unknown,
  extra?: Record<string, unknown>
) {
  // eslint-disable-next-line no-console
  console.error("[Nest tx error]", where, { error, ...(extra || {}) })
}

/** Turn known simulation/rpc errors into a short message for the UI. */
function toUserMessage(e: unknown): string | null {
  const msg = (e as Error)?.message ?? String(e)
  if (/program that does not exist|Attempt to load a program/i.test(msg))
    return (
      "Vault program is not on this network. If you deployed on testnet, set Vercel " +
      "NEXT_PUBLIC_SOLANA_CLUSTER=testnet. For mainnet, deploy kids-vault there and set the program ID."
    )
  if (/0x65|InstructionFallbackNotFound|Fallback functions are not supported/i.test(msg))
    return (
      "Kids-vault on-chain is the old binary. Run anchor upgrade from " +
      "target/sbpf-solana-solana/release/kids_vault.so (see Nest README)."
    )
  if (/may not be used for executing instructions/i.test(msg))
    return "Program not executable here. Deploy kids-vault to the cluster your app uses."
  if (/insufficient funds|Transfer: insufficient lamports/i.test(msg))
    return "Not enough SOL in your wallet (include rent + amount)."
  if (/exceeded|compute unit|Consumed.*of.*compute/i.test(msg))
    return "Network busy — try again in a moment."
  return null
}

// ---------------------------------------------------------------------------
// RPC connection (via /api/solana-rpc — reads server .env.local)
// ---------------------------------------------------------------------------
let cachedRpcUrl: string | null = null
export async function getConnection(): Promise<Connection> {
  if (cachedRpcUrl) return new Connection(cachedRpcUrl, "confirmed")
  const res = await fetch("/api/solana-rpc")
  const data = (await res.json()) as { url?: string; error?: string }
  if (!res.ok || data.error) {
    throw new Error(
      data.error ??
        "RPC not configured. For mainnet add SOLANA_RPC_MAINNET (Helius) to .env.local."
    )
  }
  if (data.url) {
    cachedRpcUrl = data.url
    return new Connection(data.url, "confirmed")
  }
  throw new Error("RPC URL missing from /api/solana-rpc response.")
}

// ---------------------------------------------------------------------------
// Fetch SOL vaults where wallet is the beneficiary
// ---------------------------------------------------------------------------
export async function getVaultsByBeneficiary(
  connection: Connection,
  beneficiary: PublicKey
): Promise<VaultInfo[]> {
  const accounts = await connection.getProgramAccounts(getKidsVaultProgramId(), {
    filters: [
      { dataSize: VAULT_DATA_SIZE },
      // beneficiary at offset: 8 (disc) + 32 (creator) = 40
      { memcmp: { offset: 40, bytes: beneficiary.toBase58() } },
    ],
  })
  const out: VaultInfo[] = []
  for (const { pubkey, account } of accounts) {
    const data = account.data
    if (data.length < VAULT_DATA_SIZE) continue
    const creator = new PublicKey(data.slice(8, 40))
    const beneficiaryPubkey = new PublicKey(data.slice(40, 72))
    const dv = new DataView(data.buffer, data.byteOffset, data.length)
    const unlockTimestamp = Number(dv.getBigInt64(72, true))
    out.push({
      vaultPda: pubkey.toBase58(),
      creator: creator.toBase58(),
      beneficiary: beneficiaryPubkey.toBase58(),
      unlockTimestamp,
      balanceLamports: account.lamports,
      balanceSol: account.lamports / 1e9,
      isToken: false,
    })
  }
  return out
}

/** All SOL vaults created by this wallet (parent dashboard). */
export async function getVaultsByCreator(
  connection: Connection,
  creator: PublicKey
): Promise<VaultInfo[]> {
  const accounts = await connection.getProgramAccounts(getKidsVaultProgramId(), {
    filters: [
      { dataSize: VAULT_DATA_SIZE },
      { memcmp: { offset: 8, bytes: creator.toBase58() } },
    ],
  })
  const out: VaultInfo[] = []
  for (const { pubkey, account } of accounts) {
    const data = account.data
    if (data.length < VAULT_DATA_SIZE) continue
    const creatorPk = new PublicKey(data.slice(8, 40))
    const beneficiaryPubkey = new PublicKey(data.slice(40, 72))
    const dv = new DataView(data.buffer, data.byteOffset, data.length)
    const unlockTimestamp = Number(dv.getBigInt64(72, true))
    out.push({
      vaultPda: pubkey.toBase58(),
      creator: creatorPk.toBase58(),
      beneficiary: beneficiaryPubkey.toBase58(),
      unlockTimestamp,
      balanceLamports: account.lamports,
      balanceSol: account.lamports / 1e9,
      isToken: false,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Fetch token (mSOL) vaults where wallet is the beneficiary
// ---------------------------------------------------------------------------
export async function getTokenVaultsByBeneficiary(
  connection: Connection,
  beneficiary: PublicKey,
  mint: PublicKey = MSOL_MINT_MAINNET
): Promise<TokenVaultInfo[]> {
  const accounts = await connection.getProgramAccounts(getKidsVaultProgramId(), {
    filters: [
      { dataSize: TOKEN_VAULT_DATA_SIZE },
      // beneficiary at offset: 8 (disc) + 32 (creator) = 40
      { memcmp: { offset: 40, bytes: beneficiary.toBase58() } },
      // mint at offset: 8 + 32 + 32 = 72
      { memcmp: { offset: 72, bytes: mint.toBase58() } },
    ],
  })
  const out: TokenVaultInfo[] = []
  for (const { pubkey, account } of accounts) {
    const data = account.data
    if (data.length < TOKEN_VAULT_DATA_SIZE) continue
    const creator = new PublicKey(data.slice(8, 40))
    const beneficiaryPubkey = new PublicKey(data.slice(40, 72))
    const mintPubkey = new PublicKey(data.slice(72, 104))
    const dv = new DataView(data.buffer, data.byteOffset, data.length)
    const unlockTimestamp = Number(dv.getBigInt64(104, true))
    const tokenVaultPDA = pubkey
    const vaultAta = deriveATA(tokenVaultPDA, mintPubkey)
    let tokenAmount = 0n
    try {
      const bal = await connection.getTokenAccountBalance(vaultAta)
      tokenAmount = BigInt(bal.value.amount)
    } catch {
      continue
    }
    if (tokenAmount <= 0n) continue
    out.push({
      vaultPda: pubkey.toBase58(),
      vaultAta: vaultAta.toBase58(),
      creator: creator.toBase58(),
      beneficiary: beneficiaryPubkey.toBase58(),
      mint: mintPubkey.toBase58(),
      unlockTimestamp,
      tokenAmount,
      tokenAmountUi: Number(tokenAmount) / 1e9,
      isToken: true,
    })
  }
  return out
}

/** Token vaults created by this wallet (e.g. mSOL locks). */
export async function getTokenVaultsByCreator(
  connection: Connection,
  creator: PublicKey,
  mint: PublicKey = MSOL_MINT_MAINNET
): Promise<TokenVaultInfo[]> {
  const accounts = await connection.getProgramAccounts(getKidsVaultProgramId(), {
    filters: [
      { dataSize: TOKEN_VAULT_DATA_SIZE },
      { memcmp: { offset: 8, bytes: creator.toBase58() } },
      { memcmp: { offset: 72, bytes: mint.toBase58() } },
    ],
  })
  const out: TokenVaultInfo[] = []
  for (const { pubkey, account } of accounts) {
    const data = account.data
    if (data.length < TOKEN_VAULT_DATA_SIZE) continue
    const creatorPk = new PublicKey(data.slice(8, 40))
    const beneficiaryPubkey = new PublicKey(data.slice(40, 72))
    const mintPubkey = new PublicKey(data.slice(72, 104))
    const dv = new DataView(data.buffer, data.byteOffset, data.length)
    const unlockTimestamp = Number(dv.getBigInt64(104, true))
    const vaultAta = deriveATA(pubkey, mintPubkey)
    let tokenAmount = 0n
    try {
      const bal = await connection.getTokenAccountBalance(vaultAta)
      tokenAmount = BigInt(bal.value.amount)
    } catch {
      continue
    }
    if (tokenAmount <= 0n) continue
    out.push({
      vaultPda: pubkey.toBase58(),
      vaultAta: vaultAta.toBase58(),
      creator: creatorPk.toBase58(),
      beneficiary: beneficiaryPubkey.toBase58(),
      mint: mintPubkey.toBase58(),
      unlockTimestamp,
      tokenAmount,
      tokenAmountUi: Number(tokenAmount) / 1e9,
      isToken: true,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Fetch all vaults (SOL + mSOL) for a beneficiary
// ---------------------------------------------------------------------------
export async function getAllVaultsByBeneficiary(
  connection: Connection,
  beneficiary: PublicKey
): Promise<AnyVaultInfo[]> {
  const [solVaults, tokenVaults] = await Promise.all([
    getVaultsByBeneficiary(connection, beneficiary),
    getTokenVaultsByBeneficiary(connection, beneficiary),
  ])
  return [...solVaults, ...tokenVaults]
}

// ---------------------------------------------------------------------------
// Create SOL vault
// ---------------------------------------------------------------------------
export async function createSolVault(
  connection: Connection,
  creator: PublicKey,
  beneficiary: PublicKey,
  amountSol: number,
  unlockTimestamp: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const amountLamports = Math.floor(amountSol * 1e9)
  if (amountLamports <= 0) {
    throw new Error("Amount must be greater than zero.")
  }
  const vaultPDA = deriveVaultPDA(creator, beneficiary)
  const programId = getKidsVaultProgramId()
  const existing = await connection.getAccountInfo(vaultPDA)

  let tx: Transaction
  if (
    existing &&
    existing.owner.equals(programId) &&
    existing.data.length >= VAULT_DATA_SIZE
  ) {
    const storedCreator = new PublicKey(existing.data.slice(8, 40))
    const storedBen = new PublicKey(existing.data.slice(40, 72))
    if (!storedCreator.equals(creator) || !storedBen.equals(beneficiary)) {
      throw new Error("Vault address conflict. Use a different child wallet.")
    }
    const protocol = await fetchProtocolFeesConfig(connection)
    if (!protocol) {
      throw new Error(
        "Protocol fee config is missing on this cluster. Deploy the latest kids-vault program and run init_protocol_fees once (see Nest README “Protocol fees”)."
      )
    }
    const depDisc = await instructionDiscriminator("deposit_sol_vault")
    const depData = new ArrayBuffer(8 + 8)
    const depView = new DataView(depData)
    for (let i = 0; i < 8; i++) depView.setUint8(i, depDisc[i]!)
    depView.setBigUint64(8, BigInt(amountLamports), true)
    const protocolPda = deriveProtocolFeesPDA()
    const depIx = new TransactionInstruction({
      programId: programId,
      keys: [
        { pubkey: protocolPda, isSigner: false, isWritable: false },
        { pubkey: protocol.treasury, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: creator, isSigner: true, isWritable: true },
        { pubkey: beneficiary, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(depData),
    })
    tx = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
      .add(depIx)
  } else if (existing) {
    throw new Error(
      "That vault address is already in use. Try a different child wallet."
    )
  } else {
    const protocol = await fetchProtocolFeesConfig(connection)
    if (!protocol) {
      throw new Error(
        "Protocol fee config is missing on this cluster. Deploy the latest kids-vault program and run init_protocol_fees once (see Nest README “Protocol fees”)."
      )
    }
    const disc = await instructionDiscriminator("create_vault")
    const data = new ArrayBuffer(8 + 8 + 8)
    const view = new DataView(data)
    for (let i = 0; i < 8; i++) view.setUint8(i, disc[i])
    view.setBigUint64(8, BigInt(amountLamports), true)
    view.setBigInt64(16, BigInt(unlockTimestamp), true)
    const protocolPda = deriveProtocolFeesPDA()
    const ix = new TransactionInstruction({
      programId: programId,
      keys: [
        { pubkey: protocolPda, isSigner: false, isWritable: false },
        { pubkey: protocol.treasury, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: creator, isSigner: true, isWritable: true },
        { pubkey: beneficiary, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(data),
    })
    tx = new Transaction()
      .add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
      )
      .add(ix)
  }
  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed")
    tx.recentBlockhash = blockhash
    tx.feePayer = creator
    const signed = await signTransaction(tx)
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
    })
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    )
    return sig
  } catch (e) {
    logTxError("createSolVault", e)
    const userMsg = toUserMessage(e)
    throw userMsg ? new Error(userMsg) : e
  }
}

// ---------------------------------------------------------------------------
// Withdraw SOL vault — only beneficiary can call, only after unlock_timestamp
// ---------------------------------------------------------------------------
export async function withdrawSolVault(
  connection: Connection,
  creator: PublicKey,
  beneficiary: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const protocol = await fetchProtocolFeesConfig(connection)
  if (!protocol) {
    throw new Error(
      "Protocol fee config is missing on this cluster. Run init_protocol_fees once (Nest README)."
    )
  }
  const vaultPDA = deriveVaultPDA(creator, beneficiary)
  const disc = await instructionDiscriminator("withdraw")
  const data = Buffer.alloc(8)
  for (let i = 0; i < 8; i++) data[i] = disc[i]!
  const protocolPda = deriveProtocolFeesPDA()
  const ix = new TransactionInstruction({
    programId: getKidsVaultProgramId(),
    keys: [
      { pubkey: protocolPda, isSigner: false, isWritable: false },
      { pubkey: protocol.treasury, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: beneficiary, isSigner: true, isWritable: true },
    ],
    data,
  })
  const tx = new Transaction().add(ix)
  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed")
    tx.recentBlockhash = blockhash
    tx.feePayer = beneficiary
    const signed = await signTransaction(tx)
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
    })
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    )
    return sig
  } catch (e) {
    logTxError("withdrawSolVault", e)
    const userMsg = toUserMessage(e)
    throw userMsg ? new Error(userMsg) : e
  }
}

// ---------------------------------------------------------------------------
// Create token vault (mSOL or any SPL token)
// ---------------------------------------------------------------------------
export async function createTokenVault(
  connection: Connection,
  creator: PublicKey,
  beneficiary: PublicKey,
  mint: PublicKey,
  amountTokenUnits: bigint,
  unlockTimestamp: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const tokenVaultPDA = deriveTokenVaultPDA(creator, beneficiary, mint)
  const vaultAta = deriveATA(tokenVaultPDA, mint)
  const creatorAta = deriveATA(creator, mint)
  const disc = await instructionDiscriminator("create_token_vault")
  const data = new ArrayBuffer(8 + 8 + 8)
  const view = new DataView(data)
  for (let i = 0; i < 8; i++) view.setUint8(i, disc[i])
  view.setBigUint64(8, amountTokenUnits, true)
  view.setBigInt64(16, BigInt(unlockTimestamp), true)
  const ix = new TransactionInstruction({
    programId: getKidsVaultProgramId(),
    keys: [
      { pubkey: tokenVaultPDA, isSigner: false, isWritable: true },
      { pubkey: vaultAta, isSigner: false, isWritable: true },
      { pubkey: creatorAta, isSigner: false, isWritable: true },
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: beneficiary, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  })
  const tx = new Transaction().add(ix)
  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed")
    tx.recentBlockhash = blockhash
    tx.feePayer = creator
    const signed = await signTransaction(tx)
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
    })
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    )
    return sig
  } catch (e) {
    logTxError("createTokenVault", e)
    const userMsg = toUserMessage(e)
    throw userMsg ? new Error(userMsg) : e
  }
}

// ---------------------------------------------------------------------------
// Withdraw token vault (mSOL) — beneficiary receives tokens to their ATA
// ---------------------------------------------------------------------------
export async function withdrawTokenVault(
  connection: Connection,
  creator: PublicKey,
  beneficiary: PublicKey,
  mint: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const tokenVaultPDA = deriveTokenVaultPDA(creator, beneficiary, mint)
  const vaultAta = deriveATA(tokenVaultPDA, mint)
  const beneficiaryAta = deriveATA(beneficiary, mint)
  const disc = await instructionDiscriminator("withdraw_token_vault")
  const data = Buffer.alloc(8)
  for (let i = 0; i < 8; i++) data[i] = disc[i]
  const ix = new TransactionInstruction({
    programId: getKidsVaultProgramId(),
    keys: [
      { pubkey: tokenVaultPDA, isSigner: false, isWritable: true },
      { pubkey: vaultAta, isSigner: false, isWritable: true },
      { pubkey: beneficiaryAta, isSigner: false, isWritable: true },
      { pubkey: beneficiary, isSigner: true, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
  const tx = new Transaction().add(ix)
  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed")
    tx.recentBlockhash = blockhash
    tx.feePayer = beneficiary
    const signed = await signTransaction(tx)
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
    })
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    )
    return sig
  } catch (e) {
    logTxError("withdrawTokenVault", e)
    const userMsg = toUserMessage(e)
    throw userMsg ? new Error(userMsg) : e
  }
}

// ---------------------------------------------------------------------------
// createMsolVault — stake SOL → mSOL via Marinade API then lock in token vault
// ---------------------------------------------------------------------------
export async function createMsolVault(
  connection: Connection,
  creator: PublicKey,
  beneficiary: PublicKey,
  amountSol: number,
  unlockTimestamp: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<{ depositSig: string; lockSig: string }> {
  try {
    // Step 1: Build Marinade deposit tx server-side (avoids Anchor/Node issues on client)
    const res = await fetch("/api/build-marinade-deposit-tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountSol, creator: creator.toBase58() }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error ?? `API ${res.status}`)
    }
    const {
      transactionBase64,
      associatedMSolTokenAccountAddress,
    }: { transactionBase64: string; associatedMSolTokenAccountAddress: string } =
      await res.json()

    // Step 2: Sign + send the Marinade deposit tx
    const binary = atob(transactionBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const depositTx = Transaction.from(bytes)
    const signedDeposit = await signTransaction(depositTx)
    const { blockhash: bh1, lastValidBlockHeight: lvbh1 } =
      await connection.getLatestBlockhash("confirmed")
    const sig1 = await connection.sendRawTransaction(signedDeposit.serialize(), {
      skipPreflight: false,
    })
    await connection.confirmTransaction(
      { signature: sig1, blockhash: bh1, lastValidBlockHeight: lvbh1 },
      "confirmed"
    )

    // Step 3: Read mSOL balance received
    const balance = await connection.getTokenAccountBalance(
      new PublicKey(associatedMSolTokenAccountAddress)
    )
    const amountMsolRaw = BigInt(balance.value.amount)
    if (amountMsolRaw <= 0n)
      throw new Error("No mSOL received from Marinade deposit")

    // Step 4: Lock mSOL in token vault
    const lockSig = await createTokenVault(
      connection,
      creator,
      beneficiary,
      MSOL_MINT_MAINNET,
      amountMsolRaw,
      unlockTimestamp,
      signTransaction
    )
    return { depositSig: sig1, lockSig }
  } catch (e) {
    logTxError("createMsolVault", e)
    const userMsg = toUserMessage(e)
    throw userMsg ? new Error(userMsg) : e
  }
}

// ---------------------------------------------------------------------------
// Auto-save schedule (escrow + relayer execute) — needs upgraded kids-vault
// ---------------------------------------------------------------------------

function writePubkeyToBuffer(pubkey: PublicKey, buf: Uint8Array, offset: number) {
  const b = pubkey.toBytes()
  for (let i = 0; i < 32; i++) buf[offset + i] = b[i]!
}

/**
 * Create schedule + initial escrow. Requires an existing SOL vault for this child with matching unlock.
 */
export async function initAutoSaveSchedule(
  connection: Connection,
  parent: PublicKey,
  beneficiary: PublicKey,
  relayer: PublicKey,
  amountPerPeriodSol: number,
  periodSeconds: number,
  vaultUnlockTimestamp: number,
  escrowSol: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const amountLamports = BigInt(Math.floor(amountPerPeriodSol * 1e9))
  if (amountLamports <= BigInt(0))
    throw new Error("Amount per period must be greater than zero.")
  const escrowLamports = BigInt(Math.floor(escrowSol * 1e9))
  if (escrowLamports < BigInt(0)) throw new Error("Escrow cannot be negative.")

  const programId = getKidsVaultProgramId()
  const schedulePda = deriveAutoSaveSchedulePDA(parent, beneficiary)
  const vaultPda = deriveVaultPDA(parent, beneficiary)
  const disc = await instructionDiscriminator("init_auto_save_schedule")
  const buf = new ArrayBuffer(8 + 32 + 8 + 8 + 8 + 8)
  const data = new Uint8Array(buf)
  data.set(disc, 0)
  writePubkeyToBuffer(relayer, data, 8)
  const dv = new DataView(buf)
  dv.setBigUint64(40, amountLamports, true)
  dv.setBigInt64(48, BigInt(periodSeconds), true)
  dv.setBigInt64(56, BigInt(vaultUnlockTimestamp), true)
  dv.setBigUint64(64, escrowLamports, true)

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: schedulePda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: parent, isSigner: true, isWritable: true },
      { pubkey: beneficiary, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  })
  const tx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
    .add(ix)
  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed")
    tx.recentBlockhash = blockhash
    tx.feePayer = parent
    const signed = await signTransaction(tx)
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
    })
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    )
    return sig
  } catch (e) {
    logTxError("initAutoSaveSchedule", e)
    const userMsg = toUserMessage(e)
    throw userMsg ? new Error(userMsg) : e
  }
}

export async function fundAutoSaveSchedule(
  connection: Connection,
  parent: PublicKey,
  beneficiary: PublicKey,
  fundSol: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const lamports = BigInt(Math.floor(fundSol * 1e9))
  if (lamports <= BigInt(0)) throw new Error("Amount must be greater than zero.")
  const programId = getKidsVaultProgramId()
  const schedulePda = deriveAutoSaveSchedulePDA(parent, beneficiary)
  const disc = await instructionDiscriminator("fund_auto_save_schedule")
  const raw = new ArrayBuffer(16)
  const buf = new Uint8Array(raw)
  buf.set(disc, 0)
  new DataView(raw).setBigUint64(8, lamports, true)
  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: schedulePda, isSigner: false, isWritable: true },
      { pubkey: parent, isSigner: true, isWritable: true },
      { pubkey: beneficiary, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(buf),
  })
  const tx = new Transaction().add(ix)
  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed")
    tx.recentBlockhash = blockhash
    tx.feePayer = parent
    const signed = await signTransaction(tx)
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
    })
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    )
    return sig
  } catch (e) {
    logTxError("fundAutoSaveSchedule", e)
    const userMsg = toUserMessage(e)
    throw userMsg ? new Error(userMsg) : e
  }
}

export async function cancelAutoSaveSchedule(
  connection: Connection,
  parent: PublicKey,
  beneficiary: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const programId = getKidsVaultProgramId()
  const schedulePda = deriveAutoSaveSchedulePDA(parent, beneficiary)
  const disc = await instructionDiscriminator("cancel_auto_save_schedule")
  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: schedulePda, isSigner: false, isWritable: true },
      { pubkey: parent, isSigner: true, isWritable: true },
      { pubkey: beneficiary, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(disc),
  })
  const tx = new Transaction().add(ix)
  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed")
    tx.recentBlockhash = blockhash
    tx.feePayer = parent
    const signed = await signTransaction(tx)
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
    })
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    )
    return sig
  } catch (e) {
    logTxError("cancelAutoSaveSchedule", e)
    const userMsg = toUserMessage(e)
    throw userMsg ? new Error(userMsg) : e
  }
}

/** Build `execute_auto_save` for the Nest relayer (server-side). */
export async function buildExecuteAutoSaveInstruction(
  connection: Connection,
  schedulePda: PublicKey,
  vaultPda: PublicKey,
  relayer: PublicKey
): Promise<TransactionInstruction> {
  const protocol = await fetchProtocolFeesConfig(connection)
  if (!protocol) {
    throw new Error(
      "Protocol fee config missing — run init_protocol_fees on this cluster (Nest README)."
    )
  }
  const disc = await instructionDiscriminator("execute_auto_save")
  const protocolPda = deriveProtocolFeesPDA()
  return new TransactionInstruction({
    programId: getKidsVaultProgramId(),
    keys: [
      { pubkey: protocolPda, isSigner: false, isWritable: false },
      { pubkey: protocol.treasury, isSigner: false, isWritable: true },
      { pubkey: schedulePda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: relayer, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(disc),
  })
}
