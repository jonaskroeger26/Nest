"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { VaultProgramBanner } from "@/components/vault-program-banner"
import { StatsOverview } from "@/components/stats-overview"
import { ChildCard } from "@/components/child-card"
import { GrowthChart } from "@/components/growth-chart"
import { UpcomingMilestones } from "@/components/upcoming-milestones"
import { QuickActions } from "@/components/quick-actions"
import { useChildren } from "@/context/children-context"
import { useUser } from "@/context/user-context"
import { useProfileReady } from "@/context/profile-ready-context"
import { useVaultBalances } from "@/context/vault-balances-context"
import { useSolPrice, solToUsdFormatted } from "@/hooks/use-sol-price"
import { useWallet } from "@/hooks/use-wallet"
import { Spinner } from "@/components/ui/spinner"

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
  const profileReady = useProfileReady()
  const { byBeneficiarySol } = useVaultBalances()
  const { usdPerSol } = useSolPrice()
  const greeting = getTimeGreeting()
  const greetingLine = userName ? `${greeting}, ${userName}` : greeting

  const enrichedChildren = children.map((c) => {
    const chain =
      c.beneficiaryAddress != null && c.beneficiaryAddress !== ""
        ? (byBeneficiarySol[c.beneficiaryAddress] ?? 0)
        : 0
    return {
      ...c,
      totalSaved: Math.max(c.totalSaved, chain),
    }
  })

  const usedBeneficiaries = new Set(
    children.map((c) => c.beneficiaryAddress).filter(Boolean) as string[]
  )
  const orphanVaults = Object.entries(byBeneficiarySol).filter(
    ([b]) => !usedBeneficiaries.has(b)
  )

  const totalSolLocked = Object.values(byBeneficiarySol).reduce(
    (sum, v) => sum + v,
    0
  )
  const profileUsd =
    usdPerSol != null && totalSolLocked > 0
      ? solToUsdFormatted(totalSolLocked, usdPerSol)
      : undefined

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {connected && !profileReady ? (
        <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-muted-foreground">Loading your profile…</p>
        </main>
      ) : connected ? (
        <main className="px-6 py-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <VaultProgramBanner />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {greetingLine}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {profileUsd ? (
                  <>
                    About <span className="font-medium text-foreground">{profileUsd}</span>{" "}
                    locked at today&apos;s SOL price
                  </>
                ) : (
                  <>Your children&apos;s futures are growing stronger every day.</>
                )}
              </p>
            </div>
            <StatsOverview />
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-8 lg:col-span-2">
                <GrowthChart childrenOverride={enrichedChildren} />
                <div>
                  <h2 className="mb-4 text-xl font-semibold text-foreground">
                    Your Children
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {enrichedChildren.map((child) => (
                      <ChildCard
                        key={`${child.name}-${child.beneficiaryAddress ?? ""}`}
                        name={child.name}
                        age={child.age}
                        avatar={child.avatar}
                        totalSaved={child.totalSaved}
                        goals={child.goals}
                        beneficiaryAddress={child.beneficiaryAddress}
                      />
                    ))}
                  </div>
                  {orphanVaults.length > 0 && (
                    <div className="mt-8 rounded-xl border border-dashed border-border p-4">
                      <h3 className="mb-2 text-sm font-medium text-foreground">
                        Locked SOL (no matching child profile)
                      </h3>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Add a child and set their wallet to the same address you used when locking, or these stay listed here.
                      </p>
                      <ul className="space-y-2 text-sm">
                        {orphanVaults.map(([addr, sol]) => (
                          <li key={addr} className="flex justify-between gap-4">
                            <span className="truncate font-mono text-xs text-muted-foreground">
                              {addr.slice(0, 8)}…{addr.slice(-6)}
                            </span>
                            <span className="shrink-0 text-right font-medium">
                              <span className="block">
                                {usdPerSol != null
                                  ? solToUsdFormatted(sol, usdPerSol)
                                  : `${sol.toFixed(3)} SOL`}
                              </span>
                              {usdPerSol != null && (
                                <span className="text-xs text-muted-foreground">
                                  {sol.toFixed(3)} SOL
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
