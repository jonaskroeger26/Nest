"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useChildren } from "@/context/children-context"
import type { Child } from "@/context/children-context"
import { useSolPrice, solToUsdFormatted } from "@/hooks/use-sol-price"

/** Theme-aware (light/dark) via globals.css */
const CHART_VARS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
] as const

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
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

  const totalSol = useMemo(
    () => children.reduce((sum, c) => sum + c.totalSaved, 0),
    [children]
  )

  const rows = useMemo(() => {
    return children.map((c, i) => {
      const sol = c.totalSaved
      const pctRaw = totalSol > 0 ? (sol / totalSol) * 100 : 0
      const pct = Math.round(pctRaw * 10) / 10
      return {
        fullName: c.name,
        sol,
        pct,
        pctRaw,
        fill: CHART_VARS[i % CHART_VARS.length]!,
        initial: initials(c.name),
      }
    })
  }, [children, totalSol])

  const positiveRows = useMemo(
    () => rows.filter((r) => r.sol > 0),
    [rows]
  )

  if (children.length === 0) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Portfolio
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How your locked savings split across children
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-gradient-to-b from-muted/40 to-muted/10 px-6 py-10">
            <p className="max-w-[280px] text-center text-sm leading-relaxed text-muted-foreground">
              Add children and lock SOL to see your breakdown here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">
              Portfolio
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Locked SOL by child
            </p>
          </div>
          {totalSol > 0 ? (
            <div className="mt-2 text-left sm:mt-0 sm:text-right">
              <p className="text-xs font-medium text-muted-foreground">
                Total
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {totalSol.toFixed(3)}
                <span className="ml-1.5 text-base font-medium text-muted-foreground">
                  SOL
                </span>
              </p>
              {usd != null ? (
                <p className="text-sm tabular-nums text-muted-foreground">
                  {solToUsdFormatted(totalSol, usd)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">USD after price load</p>
              )}
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-0">
        {totalSol === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-gradient-to-b from-muted/40 to-muted/10 px-6 py-10">
            <p className="max-w-[300px] text-center text-sm leading-relaxed text-muted-foreground">
              Lock SOL on a child&apos;s goals to see how your portfolio is
              allocated.
            </p>
          </div>
        ) : (
          <>
            {/* Composition strip */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Split
              </p>
              <div
                className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/40"
                role="img"
                aria-label="Portfolio split by child"
              >
                {positiveRows.map((r, i) => (
                  <div
                    key={`${r.fullName}-seg-${i}`}
                    title={`${r.fullName}: ${r.pct}%`}
                    className={
                      "h-full min-w-[3px] transition-[flex-grow] duration-300 " +
                      (i === 0 ? "rounded-l-full " : "") +
                      (i === positiveRows.length - 1 ? "rounded-r-full" : "")
                    }
                    style={{
                      flexGrow: Math.max(r.pctRaw, 0.001),
                      flexBasis: 0,
                      backgroundColor: r.fill,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Per-child rows */}
            <ul className="space-y-2">
              {rows.map((r, i) => (
                <li
                  key={`${r.fullName}-${i}`}
                  className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/35"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-white shadow-sm"
                      style={{ backgroundColor: r.fill }}
                      aria-hidden
                    >
                      {r.initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-medium text-foreground">
                          {r.fullName}
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                          {r.pct}%
                        </span>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted/90">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(r.pctRaw, r.sol > 0 ? 2 : 0))}%`,
                            backgroundColor: r.fill,
                          }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm tabular-nums text-muted-foreground">
                        <span>{r.sol.toFixed(4)} SOL</span>
                        {usd != null && r.sol > 0 ? (
                          <>
                            <span className="text-border">·</span>
                            <span>{solToUsdFormatted(r.sol, usd)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-center text-[11px] leading-snug text-muted-foreground/90">
              Totals reflect current on-chain locks. A timeline view will come
              when history is indexed.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
