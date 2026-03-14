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

const data = [
  { month: "Jan", total: 28000, emma: 12000, liam: 10000, sophia: 6000 },
  { month: "Feb", total: 30500, emma: 13000, liam: 10500, sophia: 7000 },
  { month: "Mar", total: 33200, emma: 14200, liam: 11000, sophia: 8000 },
  { month: "Apr", total: 36100, emma: 15500, liam: 11600, sophia: 9000 },
  { month: "May", total: 39500, emma: 17000, liam: 12500, sophia: 10000 },
  { month: "Jun", total: 42800, emma: 18500, liam: 13300, sophia: 11000 },
  { month: "Jul", total: 47250, emma: 20500, liam: 14750, sophia: 12000 },
]

export function GrowthChart() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Portfolio Growth</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your children&apos;s funds over time
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-1" />
              <span className="text-sm text-muted-foreground">Emma</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-2" />
              <span className="text-sm text-muted-foreground">Liam</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-3" />
              <span className="text-sm text-muted-foreground">Sophia</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorEmma" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.55 0.15 160)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.55 0.15 160)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLiam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.70 0.12 80)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.70 0.12 80)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSophia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.45 0.10 200)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.45 0.10 200)" stopOpacity={0} />
                </linearGradient>
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
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(1 0 0)",
                  border: "1px solid oklch(0.90 0.02 160)",
                  borderRadius: "0.75rem",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
              />
              <Area
                type="monotone"
                dataKey="emma"
                stackId="1"
                stroke="oklch(0.55 0.15 160)"
                strokeWidth={2}
                fill="url(#colorEmma)"
              />
              <Area
                type="monotone"
                dataKey="liam"
                stackId="1"
                stroke="oklch(0.70 0.12 80)"
                strokeWidth={2}
                fill="url(#colorLiam)"
              />
              <Area
                type="monotone"
                dataKey="sophia"
                stackId="1"
                stroke="oklch(0.45 0.10 200)"
                strokeWidth={2}
                fill="url(#colorSophia)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
