"use client"

import { TrendingUp, Lock, Users, Target } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const stats = [
  {
    label: "Total Locked",
    value: "$47,250",
    change: "+12.5%",
    icon: Lock,
    trend: "up",
  },
  {
    label: "Active Goals",
    value: "8",
    change: "+2 this month",
    icon: Target,
    trend: "up",
  },
  {
    label: "Children",
    value: "3",
    change: "All growing",
    icon: Users,
    trend: "neutral",
  },
  {
    label: "Growth Rate",
    value: "4.2%",
    change: "APY",
    icon: TrendingUp,
    trend: "up",
  },
]

export function StatsOverview() {
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
