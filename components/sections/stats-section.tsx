"use client"

import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { useEffect, useState } from "react"

const stats = [
  { value: 100, suffix: "%", label: "Non-custodial" },
  { value: 0, suffix: "", label: "Platform fees" },
  { value: 18, suffix: "+", label: "Year lock options" },
  { value: 7.2, suffix: "%", label: "mSOL APY" },
]

function AnimatedNumber({
  value,
  suffix,
  isInView,
}: {
  value: number
  suffix: string
  isInView: boolean
}) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (!isInView) {
      setDisplayValue(0)
      return
    }

    const duration = 2000
    const steps = 60
    const increment = value / steps
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      current = Math.min(value, increment * step)
      setDisplayValue(current)

      if (step >= steps) {
        clearInterval(timer)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [isInView, value])

  const formattedValue =
    value % 1 === 0
      ? Math.round(displayValue).toLocaleString()
      : displayValue.toFixed(1)

  return (
    <span>
      {formattedValue}
      {suffix}
    </span>
  )
}

export function StatsSection() {
  const { ref, isInView } = useScrollAnimation({ threshold: 0.3, once: true })

  return (
    <section ref={ref} className="py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center transition-all duration-700"
              style={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? "translateY(0)" : "translateY(40px)",
                transitionDelay: `${index * 150}ms`,
              }}
            >
              <p className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2 text-primary">
                <AnimatedNumber
                  value={stat.value}
                  suffix={stat.suffix}
                  isInView={isInView}
                />
              </p>
              <p className="text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

