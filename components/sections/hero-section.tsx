"use client"

import { useState, useEffect } from "react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  const { ref, scrollProgress } = useScrollAnimation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const safeProgress = mounted ? scrollProgress : 0
  // Keep the hero readable and not washed out; only apply a subtle parallax.
  const opacity = 1
  const scale = Math.max(0.9, 1 - safeProgress * 0.05)
  const translateY = safeProgress * 20

  return (
    <section
      ref={ref}
      className="relative h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      <div
        className="text-center px-4 transition-opacity duration-100"
        style={{
          opacity,
          transform: `scale(${scale}) translateY(${translateY}px)`,
        }}
      >
        <p className="text-primary text-sm md:text-base tracking-widest uppercase mb-6">
          Built on Solana
        </p>
        <h1 className="text-5xl md:text-7xl lg:text-9xl font-bold tracking-tight text-balance mb-6">
          Nest
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty">
          Secure your children&apos;s future. Lock SOL today, unlock their dreams tomorrow.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="text-base px-8" asChild>
            <Link href="/app">Launch App</Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base px-8" asChild>
            <Link href="#how-it-works">Learn More</Link>
          </Button>
        </div>
      </div>

      <div className="absolute bottom-10 animate-bounce">
        <ArrowDown className="w-6 h-6 text-muted-foreground" />
      </div>

      <div
        className="absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />
      </div>
    </section>
  )
}

