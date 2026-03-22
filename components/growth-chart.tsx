"use client"

import { useId, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useChildren } from "@/context/children-context"
import type { Child } from "@/context/children-context"
import { useSolPrice, solToUsdFormatted } from "@/hooks/use-sol-price"
import {
  usePortfolioHistory,
  formatPctChange,
  getPortfolioViewport,
  type PortfolioRange,
  type PortfolioSnapshot,
} from "@/hooks/use-portfolio-history"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

/** Mint palette — stats / list rows */
const mint = {
  pill: "bg-[#E8F4EC] dark:bg-emerald-950/35",
  statGreen: "text-[#2D6A4F] dark:text-emerald-300",
  avatar: "bg-[#D4ECD9] text-[#2D6A4F] dark:bg-emerald-900/50 dark:text-emerald-200",
} as const

const RANGE_TABS: { id: PortfolioRange; label: string }[] = [
  { id: "1d", label: "24H" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "all", label: "All" },
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  }
  return name.slice(0, 1).toUpperCase() || "?"
}

function goalSubtitle(c: Child): string {
  const goals = c.goals
  if (!goals?.length) return "Add a goal"
  const g = goals.find((x) => x.locked) ?? goals[0]
  if (!g) return "Add a goal"
  const y =
    typeof g.unlockDate === "string"
      ? (g.unlockDate.match(/\d{4}/)?.[0] ??
        (g.unlockDate.length >= 4 ? g.unlockDate.slice(-4) : ""))
      : ""
  const short = g.name.replace(/\s+fund$/i, "").trim()
  if (y) return `${short} ${y}`
  return short || "Goal"
}

/**
 * Label X-axis from actual data span (not the range button). If everything
 * landed on one calendar day, still show clock time so ticks aren’t all “Mar 22”.
 */
function formatAxisTick(ts: number, minT: number, maxT: number) {
  const span = Math.max(0, maxT - minT)
  const d = new Date(ts)
  const startDay = new Date(minT).toDateString()
  const endDay = new Date(maxT).toDateString()
  const sameCalendarDay = startDay === endDay

  const withDateAndTime: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }
  const timeOnly: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  }

  if (span <= 0) {
    return d.toLocaleString(undefined, withDateAndTime)
  }

  // Intraday or all samples same day → always show time (and date if multi-day span is tiny)
  if (span <= 48 * 60 * 60 * 1000 || sameCalendarDay) {
    if (sameCalendarDay && span <= 48 * 60 * 60 * 1000) {
      return d.toLocaleTimeString(undefined, timeOnly)
    }
    return d.toLocaleString(undefined, withDateAndTime)
  }

  if (span <= 14 * 24 * 60 * 60 * 1000) {
    return d.toLocaleString(undefined, {
      weekday: "short",
      ...withDateAndTime,
    })
  }

  if (span <= 180 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  }

  return d.toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  })
}

/** Ticks across the full selected range (not just where data exists). */
function buildXTicksFromDomain(minT: number, maxT: number, count = 6): number[] {
  if (maxT <= minT) return [minT]
  const n = Math.max(2, count)
  return Array.from({ length: n }, (_, i) => minT + ((maxT - minT) * i) / (n - 1))
}

function snapshotAtOrBefore(
  history: PortfolioSnapshot[],
  tMax: number
): PortfolioSnapshot | null {
  let best: PortfolioSnapshot | null = null
  for (const p of history) {
    if (p.t <= tMax && (!best || p.t > best.t)) best = p
  }
  return best
}

function formatTooltipUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 10_000) return `$${(n / 1_000).toFixed(2)}k`
  if (n >= 1000) return `$${n.toFixed(0)}`
  return `$${n.toFixed(2)}`
}

export function GrowthChart({
  childrenOverride,
}: {
  childrenOverride?: Child[]
}) {
  const { children: ctxChildren } = useChildren()
  const children = childrenOverride ?? ctxChildren
  const { usdPerSol } = useSolPrice()
  const usd = usdPerSol ?? null

  const [range, setRange] = useState<PortfolioRange>("7d")

  const totalSol = useMemo(
    () => children.reduce((sum, c) => sum + c.totalSaved, 0),
    [children]
  )

  const {
    hydrated,
    history,
    currentUsd,
    pctChangeInRange,
    stats,
  } = usePortfolioHistory(totalSol, usd)

  const chartUid = useId().replace(/:/g, "")
  const rangeChange = pctChangeInRange(range)
  const up = rangeChange != null && rangeChange >= 0
  const stroke = up ? "#16a34a" : "#dc2626"
  const fillId = `nest-port-${chartUid}-${up ? "u" : "d"}`

  /** Points in view + anchors so the X-axis always matches the selected range. */
  const { chartData, viewStart, viewEnd } = useMemo(() => {
    const now = Date.now()
    const { start: windowStart, end: windowEnd } = getPortfolioViewport(
      range,
      history,
      now
    )

    if (!hydrated || currentUsd == null) {
      return {
        chartData: [] as { t: number; usd: number; sol: number }[],
        viewStart: windowStart,
        viewEnd: windowEnd,
      }
    }

    const inView = history.filter(
      (s) => s.t >= windowStart && s.t <= windowEnd
    )
    const mapped = inView.map((s) => ({
      t: s.t,
      usd: s.usd,
      sol: s.sol,
    }))

    // No samples in this window: flat line across full viewport
    if (mapped.length === 0) {
      return {
        chartData: [
          { t: windowStart, usd: currentUsd, sol: totalSol },
          { t: windowEnd, usd: currentUsd, sol: totalSol },
        ],
        viewStart: windowStart,
        viewEnd: windowEnd,
      }
    }

    const atLeft = snapshotAtOrBefore(history, windowStart)
    const anchorUsd = atLeft?.usd ?? mapped[0]!.usd
    const anchorSol = atLeft?.sol ?? mapped[0]!.sol

    const series: { t: number; usd: number; sol: number }[] = []

    // Lead-in from viewport left edge (CMC-style) when first sample is after window start
    if (mapped[0]!.t > windowStart + 60_000) {
      series.push({ t: windowStart, usd: anchorUsd, sol: anchorSol })
    }

    for (const p of mapped) {
      const prev = series[series.length - 1]
      if (prev && prev.t === p.t) continue
      series.push(p)
    }

    const last = series[series.length - 1]!
    // Extend to “now” on the right edge of the viewport (live portfolio value).
    if (last.t < windowEnd - 1000) {
      series.push({
        t: windowEnd,
        usd: currentUsd,
        sol: totalSol,
      })
    }

    return {
      chartData: series,
      viewStart: windowStart,
      viewEnd: windowEnd,
    }
  }, [range, history, hydrated, currentUsd, totalSol])

  const chartAxis = useMemo(() => {
    const minT = viewStart
    const maxT = viewEnd
    if (maxT <= minT) {
      return {
        minT,
        maxT,
        ticks: [minT] as number[],
        formatTick: (v: number) => formatAxisTick(v, minT, maxT),
      }
    }
    return {
      minT,
      maxT,
      ticks: buildXTicksFromDomain(minT, maxT),
      formatTick: (v: number) => formatAxisTick(v, minT, maxT),
    }
  }, [viewStart, viewEnd])

  if (children.length === 0) {
    return (
      <Card className="overflow-hidden rounded-2xl border border-[#D4ECD9]/80 bg-card shadow-sm dark:border-emerald-900/40">
        <CardContent className="p-6">
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-[#B8DCC4] bg-[#E8F4EC]/60 px-6 py-10 dark:border-emerald-800/50 dark:bg-emerald-950/20">
            <p className="max-w-[280px] text-center text-sm leading-relaxed text-muted-foreground">
              Add children and lock SOL to track portfolio value like an
              exchange chart.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden rounded-2xl border border-[#D4ECD9]/80 bg-card shadow-sm dark:border-emerald-900/40">
      <CardContent className="space-y-6 p-6">
        {/* Hero — USD value + range change (CMC / Binance style) */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Portfolio value
            </p>
            {currentUsd != null ? (
              <>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
                  {formatTooltipUsd(currentUsd)}
                </p>
                <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                  {totalSol.toFixed(4)} SOL
                  {usd != null ? (
                    <span className="ml-2">
                      · {solToUsdFormatted(1, usd)} / SOL
                    </span>
                  ) : null}
                </p>
              </>
            ) : (
              <p className="mt-1 text-lg text-muted-foreground">
                Loading price…
              </p>
            )}
          </div>
          {rangeChange != null ? (
            <div
              className={
                "rounded-xl px-4 py-2 text-right tabular-nums " +
                (up
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-700 dark:text-red-400")
              }
            >
              <p className="text-xs font-medium text-muted-foreground">
                {range === "1d"
                  ? "24h"
                  : range === "7d"
                    ? "7d"
                    : range === "30d"
                      ? "30d"
                      : "All time"}
              </p>
              <p className="text-xl font-semibold">
                {formatPctChange(rangeChange)}
              </p>
            </div>
          ) : null}
        </div>

        {/* Range tabs */}
        <div className="flex flex-wrap gap-2">
          {RANGE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRange(tab.id)}
              className={
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors " +
                (range === tab.id
                  ? "bg-foreground text-background"
                  : "bg-muted/80 text-muted-foreground hover:bg-muted")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-border/60 bg-muted/10 p-2 sm:p-4 dark:bg-muted/5">
          <div className="h-[220px] w-full min-h-[200px]">
            {hydrated && chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={stroke}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor={stroke}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    className="stroke-border/50"
                  />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={[chartAxis.minT, chartAxis.maxT]}
                    ticks={chartAxis.ticks}
                    tickFormatter={(ts) => chartAxis.formatTick(ts as number)}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    padding={{ left: 4, right: 4 }}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => formatTooltipUsd(Number(v))}
                    width={56}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const row = payload[0].payload as {
                        t: number
                        usd: number
                        sol: number
                      }
                      return (
                        <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
                          <p className="text-xs text-muted-foreground">
                            {new Date(row.t).toLocaleString()}
                          </p>
                          <p className="font-semibold tabular-nums">
                            {formatTooltipUsd(row.usd)}
                          </p>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {row.sol.toFixed(4)} SOL
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="usd"
                    stroke={stroke}
                    strokeWidth={2}
                    fill={`url(#${fillId})`}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Preparing chart…
              </div>
            )}
          </div>
          <p className="mt-2 px-1 text-center text-[11px] leading-snug text-muted-foreground">
            Value = locked SOL × live SOL price. History is saved on this device
            so the line moves when price or balances change.
          </p>
        </div>

        {/* Summary pills */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            className={`rounded-xl px-4 py-3 ${mint.pill} ring-1 ring-[#C5E3D1]/60 dark:ring-emerald-800/40`}
          >
            <p className="text-xs font-medium text-muted-foreground">
              Total locked
            </p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${mint.statGreen}`}
            >
              {totalSol.toFixed(1)}{" "}
              <span className="text-lg font-semibold">SOL</span>
            </p>
            {usd != null && totalSol > 0 ? (
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {solToUsdFormatted(totalSol, usd)}
              </p>
            ) : null}
          </div>
          <div
            className={`rounded-xl px-4 py-3 ${mint.pill} ring-1 ring-[#C5E3D1]/60 dark:ring-emerald-800/40`}
          >
            <p className="text-xs font-medium text-muted-foreground">
              Children
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {children.length}
            </p>
          </div>
          <div
            className={`rounded-xl px-4 py-3 ${mint.pill} ring-1 ring-[#C5E3D1]/60 dark:ring-emerald-800/40`}
          >
            <p className="text-xs font-medium text-muted-foreground">
              24h change
            </p>
            <p
              className={
                "mt-1 text-2xl font-bold tabular-nums " +
                (stats.change1d == null
                  ? "text-muted-foreground"
                  : stats.change1d >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400")
              }
            >
              {formatPctChange(stats.change1d)}
            </p>
          </div>
        </div>

        {/* Child rows */}
        <ul className="divide-y divide-border/60">
          {children.map((c, i) => (
            <li
              key={`${c.name}-${i}`}
              className="flex items-center gap-3 py-3 first:pt-0"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${mint.avatar}`}
                aria-hidden
              >
                {initials(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">
                  {c.name}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {goalSubtitle(c)}
                </p>
              </div>
              <p className="shrink-0 text-base font-semibold tabular-nums text-foreground">
                {c.totalSaved.toFixed(1)} SOL
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
