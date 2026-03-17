import { NextResponse } from "next/server"

const PUBLIC_MAINNET = "https://api.mainnet-beta.solana.com"

function clusterFromEnv(): "mainnet-beta" | "testnet" | "devnet" {
  const c = (
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "mainnet-beta"
  ).toLowerCase()
  if (c === "testnet") return "testnet"
  if (c === "devnet") return "devnet"
  return "mainnet-beta"
}

export async function GET() {
  const cluster = clusterFromEnv()

  if (cluster === "testnet") {
    const url =
      process.env.SOLANA_RPC_TESTNET ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_TESTNET ??
      "https://api.testnet.solana.com"
    return NextResponse.json({ url, cluster })
  }

  if (cluster === "devnet") {
    const url =
      process.env.SOLANA_RPC_DEVNET ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ??
      "https://api.devnet.solana.com"
    return NextResponse.json({ url, cluster })
  }

  const url =
    process.env.SOLANA_RPC_MAINNET ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ??
    PUBLIC_MAINNET
  if (process.env.NODE_ENV === "development") {
    console.log(
      "[solana-rpc] mainnet:",
      url.includes("helius") ? "Helius" : url === PUBLIC_MAINNET ? "public" : "custom"
    )
  }
  if (url === PUBLIC_MAINNET || url.includes("api.mainnet-beta.solana.com")) {
    return NextResponse.json(
      {
        error:
          "Add SOLANA_RPC_MAINNET to .env.local (e.g. Helius). Public mainnet RPC often returns 403.",
      },
      { status: 503 }
    )
  }
  return NextResponse.json({ url, cluster: "mainnet-beta" as const })
}
