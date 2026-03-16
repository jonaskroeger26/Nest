"use client"

import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { Lock, TrendingUp, Gift, Shield } from "lucide-react"

const features = [
  {
    icon: Lock,
    title: "Time-Locked SOL",
    description:
      "Set milestone dates for your children's future - college, first car, or any dream.",
    stat: "18+",
    statLabel: "Year lock options",
  },
  {
    icon: TrendingUp,
    title: "Earn mSOL APY",
    description:
      "Your locked SOL works while it waits. Stake as mSOL and watch it grow.",
    stat: "7%+",
    statLabel: "Average APY",
  },
  {
    icon: Gift,
    title: "Family Contributions",
    description:
      "Let grandparents, aunts, and uncles contribute to your children's goals.",
    stat: "100%",
    statLabel: "On-chain secure",
  },
  {
    icon: Shield,
    title: "Non-Custodial",
    description:
      "You hold your keys. Funds are locked in smart contracts you control.",
    stat: "24/7",
    statLabel: "Full ownership",
  },
]

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0]
  index: number
}) {
  const { ref, isInView } = useScrollAnimation({
    threshold: 0.2,
    once: true,
  })

  const Icon = feature.icon

  return (
    <div
      ref={ref}
      className="group relative bg-card border border-border rounded-2xl p-8 transition-all duration-700"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView
          ? "translateY(0) scale(1)"
          : "translateY(60px) scale(0.95)",
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-500">
          <Icon className="w-7 h-7 text-primary" />
        </div>

        <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {feature.description}
        </p>

        <div className="pt-6 border-t border-border">
          <p className="text-3xl font-bold text-primary">{feature.stat}</p>
          <p className="text-sm text-muted-foreground">{feature.statLabel}</p>
        </div>
      </div>
    </div>
  )
}

export function FeatureCardsSection() {
  const { ref, isInView } = useScrollAnimation({ threshold: 0.1, once: true })

  return (
    <section id="features" className="py-32 px-4">
      <div className="max-w-7xl mx-auto">
        <div
          ref={ref}
          className="text-center mb-20 transition-all duration-1000"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(40px)",
          }}
        >
          <p className="text-primary text-sm tracking-widest uppercase mb-4">
            How It Works
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance">
            Build generational wealth
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple, secure, and designed for families who think long-term.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

