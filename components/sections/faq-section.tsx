"use client"

import { useState } from "react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "How does Nest secure my SOL?",
    answer:
      "Nest uses non-custodial smart contracts on Solana. You maintain full ownership of your keys and funds at all times. The time-lock mechanism is enforced by the blockchain itself, not by Nest.",
  },
  {
    question: "Can I earn yield on my locked SOL?",
    answer:
      "Yes! You can choose to stake your locked SOL as mSOL through Marinade Finance. Your SOL earns staking rewards while remaining locked until the unlock date you set.",
  },
  {
    question: "What happens when my child reaches the unlock date?",
    answer:
      "On the unlock date, the funds become available for withdrawal. You can transfer the SOL to your child's wallet, or keep it locked with a new date if plans change.",
  },
  {
    question: "Can family members contribute to my child's goals?",
    answer:
      "Absolutely! Share a simple contribution link with grandparents, aunts, uncles, or anyone who wants to help. They can contribute SOL directly to specific goals.",
  },
  {
    question: "Is there a minimum amount to lock?",
    answer:
      "No minimum. You can start with any amount of SOL. We recommend consistent contributions over time to take advantage of dollar-cost averaging and compound growth.",
  },
  {
    question: "What if I need access to the funds in an emergency?",
    answer:
      "Time-locked funds are designed to be immutable for security. However, you can set up multiple goals with different time horizons. We recommend keeping an emergency fund separate from Nest.",
  },
]

export function FAQSection() {
  const { ref, isInView } = useScrollAnimation({ threshold: 0.1, once: true })
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" ref={ref} className="py-32 px-4">
      <div className="max-w-3xl mx-auto">
        <div
          className="text-center mb-16 transition-all duration-1000"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(40px)",
          }}
        >
          <p className="text-primary text-sm tracking-widest uppercase mb-4">
            FAQ
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Common questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about securing your children's future with Nest.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-border rounded-xl overflow-hidden transition-all duration-700"
              style={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${index * 100}ms`,
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-secondary/50 transition-colors"
              >
                <span className="font-semibold text-lg pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-300 flex-shrink-0 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  maxHeight: openIndex === index ? "200px" : "0",
                  opacity: openIndex === index ? 1 : 0,
                }}
              >
                <p className="px-6 pb-6 text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

