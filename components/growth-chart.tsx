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
import { format } from "date-fns"
import { TrendingDown, TrendingUp } from "lucide-react"
import { parseGoalUnlockDate } from "@/lib/goal-dates"
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
  const short = g.name.replace(/\s+fund$/i, "").trim()
  const d = parseGoalUnlockDate(g.unlockDate)
  if (d) return `${short} ${format(d, "yyyy")}`
  const y =
    typeof g.unlockDate === "string"
      ? (g.unlockDate.match(/\d{4}/)?.[0] ??
        (g.unlockDate.length >= 4 ? g.unlockDate.slice(-4) : ""))
      : ""
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

/** Tight axis labels (CMC-style compact). */
function formatAxisUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

/** Hero number — full currency formatting like major price sites. */
function formatHeroUsd(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: n >= 10_000 ? 0 : 2,
  }).format(n)
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

  /** Period high / low in view (CoinMarketCap-style context). */
  const rangeHighLow = useMemo(() => {
    if (chartData.length === 0) return null
    let lo = chartData[0]!.usd
    let hi = lo
    for (const d of chartData) {
      if (d.usd < lo) lo = d.usd
      if (d.usd > hi) hi = d.usd
    }
    if (hi <= 0 && lo <= 0) return null
    return { lo, hi }
  }, [chartData])

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

  const rangeLabel =
    range === "1d"
      ? "24H"
      : range === "7d"
        ? "7D"
        : range === "30d"
          ? "30D"
          : "ALL"

  return (
    <Card className="overflow-hidden rounded-2xl border border-[#D4ECD9]/80 bg-card shadow-sm dark:border-emerald-900/40">
      <CardContent className="space-y-5 p-5 sm:p-6">
        {/* Hero — CMC-style: pair label, huge price, change chip */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Portfolio · USD
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-40" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
            {currentUsd != null ? (
              <>
                <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-foreground sm:text-5xl">
                  {formatHeroUsd(currentUsd)}
                </p>
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                  ≈ {totalSol.toFixed(4)} SOL locked
                  {usd != null ? (
                    <span className="text-muted-foreground/80">
                      {" "}
                      · {solToUsdFormatted(1, usd)} / SOL
                    </span>
                  ) : null}
                </p>
              </>
            ) : (
              <p className="mt-2 text-lg text-muted-foreground">
                Loading price…
              </p>
            )}
          </div>
          {rangeChange != null ? (
            <div
              className={
                "flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 tabular-nums shadow-sm " +
                (up
                  ? "border-emerald-500/25 bg-emerald-500/[0.07] dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "border-red-500/25 bg-red-500/[0.07] dark:border-red-500/20 dark:bg-red-500/10")
              }
            >
              <div
                className={
                  "flex h-10 w-10 items-center justify-center rounded-xl " +
                  (up ? "bg-emerald-500/20" : "bg-red-500/20")
                }
              >
                {up ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {rangeLabel} change
                </p>
                <p
                  className={
                    "text-2xl font-bold leading-none " +
                    (up
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-red-700 dark:text-red-400")
                  }
                >
                  {formatPctChange(rangeChange)}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Segmented range control (CMC-style) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inline-flex rounded-xl border border-border/70 bg-muted/40 p-1 dark:bg-muted/25"
            role="tablist"
            aria-label="Chart range"
          >
            {RANGE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={range === tab.id}
                onClick={() => setRange(tab.id)}
                className={
                  "rounded-lg px-4 py-2 text-xs font-semibold transition-all " +
                  (range === tab.id
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/80 dark:bg-card"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
          {rangeHighLow && rangeHighLow.hi > 0 ? (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs tabular-nums text-muted-foreground">
              <span>
                <span className="font-medium text-foreground/80">H </span>
                {formatTooltipUsd(rangeHighLow.hi)}
              </span>
              <span>
                <span className="font-medium text-foreground/80">L </span>
                {formatTooltipUsd(rangeHighLow.lo)}
              </span>
            </div>
          ) : null}
        </div>

        {/* Chart — dark panel in dark mode, CMC-like grid + smooth area */}
        <div
          className={
            "overflow-hidden rounded-2xl border border-border/60 shadow-inner " +
            "bg-gradient-to-b from-muted/30 to-muted/5 dark:from-[#0f1419] dark:to-[#0a0e12] dark:border-white/[0.06]"
          }
        >
          <div className="h-[240px] w-full min-h-[220px] sm:h-[280px]">
            {hydrated && chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={stroke}
                        stopOpacity={0.45}
                      />
                      <stop
                        offset="55%"
                        stopColor={stroke}
                        stopOpacity={0.12}
                      />
                      <stop
                        offset="100%"
                        stopColor={stroke}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical
                    horizontal
                    className="stroke-border/35 dark:stroke-white/[0.06]"
                  />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={[chartAxis.minT, chartAxis.maxT]}
                    ticks={chartAxis.ticks}
                    tickFormatter={(ts) => chartAxis.formatTick(ts as number)}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "var(--muted-foreground)",
                      opacity: 0.9,
                    }}
                    padding={{ left: 8, right: 8 }}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "var(--muted-foreground)",
                      opacity: 0.9,
                    }}
                    tickFormatter={(v) => formatAxisUsd(Number(v))}
                    width={48}
                  />
                  <Tooltip
                    cursor={{
                      stroke: stroke,
                      strokeWidth: 1,
                      strokeOpacity: 0.5,
                      strokeDasharray: "4 4",
                    }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const row = payload[0].payload as {
                        t: number
                        usd: number
                        sol: number
                      }
                      return (
                        <div
                          className={
                            "rounded-xl border px-3.5 py-2.5 text-sm shadow-xl " +
                            "border-border/80 bg-card/95 backdrop-blur-sm " +
                            "dark:border-white/10 dark:bg-[#151b22]/95"
                          }
                        >
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {new Date(row.t).toLocaleString()}
                          </p>
                          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                            {formatHeroUsd(row.usd)}
                          </p>
                          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                            {row.sol.toFixed(4)} SOL
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="basis"
                    dataKey="usd"
                    stroke={stroke}
                    strokeWidth={2.5}
                    fill={`url(#${fillId})`}
                    dot={false}
                    activeDot={{
                      r: 5,
                      strokeWidth: 2,
                      stroke: "var(--background)",
                      fill: stroke,
                    }}
                    animationDuration={500}
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Preparing chart…
              </div>
            )}
          </div>
          <p className="border-t border-border/40 px-3 py-2.5 text-center text-[10px] leading-relaxed text-muted-foreground dark:border-white/[0.06]">
            Tracked value = locked SOL × live SOL price. History stays on this
            device; the line updates when price or balances move.
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
