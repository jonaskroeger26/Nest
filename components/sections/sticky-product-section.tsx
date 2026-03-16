"use client"

import { useState, useEffect } from "react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

const productFeatures = [
  {
    title: "Add Your Children",
    description:
      "Create profiles for each child with their own goals and milestones. Track college funds, car funds, or dream vacations separately.",
  },
  {
    title: "Lock SOL to Goals",
    description:
      "Assign SOL to specific milestones with unlock dates. Choose to stake as mSOL for additional yield while locked.",
  },
  {
    title: "Watch Them Grow",
    description:
      "Monitor portfolio growth over time. See projections, track staking rewards, and celebrate milestones together.",
  },
]

export function StickyProductSection() {
  const { ref, scrollProgress } = useScrollAnimation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const safeScrollProgress = mounted ? scrollProgress : 0

  const activeIndex = Math.min(
    productFeatures.length - 1,
    Math.floor(safeScrollProgress * productFeatures.length * 1.2)
  )

  const rotateY = (safeScrollProgress - 0.5) * 20
  const scale = 0.8 + safeScrollProgress * 0.2

  return (
    <section
      ref={ref}
      className="min-h-[300vh] relative bg-secondary/30"
    >
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="max-w-7xl mx-auto w-full px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div
              className="relative aspect-video bg-card rounded-2xl border border-border overflow-hidden shadow-2xl"
              style={{
                transform: `perspective(1000px) rotateY(${rotateY}deg) scale(${scale})`,
                transition: "transform 0.1s ease-out",
              }}
            >
              <div className="absolute inset-0 p-4">
                <div className="h-full bg-background rounded-lg border border-border flex flex-col">
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary text-xs font-bold">N</span>
                      </div>
                      <span className="font-semibold text-sm">Nest</span>
                    </div>
                    <div className="h-6 px-3 bg-primary/20 rounded-full text-xs flex items-center text-primary">
                      Connected
                    </div>
                  </div>

                  <div className="flex-1 p-4 overflow-hidden">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-secondary rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Total Locked</p>
                        <p
                          className="text-lg font-bold text-primary"
                          style={{
                            opacity: 0.3 + safeScrollProgress * 0.7,
                          }}
                        >
                          24.5 SOL
                        </p>
                      </div>
                      <div className="bg-secondary rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Children</p>
                        <p className="text-lg font-bold">2</p>
                      </div>
                      <div className="bg-secondary rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Growth</p>
                        <p className="text-lg font-bold text-primary">+7.2%</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {["Emma", "Liam"].map((name, i) => (
                        <div
                          key={name}
                          className="bg-secondary rounded-lg p-3 flex items-center justify-between"
                          style={{
                            opacity: i <= activeIndex ? 1 : 0.3,
                            transform: `translateX(${i <= activeIndex ? 0 : 10}px)`,
                            transition: "all 0.3s",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-primary font-semibold">{name[0]}</span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{name}</p>
                              <p className="text-xs text-muted-foreground">
                                {i === 0 ? "College 2035" : "First Car 2030"}
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-primary">{i === 0 ? "15.2" : "9.3"} SOL</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-20 border-t border-border p-3">
                    <div className="h-full bg-secondary rounded flex items-end gap-1 px-2 pb-1">
                      {[...Array(12)].map((_, i) => {
                        const baseHeight = 30 + i * 4
                        const animatedHeight = mounted
                          ? baseHeight + Math.sin(i * 0.5 + scrollProgress * 5) * 20
                          : baseHeight
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-primary/40 rounded-t transition-[height] duration-200 ease-out"
                            style={{
                              height: `${Math.max(10, animatedHeight)}%`,
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="absolute -inset-20 bg-primary/20 blur-3xl -z-10"
                style={{
                  opacity: safeScrollProgress * 0.5,
                }}
              />
            </div>

            <div className="space-y-12">
              <div>
                <p className="text-primary text-sm tracking-widest uppercase mb-4">
                  The Platform
                </p>
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  Simple. Secure. Family-first.
                </h2>
              </div>

              <div className="space-y-8">
                {productFeatures.map((feature, index) => (
                  <div
                    key={feature.title}
                    className="transition-all duration-500"
                    style={{
                      opacity: index <= activeIndex ? 1 : 0.3,
                      transform: index <= activeIndex ? "translateX(0)" : "translateX(20px)",
                    }}
                  >
                    <div className="flex gap-4">
                      <div
                        className="w-1 rounded-full transition-colors duration-500"
                        style={{
                          backgroundColor:
                            index === activeIndex
                              ? "var(--primary)"
                              : "var(--border)",
                        }}
                      />
                      <div>
                        <h3 className="text-xl font-semibold mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

