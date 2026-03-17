"use client"

import { useCallback, useEffect, useState } from "react"

const REFRESH_MS = 60_000

export function useSolPrice() {
  const [usd, setUsd] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch("/api/sol-price")
      const data = (await res.json()) as { usd?: number | null }
      if (typeof data.usd === "number" && Number.isFinite(data.usd)) {
        setUsd(data.usd)
      } else {
        setUsd(null)
      }
    } catch {
      setUsd(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrice()
    const id = setInterval(fetchPrice, REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchPrice])

  return { usdPerSol: usd, loading }
}

export function solToUsdFormatted(sol: number, usdPerSol: number | null): string {
  if (usdPerSol == null || sol <= 0) return ""
  const usd = sol * usdPerSol
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: usd >= 100 ? 0 : 2,
    maximumFractionDigits: usd >= 100 ? 0 : 2,
  }).format(usd)
}
