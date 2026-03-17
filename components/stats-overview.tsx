"use client"

import { TrendingUp, Lock, Users, Target } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useChildren } from "@/context/children-context"
import { useVaultBalances } from "@/context/vault-balances-context"
import { useMarinadeApy } from "@/hooks/use-marinade-apy"
import { useSolPrice, solToUsdFormatted } from "@/hooks/use-sol-price"

export function StatsOverview() {
  const { children } = useChildren()
  const { totalSol } = useVaultBalances()
  const { usdPerSol, loading: priceLoading } = useSolPrice()
  const marinadeApy = useMarinadeApy()

  const contextTotal = children.reduce((sum, c) => sum + c.totalSaved, 0)
  const activeGoals = children.reduce(
    (sum, c) => sum + c.goals.filter((g) => g.locked).length,
    0
  )
  const lockedSol = totalSol > 0 ? totalSol : contextTotal
  const usdLine =
    lockedSol > 0 && usdPerSol != null
      ? solToUsdFormatted(lockedSol, usdPerSol)
      : null
  const totalFormatted =
    lockedSol > 0
      ? usdLine && !priceLoading
        ? usdLine
        : `${lockedSol.toFixed(3)} SOL`
      : "—"
  const totalSub =
    lockedSol > 0 && usdLine
      ? `${lockedSol.toFixed(3)} SOL · live price`
      : lockedSol > 0 && usdPerSol == null
        ? `${lockedSol.toFixed(3)} SOL`
        : children.length === 0
          ? "Add children & lock SOL"
          : `${children.length} child${children.length === 1 ? "" : "ren"}`
  const growthLabel = marinadeApy != null ? `${marinadeApy}%` : "—"
  const growthSub = marinadeApy != null ? "Marinade mSOL APY (30d)" : "Connect & lock as mSOL for APY"

  const stats = [
    {
      label: "Profile value (locked)",
      value: totalFormatted,
      change: totalSub,
      icon: Lock,
      trend: "neutral" as const,
    },
    {
      label: "Active Goals",
      value: String(activeGoals),
      change: activeGoals === 0 ? "No locked goals" : "Locked until unlock date",
      icon: Target,
      trend: "neutral" as const,
    },
    {
      label: "Children",
      value: String(children.length),
      change:
        children.length === 0 ? "Add your first child" : "Saved in your Nest",
      icon: Users,
      trend: "neutral" as const,
    },
    {
      label: "Growth Rate",
      value: growthLabel,
      change: growthSub,
      icon: TrendingUp,
      trend: marinadeApy != null ? ("up" as const) : ("neutral" as const),
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className={`text-sm font-medium ${
                  stat.trend === "up" ? "text-primary" : "text-muted-foreground"
                }`}>
                  {stat.change}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
