import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js"

const KIDS_VAULT_PROGRAM_ID = new PublicKey(
  "56SHmZiWXW6NhgCQXSoRUct4mub9aAoCYCTXMgqRUrLW"
)
const VAULT_SEED = "vault"
const TOKEN_VAULT_SEED = "token_vault"
const DEVNET_RPC = "https://api.devnet.solana.com"
const MAINNET_RPC = "https://api.mainnet-beta.solana.com"
const VAULT_DATA_SIZE = 8 + 32 + 32 + 8 + 1 // 81
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
/** Marinade mSOL mint (mainnet) */
export const MSOL_MINT_MAINNET = new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So")
const MSOL_DECIMALS = 9

export interface VaultInfo {
  vaultPda: string
  creator: string
  beneficiary: string
  unlockTimestamp: number
  balanceLamports: number
  balanceSol: number
}

async function instructionDiscriminator(name: string): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode("global:" + name)
  )
  return new Uint8Array(hash).slice(0, 8)
}

export function deriveVaultPDA(
  creator: PublicKey,
  beneficiary: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(VAULT_SEED, "utf8"),
      creator.toBuffer(),
      beneficiary.toBuffer(),
    ],
    KIDS_VAULT_PROGRAM_ID
  )
  return pda
}

function deriveTokenVaultPDA(
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
    KIDS_VAULT_PROGRAM_ID
  )
  return pda
}

function getAssociatedTokenAddress(owner: PublicKey, mint: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
  return ata
}

/** Fetch all SOL vaults where the given pubkey is the beneficiary */
export async function getVaultsByBeneficiary(
  connection: Connection,
  beneficiary: PublicKey
): Promise<VaultInfo[]> {
  const accounts = await connection.getProgramAccounts(
    KIDS_VAULT_PROGRAM_ID,
    {
      filters: [
        { dataSize: VAULT_DATA_SIZE },
        { memcmp: { offset: 8 + 32, bytes: beneficiary.toBase58() } },
      ],
    }
  )
  const out: VaultInfo[] = []
  for (const { pubkey, account } of accounts) {
    const data = account.data
    if (data.length < VAULT_DATA_SIZE) continue
    const creator = new PublicKey(data.slice(8, 40))
    const beneficiaryPubkey = new PublicKey(data.slice(40, 72))
    const dv = new DataView(data.buffer, data.byteOffset, data.length)
    const unlockTimestamp = Number(dv.getBigInt64(72, true))
    const balanceLamports = account.lamports
    out.push({
      vaultPda: pubkey.toBase58(),
      creator: creator.toBase58(),
      beneficiary: beneficiaryPubkey.toBase58(),
      unlockTimestamp,
      balanceLamports,
      balanceSol: balanceLamports / 1e9,
    })
  }
  return out
}

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
    programId: KIDS_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: beneficiary, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  })
  const tx = new Transaction().add(ix)
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
}

/** Withdraw SOL from vault. Only beneficiary can call, and only after unlock_timestamp. */
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
    programId: KIDS_VAULT_PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: beneficiary, isSigner: true, isWritable: true },
    ],
    data,
  })
  const tx = new Transaction().add(ix)
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
}

export function getConnection(useMainnet = false): Connection {
  return new Connection(useMainnet ? MAINNET_RPC : DEVNET_RPC, "confirmed")
}

/** Create a token vault (e.g. mSOL). Caller must have the tokens in their ATA. */
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
  const vaultAta = getAssociatedTokenAddress(tokenVaultPDA, mint)
  const creatorAta = getAssociatedTokenAddress(creator, mint)
  const disc = await instructionDiscriminator("create_token_vault")
  const data = new ArrayBuffer(8 + 8 + 8)
  const view = new DataView(data)
  for (let i = 0; i < 8; i++) view.setUint8(i, disc[i])
  view.setBigUint64(8, amountTokenUnits, true)
  view.setBigInt64(16, BigInt(unlockTimestamp), true)
  const ix = new TransactionInstruction({
    programId: KIDS_VAULT_PROGRAM_ID,
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
}

/** Deposit SOL to Marinade for mSOL, then lock mSOL in a token vault. Uses mainnet. Builds deposit tx via API to avoid bundling Node-only Marinade/Anchor code in the client. */
export async function createMsolVault(
  connection: Connection,
  creator: PublicKey,
  beneficiary: PublicKey,
  amountSol: number,
  unlockTimestamp: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const res = await fetch("/api/build-marinade-deposit-tx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amountSol,
      creator: creator.toBase58(),
    }),
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
  const binary = atob(transactionBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const depositTx = Transaction.from(bytes)
  const signedDeposit = await signTransaction(depositTx)
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed")
  const sig1 = await connection.sendRawTransaction(signedDeposit.serialize(), {
    skipPreflight: false,
  })
  await connection.confirmTransaction(
    { signature: sig1, blockhash, lastValidBlockHeight },
    "confirmed"
  )
  const balance = await connection.getTokenAccountBalance(
    new PublicKey(associatedMSolTokenAccountAddress)
  )
  const amountMsolRaw = BigInt(balance.value.amount)
  if (amountMsolRaw <= 0n) throw new Error("No mSOL received from deposit")
  return createTokenVault(
    connection,
    creator,
    beneficiary,
    MSOL_MINT_MAINNET,
    amountMsolRaw,
    unlockTimestamp,
    signTransaction
  )
}
