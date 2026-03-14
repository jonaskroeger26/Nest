"use client"

import { Header } from "@/components/header"
import { StatsOverview } from "@/components/stats-overview"
import { ChildCard } from "@/components/child-card"
import { GrowthChart } from "@/components/growth-chart"
import { UpcomingMilestones } from "@/components/upcoming-milestones"
import { QuickActions } from "@/components/quick-actions"
import { useChildren } from "@/context/children-context"

export function HomeContent() {
  const { children } = useChildren()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Good morning, James
            </h1>
            <p className="mt-1 text-muted-foreground">
              Your children&apos;s futures are growing stronger every day
            </p>
          </div>
          <StatsOverview />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <GrowthChart />
              <div>
                <h2 className="mb-4 text-xl font-semibold text-foreground">
                  Your Children
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {children.map((child) => (
                    <ChildCard key={child.name} {...child} />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <QuickActions />
              <UpcomingMilestones />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
