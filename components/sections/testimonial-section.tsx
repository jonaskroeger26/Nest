"use client"

import { useState, useEffect } from "react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

const testimonials = [
  {
    quote:
      "Nest changed how we think about our kids' futures. Locking SOL for Emma's college fund feels so much more tangible than a savings account.",
    author: "Sarah M.",
    role: "Mother of 2",
    location: "Austin, TX",
  },
  {
    quote:
      "My parents wanted to contribute to my son's future. With Nest, they can add to his goals directly. It's brought our family closer.",
    author: "James K.",
    role: "Father",
    location: "Miami, FL",
  },
  {
    quote:
      "The staking rewards are a game-changer. Our locked SOL is growing while we wait. It's like a high-yield savings account, but better.",
    author: "Michelle T.",
    role: "Mother of 3",
    location: "Seattle, WA",
  },
]

export function TestimonialSection() {
  const { ref, isInView } = useScrollAnimation({ threshold: 0.1, once: true })

  return (
    <section ref={ref} className="py-32 px-4 bg-secondary/20">
      <div className="max-w-6xl mx-auto">
        <p className="text-primary text-sm tracking-widest uppercase mb-8 text-center">
          From Our Families
        </p>
        <div
          className="grid gap-8 md:grid-cols-3"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(40px)",
            transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
          }}
        >
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.author}
              className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <blockquote className="text-sm md:text-base leading-relaxed text-foreground mb-4">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground text-sm">
                  {testimonial.author}
                </p>
                <p>
                  {testimonial.role} · {testimonial.location}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

