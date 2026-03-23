"use client"

import Link from "next/link"
import { Bird, Sparkles } from "lucide-react"
import { SiteNavLinks } from "@/components/site-nav-links"
import { Button } from "@/components/ui/button"

/** Sticky top bar on the marketing homepage: brand + Home/Dashboard + tour CTA. */
export function MarketingTopBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Bird className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Nest</span>
        </Link>

        <div className="hidden flex-1 justify-center sm:flex">
          <SiteNavLinks />
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial">
          <SiteNavLinks className="sm:hidden" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 sm:hidden"
            aria-label="How it works tour"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("nest-open-assistant", {
                  detail: { tab: "tour" as const },
                })
              )
            }}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden gap-1.5 sm:inline-flex"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("nest-open-assistant", {
                  detail: { tab: "tour" as const },
                })
              )
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Tour
          </Button>
        </div>
      </div>
    </header>
  )
}
