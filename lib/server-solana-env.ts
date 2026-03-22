/** Server-only RPC URL (matches `/api/solana-rpc` cluster selection). */

export function getServerSolanaCluster(): "mainnet-beta" | "testnet" | "devnet" {
  const c = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "testnet").toLowerCase()
  if (c === "testnet") return "testnet"
  if (c === "devnet") return "devnet"
  return "mainnet-beta"
}

export function getServerSolanaRpcUrl(): string {
  const cluster = getServerSolanaCluster()
  if (cluster === "testnet") {
    return (
      process.env.SOLANA_RPC_TESTNET ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_TESTNET ??
      "https://api.testnet.solana.com"
    )
  }
  if (cluster === "devnet") {
    return (
      process.env.SOLANA_RPC_DEVNET ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ??
      "https://api.devnet.solana.com"
    )
  }
  return (
    process.env.SOLANA_RPC_MAINNET ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ??
    "https://api.mainnet-beta.solana.com"
  )
}
