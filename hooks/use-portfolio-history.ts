"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type PortfolioSnapshot = { t: number; usd: number; sol: number }

const STORAGE_KEY = "nest_portfolio_value_history_v1"
const MAX_POINTS = 2500
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000
/** Minimum gap between samples unless SOL balance or % move triggers sooner */
const MIN_GAP_MS = 60_000
/** Record when USD value moves at least this % vs last sample */
const USD_MOVE_THRESHOLD_PCT = 0.025
/** Background sample interval (price can move without React re-fetch) */
const TICK_MS = 120_000

function safeLoad(): PortfolioSnapshot[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    return parsed
      .filter(
        (s): s is PortfolioSnapshot =>
          s != null &&
          typeof s === "object" &&
          typeof (s as PortfolioSnapshot).t === "number" &&
          typeof (s as PortfolioSnapshot).usd === "number" &&
          typeof (s as PortfolioSnapshot).sol === "number"
      )
      .filter((s) => now - s.t < MAX_AGE_MS)
      .sort((a, b) => a.t - b.t)
      .slice(-MAX_POINTS)
  } catch {
    return []
  }
}

function safeSave(h: PortfolioSnapshot[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(-MAX_POINTS)))
  } catch {
    /* quota / private mode */
  }
}

function trimAge(points: PortfolioSnapshot[], now: number) {
  return points.filter((s) => now - s.t < MAX_AGE_MS).slice(-MAX_POINTS)
}

export type PortfolioRange = "1d" | "7d" | "30d" | "all"

/** Exported for charts so X-axis matches the selected range (Binance-style viewport). */
export const PORTFOLIO_RANGE_MS: Record<PortfolioRange, number> = {
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  all: MAX_AGE_MS,
}

export { MAX_AGE_MS as PORTFOLIO_MAX_HISTORY_MS }

const RANGE_MS = PORTFOLIO_RANGE_MS

/** Visible time window: fixed length for 1D/7D/30D; “all” = first snapshot → now. */
export function getPortfolioViewport(
  range: PortfolioRange,
  history: PortfolioSnapshot[],
  now: number
): { start: number; end: number } {
  const end = now
  if (range === "all") {
    if (history.length === 0) {
      return { start: now - RANGE_MS["1d"], end }
    }
    return { start: history[0]!.t, end }
  }
  return { start: now - RANGE_MS[range], end }
}

/**
 * Persists portfolio USD value (locked SOL × SOL price) over time in localStorage.
 * Moves up/down with price and when locked balances change — similar spirit to CMC/Binance charts.
 */
export function usePortfolioHistory(totalSol: number, usdPerSol: number | null) {
  const [history, setHistory] = useState<PortfolioSnapshot[]>([])
  const [hydrated, setHydrated] = useState(false)
  const lastWritten = useRef<PortfolioSnapshot | null>(null)

  const totalSolRef = useRef(totalSol)
  const usdPerSolRef = useRef(usdPerSol)
  totalSolRef.current = totalSol
  usdPerSolRef.current = usdPerSol

  useEffect(() => {
    const loaded = safeLoad()
    setHistory(loaded)
    lastWritten.current = loaded[loaded.length - 1] ?? null
    setHydrated(true)
  }, [])

  const tryRecord = useCallback(
    (reason: "deps" | "tick") => {
      const p = usdPerSolRef.current
      if (!hydrated || p == null) return
      const sol = totalSolRef.current
      const usd = sol * p
      const now = Date.now()
      const last = lastWritten.current

      const solChanged =
        last == null || Math.abs(last.sol - sol) > 1e-9
      const elapsed = last == null ? Infinity : now - last.t
      const usdMovePct =
        last != null && last.usd > 0
          ? (Math.abs(usd - last.usd) / last.usd) * 100
          : 100
      const priceMovedEnough = usdMovePct >= USD_MOVE_THRESHOLD_PCT
      const gapOk = elapsed >= MIN_GAP_MS

      const shouldWrite =
        last == null ||
        solChanged ||
        (gapOk && priceMovedEnough) ||
        (reason === "tick" && gapOk)

      if (!shouldWrite) return

      const snap: PortfolioSnapshot = { t: now, usd, sol }
      setHistory((prev) => {
        const next = trimAge([...prev, snap], now)
        safeSave(next)
        return next
      })
      lastWritten.current = snap
    },
    [hydrated]
  )

  useEffect(() => {
    tryRecord("deps")
  }, [hydrated, totalSol, usdPerSol, tryRecord])

  useEffect(() => {
    if (!hydrated) return
    const id = window.setInterval(() => tryRecord("tick"), TICK_MS)
    return () => window.clearInterval(id)
  }, [hydrated, tryRecord])

  const currentUsd =
    usdPerSol != null ? totalSol * usdPerSol : null

  const filterByRange = useCallback(
    (range: PortfolioRange) => {
      const now = Date.now()
      const ms = RANGE_MS[range]
      const cutoff = range === "all" ? 0 : now - ms
      return history.filter((s) => s.t >= cutoff)
    },
    [history]
  )

  /** Latest snapshot at or before `tMax` (for “value 24h ago” style baselines). */
  const snapshotAtOrBefore = useCallback((tMax: number) => {
    let best: PortfolioSnapshot | null = null
    for (const p of history) {
      if (p.t <= tMax && (!best || p.t > best.t)) best = p
    }
    return best
  }, [history])

  /**
   * % change vs baseline: for 1D/7D/30D compares current USD to last sample at/before
   * window start (Binance-style). Falls back to first stored point if none older.
   */
  const pctChangeInRange = useCallback(
    (range: PortfolioRange): number | null => {
      if (currentUsd == null || history.length === 0) return null
      const now = Date.now()
      if (range === "all") {
        const first = history[0]!
        if (first.usd <= 0) return null
        return ((currentUsd - first.usd) / first.usd) * 100
      }
      const windowMs = RANGE_MS[range]
      const past =
        snapshotAtOrBefore(now - windowMs) ?? history[0]!
      if (past.usd <= 0) return null
      return ((currentUsd - past.usd) / past.usd) * 100
    },
    [history, currentUsd, snapshotAtOrBefore]
  )

  const stats = useMemo(() => {
    return {
      change1d: pctChangeInRange("1d"),
      change7d: pctChangeInRange("7d"),
      change30d: pctChangeInRange("30d"),
      changeAll: pctChangeInRange("all"),
    }
  }, [pctChangeInRange])

  return {
    hydrated,
    history,
    currentUsd,
    filterByRange,
    pctChangeInRange,
    stats,
  }
}

export function formatPctChange(pct: number | null, digits = 2): string {
  if (pct == null || Number.isNaN(pct)) return "—"
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct.toFixed(digits)}%`
}
