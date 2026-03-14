'use client'

import dynamic from 'next/dynamic'

const Analytics = dynamic(
  () => import('@vercel/analytics/next').then((m) => m.Analytics).catch(() => () => null),
  { ssr: false }
)

export function AnalyticsClient() {
  return <Analytics />
}
