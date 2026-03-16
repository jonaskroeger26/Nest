"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { StatsOverview } from "@/components/stats-overview"
import { ChildCard } from "@/components/child-card"
import { GrowthChart } from "@/components/growth-chart"
import { UpcomingMilestones } from "@/components/upcoming-milestones"
import { QuickActions } from "@/components/quick-actions"
import { useChildren } from "@/context/children-context"
import { useUser } from "@/context/user-context"
import { useWallet } from "@/hooks/use-wallet"

// Single words so layout stays stable while cycling.
const WORDS = ["save", "grow", "dream", "launch"]

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "Good morning"
  if (hour >= 12 && hour < 17) return "Good afternoon"
  return "Good evening"
}

function LandingHero() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % WORDS.length)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <main className="px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-10 md:flex-row md:items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Built for long-term kids vaults
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Time-lock crypto so your kids can{" "}
            <span className="relative inline-flex min-w-[6ch] justify-start align-baseline">
              <span className="absolute inset-y-[55%] left-0 right-0 -translate-y-1/2 rounded-full bg-primary/15" />
              <span className="relative text-primary">{WORDS[index]}</span>
            </span>
            .
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Nest locks SOL or mSOL on Solana mainnet until the date you choose. You
            keep self-custody of your wallet; your child is the only one who can
            withdraw when it&apos;s time.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Time-locked vaults for each child or goal</li>
            <li>• Optional Marinade mSOL for yield while funds are locked</li>
            <li>• Simple withdraw flow for your child when the date arrives</li>
          </ul>
        </div>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur">
          <h2 className="text-base font-semibold text-foreground">
            Get started in minutes
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Connect your Solana wallet, add your children, and lock their first
            vault. You&apos;ll see the Nest dashboard after you connect.
          </p>
          <div className="mt-4 space-y-3 text-xs text-muted-foreground">
            <p>1. Connect wallet (Phantom or any Solana wallet)</p>
            <p>2. Sign a message to confirm it&apos;s really you</p>
            <p>3. Add a child and lock SOL or mSOL for their future</p>
          </div>
        </div>
      </div>
    </main>
  )
}

export function HomeContent() {
  const { children } = useChildren()
  const { userName } = useUser()
  const { connected } = useWallet()
  const greeting = getTimeGreeting()
  const greetingLine = userName ? `${greeting}, ${userName}` : greeting

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {connected ? (
        <main className="px-6 py-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {greetingLine}
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
      ) : (
        <LandingHero />
      )}
    </div>
  )
}
