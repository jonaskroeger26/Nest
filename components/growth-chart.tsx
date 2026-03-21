"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useChildren } from "@/context/children-context"
import type { Child } from "@/context/children-context"
import { useSolPrice, solToUsdFormatted } from "@/hooks/use-sol-price"

/** Distinct fills that work inside SVG (match app chart palette). */
const CHART_FILLS = [
  "oklch(0.55 0.15 160)",
  "oklch(0.70 0.12 80)",
  "oklch(0.45 0.10 200)",
  "oklch(0.65 0.08 160)",
  "oklch(0.80 0.10 80)",
]

export function GrowthChart({
  childrenOverride,
}: {
  childrenOverride?: Child[]
}) {
  const { children: ctxChildren } = useChildren()
  const children = childrenOverride ?? ctxChildren
  const { usdPerSol } = useSolPrice()
  const usd = usdPerSol ?? null

  const totalSol = useMemo(
    () => children.reduce((sum, c) => sum + c.totalSaved, 0),
    [children]
  )

  const chartData = useMemo(() => {
    return children.map((c, i) => {
      const sol = c.totalSaved
      const valueUsd = usd != null ? sol * usd : sol
      const pct =
        totalSol > 0 ? Math.round((sol / totalSol) * 1000) / 10 : 0
      return {
        name:
          c.name.length > 14 ? `${c.name.slice(0, 14)}…` : c.name,
        fullName: c.name,
        sol,
        value: valueUsd,
        pct,
        fill: CHART_FILLS[i % CHART_FILLS.length]!,
      }
    })
  }, [children, totalSol, usd])

  const maxVal = useMemo(() => {
    const m = Math.max(...chartData.map((d) => d.value), 0)
    return m > 0 ? m * 1.08 : 1
  }, [chartData])

  const fmtAxis = (value: number) => {
    if (usd != null) {
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
      if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
      return `$${Math.round(value)}`
    }
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k SOL`
    return `${value.toFixed(2)} SOL`
  }

  const chartHeight = Math.min(360, Math.max(160, children.length * 52 + 72))

  if (children.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Portfolio</CardTitle>
          <p className="text-sm text-muted-foreground">
            See how savings split across your children
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
            <p className="max-w-[260px] text-center text-sm text-muted-foreground">
              Add children and lock SOL to see your portfolio breakdown here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Portfolio</CardTitle>
            <p className="text-sm text-muted-foreground">
              Balance by child — live totals
              {usd == null ? " (USD when price loads)" : ""}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total locked
            </p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {totalSol.toFixed(3)} <span className="text-base font-normal">SOL</span>
            </p>
            {usd != null && totalSol > 0 ? (
              <p className="text-sm text-muted-foreground tabular-nums">
                ≈ {solToUsdFormatted(totalSol, usd)}
              </p>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {totalSol === 0 ? (
          <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
            <p className="max-w-[280px] text-center text-sm text-muted-foreground">
              Lock SOL for your children to see how it&apos;s allocated across
              their profiles.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div style={{ height: chartHeight }} className="w-full min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                  barCategoryGap={12}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="stroke-border/60"
                  />
                  <XAxis
                    type="number"
                    domain={[0, maxVal]}
                    tickFormatter={fmtAxis}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--foreground)" }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0]?.payload as (typeof chartData)[0]
                      if (!row) return null
                      return (
                        <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
                          <p className="font-medium">{row.fullName}</p>
                          <p className="tabular-nums text-muted-foreground">
                            {row.sol.toFixed(4)} SOL
                            {usd != null ? (
                              <>
                                {" "}
                                · {solToUsdFormatted(row.sol, usd)}
                              </>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.pct}% of portfolio
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={36}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={`${entry.fullName}-${i}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Historical growth over time will appear once we chart lock events;
              for now this shows your current split.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
