import { PublicKey } from "@solana/web3.js"

export type SolanaCluster = "mainnet-beta" | "testnet" | "devnet"

/**
 * Cluster for Nest vaults + RPC.
 * Defaults to testnet so the default program ID (3be5xt…) matches a typical deploy.
 * Production: set NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta + mainnet program ID.
 */
export function getSolanaCluster(): SolanaCluster {
  const c = (
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "testnet"
  ).toLowerCase()
  if (c === "testnet") return "testnet"
  if (c === "devnet") return "devnet"
  return "mainnet-beta"
}

export function isMainnetVaults(): boolean {
  return getSolanaCluster() === "mainnet-beta"
}

/** Kids-vault program ID (must match Anchor declare_id after deploy). */
export function getKidsVaultProgramId(): PublicKey {
  const fromEnv = process.env.NEXT_PUBLIC_KIDS_VAULT_PROGRAM_ID?.trim()
  if (fromEnv) return new PublicKey(fromEnv)
  return new PublicKey(
    "3be5xtB1AUiCxQ3dPn8bEt95VrzzEEW2cJym2wXo4rnN"
  )
}
