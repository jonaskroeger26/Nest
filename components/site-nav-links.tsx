"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

function navLinkClass(active: boolean) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
    active
      ? "bg-primary/12 text-primary"
      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
  )
}

export function SiteNavLinks({
  className,
  layout = "horizontal",
}: {
  className?: string
  /** `vertical` stacks links (e.g. footer column). */
  layout?: "horizontal" | "vertical"
}) {
  const pathname = usePathname()
  const homeActive = pathname === "/"
  const dashboardActive =
    pathname === "/app" || (pathname?.startsWith("/app/") ?? false)

  return (
    <nav
      className={cn(
        layout === "vertical" ? "flex flex-col gap-1" : "flex items-center gap-1",
        className
      )}
      aria-label="Site"
    >
      <Link href="/" className={navLinkClass(homeActive)} prefetch>
        <Home className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <span>Home</span>
      </Link>
      <Link href="/app" className={navLinkClass(dashboardActive)} prefetch>
        <LayoutDashboard className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <span>Dashboard</span>
      </Link>
    </nav>
  )
}
