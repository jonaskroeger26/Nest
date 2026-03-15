import { NextResponse } from "next/server"

export async function GET() {
  const url =
    process.env.SOLANA_RPC_MAINNET ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ??
    "https://api.mainnet-beta.solana.com"
  return NextResponse.json({ url })
}
