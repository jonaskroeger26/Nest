"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useChildren } from "@/context/children-context"
import type { Child } from "@/context/children-context"
import { useSolPrice } from "@/hooks/use-sol-price"

export function GrowthChart({
  childrenOverride,
}: {
  childrenOverride?: Child[]
}) {
  const { children: ctxChildren } = useChildren()
  const children = childrenOverride ?? ctxChildren
  const { usdPerSol } = useSolPrice()
  const usd = usdPerSol ?? null

  if (children.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Portfolio Growth</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your children&apos;s funds over time
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
            <p className="text-sm text-muted-foreground">
              No data yet. Add children and lock SOL to see growth here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalSol = children.reduce((sum, c) => sum + c.totalSaved, 0)
  const toVal = (sol: number) => (usd != null ? sol * usd : sol)
  const total = toVal(totalSol)
  const data = [
    { month: "Start", total: 0, ...Object.fromEntries(children.map((_, i) => [`child${i}`, 0])) },
    {
      month: "Now",
      total,
      ...Object.fromEntries(
        children.map((c, i) => [`child${i}`, toVal(c.totalSaved)])
      ),
    },
  ]
  const fmtY = (value: number) =>
    usd != null
      ? value >= 1000
        ? `$${(value / 1000).toFixed(1)}k`
        : `$${Math.round(value)}`
      : `${value.toFixed(2)} SOL`
  const colors = ["oklch(0.55 0.15 160)", "oklch(0.70 0.12 80)", "oklch(0.45 0.10 200)"]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Portfolio Growth</CardTitle>
            <p className="text-sm text-muted-foreground">
              {usd != null ? "Value at live SOL price" : "SOL per child (USD when price loads)"}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {children.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <span className="text-sm text-muted-foreground">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {totalSol === 0 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Lock SOL for your children to see totals here.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  {children.map((_, i) => (
                    <linearGradient key={i} id={`colorChild${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(value) => fmtY(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(1 0 0)",
                    border: "1px solid oklch(0.90 0.02 160)",
                    borderRadius: "0.75rem",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [
                    usd != null
                      ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : `${value.toFixed(3)} SOL`,
                    "",
                  ]}
                />
                {children.map((c, i) => (
                  <Area
                    key={c.name}
                    type="monotone"
                    dataKey={`child${i}`}
                    stackId="1"
                    stroke={colors[i % colors.length]}
                    strokeWidth={2}
                    fill={`url(#colorChild${i})`}
                    name={c.name}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
