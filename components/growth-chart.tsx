"use client"

import { useId, useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
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
import { parseGoalUnlockDate } from "@/lib/goal-dates"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

/** Child initials — neutral, document-style */
const avatar =
  "border border-border/80 bg-muted/50 text-muted-foreground dark:bg-muted/30"

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
  /** Neutral series stroke — direction is communicated in KPIs, not chart hue */
  const chartStroke = "var(--foreground)"
  const fillId = `nest-port-${chartUid}`

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

  /**
   * Y padding so the stroke isn’t flush against the chart edges (CMC / trading UX).
   * Flat series gets a synthetic band so the line still breathes.
   */
  const yDomain = useMemo((): [number, number] | [string, string] => {
    if (chartData.length < 2) return ["auto", "auto"]
    const vals = chartData.map((d) => d.usd)
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const spread = hi - lo
    if (spread < 1e-9) {
      const bump = Math.max(Math.abs(hi) * 0.06, 0.5)
      return [Math.max(0, hi - bump), hi + bump]
    }
    const pad = spread * 0.12
    return [Math.max(0, lo - pad), hi + pad]
  }, [chartData])

  if (children.length === 0) {
    return (
      <Card className="gap-0 overflow-hidden rounded-xl border border-border bg-card py-0 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:shadow-none">
        <CardContent className="p-8">
          <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/15 px-6 py-12">
            <p className="max-w-[320px] text-center text-[13px] leading-relaxed text-muted-foreground">
              Add a child and lock SOL to track portfolio value. Local history
              appears after your first snapshots.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const rangeLabel =
    range === "1d"
      ? "24h"
      : range === "7d"
        ? "7d"
        : range === "30d"
          ? "30d"
          : "All"

  return (
    <Card className="gap-0 overflow-hidden rounded-xl border border-border bg-card py-0 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:shadow-none">
      <CardHeader className="border-b border-border/80 px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Portfolio
            </p>
            <p className="text-[13px] text-muted-foreground">
              Estimated value of locked SOL (USD). History is stored locally.
            </p>
          </div>
          <div className="flex flex-col gap-1 lg:items-end">
            {currentUsd != null ? (
              <>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Total value
                </p>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-[2rem] sm:leading-none">
                    {formatHeroUsd(currentUsd)}
                  </p>
                  {rangeChange != null ? (
                    <span
                      className={
                        "text-sm font-medium tabular-nums " +
                        (up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")
                      }
                    >
                      {formatPctChange(rangeChange)}
                      <span className="text-muted-foreground"> {rangeLabel}</span>
                    </span>
                  ) : null}
                </div>
                <p className="text-[13px] tabular-nums text-muted-foreground">
                  {totalSol.toFixed(4)} SOL
                  {usd != null ? (
                    <span className="text-muted-foreground/80">
                      {" "}
                      · Ref. {solToUsdFormatted(1, usd)} / SOL
                    </span>
                  ) : null}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading spot price…</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inline-flex w-fit rounded-md border border-border bg-muted/30 p-0.5 dark:bg-muted/20"
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
                  "rounded-[5px] px-3 py-1.5 text-xs font-medium transition-colors " +
                  (range === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
          {rangeHighLow && rangeHighLow.hi > 0 ? (
            <p className="text-[11px] tabular-nums text-muted-foreground">
              Range · High {formatTooltipUsd(rangeHighLow.hi)} · Low{" "}
              {formatTooltipUsd(rangeHighLow.lo)}
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-border/80 bg-muted/20">
          <div className="h-[260px] w-full min-h-[240px] sm:h-[300px]">
            {hydrated && chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 12, right: 8, left: 4, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={chartStroke}
                        stopOpacity={0.11}
                      />
                      <stop
                        offset="100%"
                        stopColor={chartStroke}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    className="stroke-border/30 dark:stroke-border/20"
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
                    }}
                    padding={{ left: 4, right: 4 }}
                  />
                  <YAxis
                    domain={yDomain}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "var(--muted-foreground)",
                    }}
                    tickFormatter={(v) => formatAxisUsd(Number(v))}
                    width={48}
                  />
                  <Tooltip
                    cursor={{
                      stroke: "var(--border)",
                      strokeWidth: 1,
                      strokeOpacity: 0.85,
                      strokeDasharray: "3 3",
                    }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const row = payload[0].payload as {
                        t: number
                        usd: number
                        sol: number
                      }
                      return (
                        <div className="rounded-md border border-border bg-popover px-3 py-2.5 text-sm shadow-lg">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {new Date(row.t).toLocaleString()}
                          </p>
                          <p className="mt-1 font-semibold tabular-nums text-foreground">
                            {formatHeroUsd(row.usd)}
                          </p>
                          <p className="text-[11px] tabular-nums text-muted-foreground">
                            {row.sol.toFixed(4)} SOL
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="usd"
                    stroke="none"
                    fill={`url(#${fillId})`}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="usd"
                    stroke={chartStroke}
                    strokeOpacity={0.55}
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{
                      r: 4,
                      strokeWidth: 2,
                      stroke: "var(--background)",
                      fill: "var(--foreground)",
                    }}
                    animationDuration={320}
                    isAnimationActive
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                Preparing chart…
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          <div className="bg-card px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Locked principal
            </p>
            <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground">
              {totalSol.toFixed(2)}{" "}
              <span className="text-sm font-normal text-muted-foreground">SOL</span>
            </p>
            {usd != null && totalSol > 0 ? (
              <p className="mt-1 text-[12px] tabular-nums text-muted-foreground">
                ≈ {solToUsdFormatted(totalSol, usd)}
              </p>
            ) : null}
          </div>
          <div className="bg-card px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Beneficiaries
            </p>
            <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground">
              {children.length}
            </p>
          </div>
          <div className="bg-card px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              24h move (USD)
            </p>
            <p
              className={
                "mt-2 text-xl font-semibold tabular-nums tracking-tight " +
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

        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Allocation by beneficiary
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 dark:bg-muted/15">
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium text-muted-foreground sm:table-cell">
                    Goal
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    SOL
                  </th>
                  {usd != null ? (
                    <th className="hidden px-4 py-2.5 text-right font-medium text-muted-foreground md:table-cell">
                      Est. USD
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {children.map((c, i) => (
                  <tr
                    key={`${c.name}-${i}`}
                    className="border-b border-border/80 last:border-0 hover:bg-muted/25"
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-medium ${avatar}`}
                          aria-hidden
                        >
                          {initials(c.name)}
                        </div>
                        <span className="font-medium text-foreground">
                          {c.name}
                        </span>
                      </div>
                    </td>
                    <td className="hidden max-w-[200px] truncate px-4 py-3 text-muted-foreground sm:table-cell">
                      {goalSubtitle(c)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                      {c.totalSaved.toFixed(2)}
                    </td>
                    {usd != null ? (
                      <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground md:table-cell">
                        {solToUsdFormatted(c.totalSaved, usd)}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            USD figures use the live SOL reference shown above.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
