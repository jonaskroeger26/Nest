"use client"

import { useState, useEffect } from "react"

export function useMarinadeApy(): number | null {
  const [apy, setApy] = useState<number | null>(null)
  useEffect(() => {
    fetch("/api/marinade-apy")
      .then((r) => r.json())
      .then((d: { apy?: number | null }) => setApy(d?.apy ?? null))
      .catch(() => setApy(null))
  }, [])
  return apy
}
