import { getSolanaCluster } from "@/lib/solana-config"

/** Solscan transaction URL for current cluster. */
export function solanaTxUrl(signature: string): string {
  const c = getSolanaCluster()
  const cluster =
    c === "mainnet-beta" ? "" : c === "testnet" ? "?cluster=testnet" : "?cluster=devnet"
  return `https://solscan.io/tx/${signature}${cluster}`
}

/** Solscan account URL for current cluster. */
export function solanaAccountUrl(address: string): string {
  const c = getSolanaCluster()
  const cluster =
    c === "mainnet-beta" ? "" : c === "testnet" ? "?cluster=testnet" : "?cluster=devnet"
  return `https://solscan.io/account/${address}${cluster}`
}
