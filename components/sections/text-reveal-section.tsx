"use client"

import { useState, useEffect } from "react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

export function TextRevealSection() {
  const { ref, scrollProgress } = useScrollAnimation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const rawProgress = mounted ? scrollProgress : 0
  // Map scroll so:
  // - 0.0–0.1: all words stay faint
  // - 0.1–0.7: words fade in sequence from faint -> black
  // - 0.7–1.0: all words remain fully black
  const clamped =
    rawProgress <= 0.1
      ? 0
      : rawProgress >= 0.7
      ? 1
      : (rawProgress - 0.1) / (0.7 - 0.1)
  const safeProgress = clamped

  const words = [
    "Lock",
    "SOL",
    "today.",
    "Watch",
    "it",
    "grow.",
    "Gift",
    "them",
    "tomorrow.",
  ]

  return (
    <section
      ref={ref}
      id="how-it-works"
      className="min-h-[320vh] relative"
    >
      <div className="sticky top-0 h-screen flex items-center justify-center px-4">
        <p className="text-3xl md:text-5xl lg:text-6xl font-medium text-center max-w-5xl leading-tight text-balance">
          {words.map((word, index) => {
            // Stage reveal across full scroll:
            // - At top: all faint
            // - Each word fades from faint -> black in order
            // - At bottom: all fully black (last word finishes last)
            const total = words.length
            const progress = safeProgress * (total + 1)
            const local = progress - index

            let t = 0
            if (local <= 0) t = 0
            else if (local >= 1) t = 1
            else t = local

            const wordOpacity = 0.15 + t * 0.85

            return (
              <span
                key={index}
                className="inline-block mr-3 md:mr-4 transition-colors duration-300"
                style={{
                  opacity: wordOpacity,
                  color:
                    wordOpacity >= 0.95
                      ? "var(--foreground)"
                      : "var(--muted-foreground)",
                }}
              >
                {word}
              </span>
            )
          })}
        </p>
      </div>
    </section>
  )
}

