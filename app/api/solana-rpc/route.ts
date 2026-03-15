import { NextResponse } from "next/server"

const PUBLIC_RPC = "https://api.mainnet-beta.solana.com"

export async function GET() {
  const url =
    process.env.SOLANA_RPC_MAINNET ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ??
    PUBLIC_RPC
  if (process.env.NODE_ENV === "development") {
    console.log("[solana-rpc] Using custom RPC:", url.includes("helius") ? "Helius" : url === PUBLIC_RPC ? "public (will 403)" : "other")
  }
  if (url === PUBLIC_RPC || url.includes("api.mainnet-beta.solana.com")) {
    return NextResponse.json(
      {
        error:
          "Add SOLANA_RPC_MAINNET to .env.local (e.g. Helius URL). Public RPC returns 403.",
      },
      { status: 503 }
    )
  }
  return NextResponse.json({ url })
}
