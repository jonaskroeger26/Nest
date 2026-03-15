import { NextResponse } from "next/server"

const MARINADE_APY_URL = "https://api.marinade.finance/msol/apy/30d"

export async function GET() {
  try {
    const res = await fetch(MARINADE_APY_URL, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error("Marinade APY fetch failed")
    const data = (await res.json()) as { value?: number }
    const raw = data?.value
    const apyPercent = raw != null ? Number((raw * 100).toFixed(2)) : null
    return NextResponse.json({ apy: apyPercent })
  } catch (err) {
    console.error("marinade-apy", err)
    return NextResponse.json({ apy: null }, { status: 200 })
  }
}
