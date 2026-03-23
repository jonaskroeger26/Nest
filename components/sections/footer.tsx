"use client"

import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import Link from "next/link"
import { SiteNavLinks } from "@/components/site-nav-links"

const footerLinks = {
  Product: [
    { name: "Home", href: "/" },
    { name: "Dashboard", href: "/app" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Features", href: "#features" },
    { name: "FAQ", href: "#faq" },
  ],
  Resources: [
    { name: "Documentation", href: "https://docs.solana.com", external: true },
    { name: "Solana", href: "https://solana.com", external: true },
    { name: "Marinade", href: "https://marinade.finance", external: true },
    { name: "Helius", href: "https://helius.dev", external: true },
  ],
  Community: [
    { name: "GitHub", href: "https://github.com/jonaskroeger26/Nest", external: true },
    { name: "Twitter", href: "https://twitter.com/solana", external: true },
    { name: "Discord", href: "https://discord.gg/solana", external: true },
  ],
  Legal: [
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    { name: "Security", href: "/security" },
  ],
}

export function Footer() {
  const { ref, isInView } = useScrollAnimation({ threshold: 0.1, once: true })

  return (
    <footer ref={ref} className="border-t border-border py-16 px-4">
      <div
        className="max-w-7xl mx-auto transition-all duration-1000"
        style={{
          opacity: isInView ? 1 : 0,
          transform: isInView ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-2xl font-bold mb-4 text-primary block">
              Nest
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Securing your children's financial future on Solana. Non-custodial, transparent, and built for families.
            </p>
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Navigate
              </p>
              <SiteNavLinks layout="vertical" />
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-border gap-4">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              © 2026 Nest. Built on Solana. Open source on{" "}
              <a
                href="https://github.com/jonaskroeger26/Nest"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub
              </a>
              .
            </p>
            <p>
              Not financial, investment, or tax advice. Use Nest at your own risk. Smart contracts and crypto assets
              involve risk, including possible loss of funds.
            </p>
          </div>
          <div className="flex gap-6">
            <a
              href="https://twitter.com/solana"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Twitter
            </a>
            <a
              href="https://discord.gg/solana"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Discord
            </a>
            <a
              href="https://github.com/jonaskroeger26/Nest"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

