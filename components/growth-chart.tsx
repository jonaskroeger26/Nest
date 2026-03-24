"use client"

import { useId, useMemo, useState } from "react"
import { Activity, LineChart, Lock, Users } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

/** Child list avatars — soft primary tint */
const avatar =
  "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary"

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
  const stroke = up ? "var(--chart-1)" : "var(--destructive)"
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
      <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10">
            <p className="max-w-[300px] text-center text-sm leading-relaxed text-muted-foreground">
              Add a child and lock SOL to see portfolio value over time. History
              is saved on this device.
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
    <Card className="gap-0 overflow-hidden rounded-2xl border border-border/80 py-0 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-gradient-to-br from-primary/[0.07] via-card to-card px-6 pb-5 pt-6 dark:from-primary/10 dark:via-card dark:to-card sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <LineChart className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <CardTitle className="text-xl font-semibold tracking-tight">
                Portfolio
              </CardTitle>
            </div>
            <CardDescription className="max-w-md pl-11 text-pretty">
              Locked SOL in USD. History is stored on this device for your
              timeline.
            </CardDescription>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {currentUsd != null ? (
              <>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
                    {formatHeroUsd(currentUsd)}
                  </p>
                  {rangeChange != null ? (
                    <span
                      className={
                        "rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums " +
                        (up
                          ? "bg-primary/15 text-primary"
                          : "bg-destructive/12 text-destructive")
                      }
                    >
                      {formatPctChange(rangeChange)}{" "}
                      <span className="font-medium text-muted-foreground">
                        {rangeLabel}
                      </span>
                    </span>
                  ) : null}
                </div>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {totalSol.toFixed(4)} SOL
                  {usd != null ? (
                    <span> · {solToUsdFormatted(1, usd)} / SOL</span>
                  ) : null}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading price…</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inline-flex w-fit flex-wrap rounded-xl border border-border/70 bg-muted/35 p-1 dark:bg-muted/25"
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
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition-all " +
                  (range === tab.id
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/80"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
          {rangeHighLow && rangeHighLow.hi > 0 ? (
            <p className="text-xs tabular-nums text-muted-foreground">
              High {formatTooltipUsd(rangeHighLow.hi)} · Low{" "}
              {formatTooltipUsd(rangeHighLow.lo)}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-1 shadow-inner dark:bg-card/80">
          <div className="h-[240px] w-full min-h-[220px] sm:h-[280px]">
            {hydrated && chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 8, right: 4, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={stroke}
                        stopOpacity={0.22}
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
                    className="stroke-border/40 dark:stroke-border/25"
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
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                    }}
                    padding={{ left: 4, right: 4 }}
                  />
                  <YAxis
                    domain={yDomain}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                    }}
                    tickFormatter={(v) => formatAxisUsd(Number(v))}
                    width={44}
                  />
                  <Tooltip
                    cursor={{
                      stroke: "var(--border)",
                      strokeWidth: 1,
                      strokeOpacity: 0.9,
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
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
                          <p className="text-xs text-muted-foreground">
                            {new Date(row.t).toLocaleString()}
                          </p>
                          <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                            {formatHeroUsd(row.usd)}
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
                    stroke="none"
                    fill={`url(#${fillId})`}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="usd"
                    stroke={stroke}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{
                      r: 5,
                      strokeWidth: 2,
                      stroke: "var(--background)",
                      fill: stroke,
                    }}
                    animationDuration={400}
                    isAnimationActive
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Preparing chart…
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5 dark:bg-muted/10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Lock className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Locked
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {totalSol.toFixed(2)}{" "}
                <span className="text-sm font-semibold text-muted-foreground">
                  SOL
                </span>
              </p>
              {usd != null && totalSol > 0 ? (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {solToUsdFormatted(totalSol, usd)}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5 dark:bg-muted/10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Children
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {children.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5 dark:bg-muted/10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Activity className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">24h</p>
              <p
                className={
                  "text-lg font-bold tabular-nums " +
                  (stats.change1d == null
                    ? "text-muted-foreground"
                    : stats.change1d >= 0
                      ? "text-primary"
                      : "text-destructive")
                }
              >
                {formatPctChange(stats.change1d)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            By child
          </h3>
          <ul className="space-y-1 rounded-xl border border-border/60 bg-muted/10 p-1.5 dark:bg-muted/5">
            {children.map((c, i) => (
              <li
                key={`${c.name}-${i}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatar}`}
                  aria-hidden
                >
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {c.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {goalSubtitle(c)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {c.totalSaved.toFixed(2)} SOL
                </p>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
