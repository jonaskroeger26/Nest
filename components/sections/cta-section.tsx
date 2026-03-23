"use client"

import { useState, useEffect } from "react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export function CTASection() {
  const { ref, isInView, scrollProgress } = useScrollAnimation({
    threshold: 0.2,
    once: true,
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const safeProgress = mounted ? scrollProgress : 0
  const scale = 0.9 + safeProgress * 0.1

  return (
    <section ref={ref} className="py-32 px-4 relative overflow-hidden">
      <div
        className="max-w-4xl mx-auto text-center transition-all duration-1000"
        style={{
          opacity: isInView ? 1 : 0,
          transform: `scale(${isInView ? scale : 0.9}) translateY(${isInView ? 0 : 40}px)`,
        }}
      >
        <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-6 text-balance">
          Start building their future today
        </h2>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Join families who are securing their children's dreams with the power of Solana.
          Lock SOL, earn yield, and watch their future grow.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="text-base px-8 gap-2" asChild>
            <Link href="/app">
              Open dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base px-8" asChild>
            <a
              href="https://github.com/jonaskroeger26/Nest"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          Non-custodial. Open source. Your keys, your funds. Always.
        </p>
      </div>

      <div
        className="absolute inset-0 -z-10"
        style={{
          opacity: isInView ? 0.4 : 0,
          transition: "opacity 1s ease-out",
        }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/30 rounded-full blur-[150px]" />
      </div>
    </section>
  )
}

