import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js"
import { getKidsVaultProgramId } from "@/lib/solana-config"

const VAULT_SEED = "vault"
const TOKEN_VAULT_SEED = "token_vault"

// Anchor account sizes:
// SOL vault:   8 (disc) + 32 (creator) + 32 (beneficiary) + 8 (unlock_ts) + 1 (bump) = 81
// Token vault: 8 (disc) + 32 (creator) + 32 (beneficiary) + 32 (mint) + 8 (unlock_ts) + 1 (bump) = 113
const VAULT_DATA_SIZE = 81
const TOKEN_VAULT_DATA_SIZE = 113

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

export function deriveATA(owner: PublicKey, mint: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
  return ata
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
  if (/program that does not exist/i.test(msg))
    return "Vault program not deployed on this network. Deploy kids-vault (see fatherhood README)."
  if (/0x65|InstructionFallbackNotFound|Fallback functions are not supported/i.test(msg))
    return "Program version mismatch. Redeploy kids-vault (see README)."
  if (/may not be used for executing instructions/i.test(msg))
    return "Program not executable here. Deploy kids-vault to the cluster your app uses."
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
  const vaultPDA = deriveVaultPDA(creator, beneficiary)
  const disc = await instructionDiscriminator("create_vault")
  const data = new ArrayBuffer(8 + 8 + 8)
  const view = new DataView(data)
  for (let i = 0; i < 8; i++) view.setUint8(i, disc[i])
  view.setBigUint64(8, BigInt(amountLamports), true)
  view.setBigInt64(16, BigInt(unlockTimestamp), true)
  const ix = new TransactionInstruction({
    programId: getKidsVaultProgramId(),
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: beneficiary, isSigner: false, isWritable: false },
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
  const vaultPDA = deriveVaultPDA(creator, beneficiary)
  const disc = await instructionDiscriminator("withdraw")
  const data = Buffer.alloc(8)
  for (let i = 0; i < 8; i++) data[i] = disc[i]
  const ix = new TransactionInstruction({
    programId: getKidsVaultProgramId(),
    keys: [
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
): Promise<string> {
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
    return createTokenVault(
      connection,
      creator,
      beneficiary,
      MSOL_MINT_MAINNET,
      amountMsolRaw,
      unlockTimestamp,
      signTransaction
    )
  } catch (e) {
    logTxError("createMsolVault", e)
    const userMsg = toUserMessage(e)
    throw userMsg ? new Error(userMsg) : e
  }
}
