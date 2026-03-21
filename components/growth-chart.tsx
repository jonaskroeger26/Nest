"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useChildren } from "@/context/children-context"
import type { Child } from "@/context/children-context"
import { useSolPrice, solToUsdFormatted } from "@/hooks/use-sol-price"

/** Mint palette aligned with Nest marketing / mock */
const mint = {
  bar: "bg-[#6FA889]",
  barHover: "hover:bg-[#5F9878]",
  strip: "bg-[#E8F4EC]",
  pill: "bg-[#E8F4EC] dark:bg-emerald-950/35",
  statGreen: "text-[#2D6A4F] dark:text-emerald-300",
  avatar: "bg-[#D4ECD9] text-[#2D6A4F] dark:bg-emerald-900/50 dark:text-emerald-200",
} as const

const BAR_COUNT = 11

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

/** Upward stepped heights (mock-style), scaled when portfolio > 0 */
function useBarFractions(totalSol: number) {
  return useMemo(() => {
    const base = Array.from({ length: BAR_COUNT }, (_, i) => {
      const t = i / (BAR_COUNT - 1)
      // Ease-out: low left → tall right (like the mock)
      const eased = 1 - Math.pow(1 - t, 1.65)
      return 0.18 + eased * 0.82
    })
    if (totalSol <= 0) {
      return base.map(() => 0.08)
    }
    return base
  }, [totalSol])
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

  const barFractions = useBarFractions(totalSol)

  /** Illustrative growth label until on-chain history exists (matches landing mock tone). */
  const growthLabel = totalSol > 0 ? "+7.2%" : "—"

  if (children.length === 0) {
    return (
      <Card className="overflow-hidden rounded-2xl border border-[#D4ECD9]/80 bg-card shadow-sm dark:border-emerald-900/40">
        <CardContent className="p-6">
          <div
            className={`flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-[#B8DCC4] ${mint.strip} px-6 py-10 dark:border-emerald-800/50`}
          >
            <p className="max-w-[280px] text-center text-sm leading-relaxed text-muted-foreground">
              Add children and lock SOL to see your overview and growth chart.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden rounded-2xl border border-[#D4ECD9]/80 bg-card shadow-sm dark:border-emerald-900/40">
      <CardContent className="space-y-6 p-6">
        {/* Top stats — three mint pills like the mock */}
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
              Growth
            </p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${mint.statGreen}`}
            >
              {growthLabel}
            </p>
            {totalSol > 0 ? (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Illustrative · history soon
              </p>
            ) : null}
          </div>
        </div>

        {/* Child rows — avatar, name + goal, SOL right */}
        <ul className="divide-y divide-border/60">
          {children.map((c, i) => (
            <li key={`${c.name}-${i}`} className="flex items-center gap-3 py-3 first:pt-0">
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

        {/* Portfolio growth — vertical bars, no axes (mock) */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Portfolio growth
          </p>
          <div
            className={`rounded-xl ${mint.strip} px-4 pb-4 pt-6 ring-1 ring-[#C5E3D1]/50 dark:ring-emerald-800/40`}
          >
            <div
              className="flex h-36 items-end justify-between gap-1.5 sm:gap-2"
              role="img"
              aria-label="Illustrative portfolio growth over time"
            >
              {barFractions.map((frac, i) => (
                <div
                  key={i}
                  className="flex h-full min-h-0 flex-1 flex-col justify-end"
                >
                  <div
                    className={`w-full min-h-[6px] rounded-t-md ${mint.bar} ${mint.barHover} transition-all duration-500`}
                    style={{ height: `${frac * 100}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Bars show an illustrative path to your current total; on-chain
            history will replace this when indexed.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
