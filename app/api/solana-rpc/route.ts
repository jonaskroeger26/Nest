import { NextResponse } from "next/server"
import { enforceApiRateLimit } from "@/lib/api-rate-limit"
import {
  getServerSolanaCluster,
  getServerSolanaRpcUrl,
} from "@/lib/server-solana-env"

export const dynamic = "force-dynamic"
/** Rate limiting uses Upstash; Node runtime sees `UPSTASH_*` on Vercel reliably. */
export const runtime = "nodejs"

/**
 * Browser-safe RPC URL (reads server env). Used by `getConnection()` in
 * `lib/solana-vault.ts` so Helius / private keys stay off the client bundle.
 */
export async function GET(req: Request) {
  const limited = await enforceApiRateLimit(req, "rpc")
  if (!limited.ok) return limited.response

  const cluster = getServerSolanaCluster()

  // Public mainnet RPC often returns 403 from browsers; require an explicit URL.
  if (cluster === "mainnet-beta") {
    const explicit =
      process.env.SOLANA_RPC_MAINNET?.trim() ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET?.trim()
    if (!explicit) {
      return NextResponse.json(
        {
          error:
            "RPC not configured. For mainnet add SOLANA_RPC_MAINNET (Helius) to .env.local.",
        },
        { status: 503 }
      )
    }
  }

  const url = getServerSolanaRpcUrl()
  return NextResponse.json({ url }, { headers: limited.headers })
}
