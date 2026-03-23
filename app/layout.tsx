import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { AnalyticsClient } from "@/components/analytics-client"
import { AppProviders } from "@/components/app-providers"
import { RpcAvailabilityProvider } from "@/components/rpc-availability-gate"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "Nest - Secure Your Children's Future",
  description:
    "Lock and grow funds for your children's future milestones. College, first car, wedding - start building their dreams today.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body
        className={`${geist.className} antialiased`}
        style={{
          background: "oklch(0.98 0.005 150)",
          color: "oklch(0.20 0.02 240)",
        }}
      >
        <RpcAvailabilityProvider>
          <AppProviders>{children}</AppProviders>
        </RpcAvailabilityProvider>
        <AnalyticsClient />
      </body>
    </html>
  )
}
