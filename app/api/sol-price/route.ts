import { NextResponse } from "next/server"

/** Cached SOL/USD for dashboard — CoinGecko public API */
export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    )
    if (!res.ok) {
      return NextResponse.json(
        { error: "Price unavailable", usd: null },
        { status: 502 }
      )
    }
    const data = (await res.json()) as { solana?: { usd?: number } }
    const usd = data.solana?.usd
    if (typeof usd !== "number" || !Number.isFinite(usd)) {
      return NextResponse.json({ usd: null })
    }
    return NextResponse.json(
      { usd, updatedAt: Date.now() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    )
  } catch {
    return NextResponse.json({ usd: null }, { status: 502 })
  }
}
