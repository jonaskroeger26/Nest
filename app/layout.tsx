import type { Metadata } from "next"
import type { ReactNode } from "react"
import { RpcAvailabilityProvider } from "@/components/rpc-availability-gate"

export const metadata: Metadata = {
  title: "Nest — Secure your children's future",
  description:
    "Time-lock SOL or mSOL on Solana for your kids until the date you choose.",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <RpcAvailabilityProvider>{children}</RpcAvailabilityProvider>
      </body>
    </html>
  )
}
