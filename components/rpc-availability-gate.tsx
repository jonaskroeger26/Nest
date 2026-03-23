"use client"

import type { ReactNode } from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Button } from "@/components/ui/button"
import {
  clearCachedRpcUrl,
  isRpcConfigRateLimited,
  primeRpcUrlCache,
} from "@/lib/solana-vault"

type RpcAvailabilityContextValue = {
  reportRateLimited: (retryAfterSec: number) => void
  retryRpcProbe: () => Promise<void>
}

const RpcAvailabilityContext =
  createContext<RpcAvailabilityContextValue | null>(null)

export function useRpcAvailability(): RpcAvailabilityContextValue {
  const ctx = useContext(RpcAvailabilityContext)
  if (!ctx) {
    throw new Error(
      "useRpcAvailability must be used within RpcAvailabilityProvider"
    )
  }
  return ctx
}

/** For dialogs that may mount in unusual trees; no-op if outside provider. */
export function useRpcAvailabilityOptional(): RpcAvailabilityContextValue | null {
  return useContext(RpcAvailabilityContext)
}

/** Call from catch blocks; returns true if error was RPC 429 (and UI was triggered). */
export function notifyRpcRateLimitedIfNeeded(
  e: unknown,
  reportRateLimited: ((sec: number) => void) | null | undefined
): boolean {
  if (!reportRateLimited || !isRpcConfigRateLimited(e)) return false
  clearCachedRpcUrl()
  reportRateLimited(e.retryAfterSec)
  return true
}

type Status = "checking" | "ok" | "limited"

function RateLimitFullPage({
  retryAfterSec,
  onRetry,
}: {
  retryAfterSec: number
  onRetry: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Too many requests
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Nest temporarily limits how often this browser can load the Solana RPC
          configuration. This protects the app from abuse. Try again in about{" "}
          <span className="font-medium text-foreground">{retryAfterSec}s</span>
          .
        </p>
        <Button type="button" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      </div>
    </div>
  )
}

/**
 * First paint: probe `/api/solana-rpc` once, prime URL cache, or block the whole site on 429.
 * Also exposes `reportRateLimited` when a later `getConnection()` hits 429 (cache miss / race).
 */
export function RpcAvailabilityProvider({
  children,
}: {
  children: ReactNode
}) {
  const [status, setStatus] = useState<Status>("checking")
  const [retryAfterSec, setRetryAfterSec] = useState(60)

  const runProbe = useCallback(async () => {
    setStatus("checking")
    try {
      const res = await fetch(`/api/solana-rpc?__gate=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })
      const data = (await res.json().catch(() => ({}))) as {
        url?: string
        retryAfterSec?: number
      }
      if (res.status === 429) {
        clearCachedRpcUrl()
        setRetryAfterSec(
          typeof data.retryAfterSec === "number" ? data.retryAfterSec : 60
        )
        setStatus("limited")
        return
      }
      if (res.ok && typeof data.url === "string" && data.url.length > 0) {
        primeRpcUrlCache(data.url)
        setStatus("ok")
        return
      }
      // Misconfig (e.g. mainnet RPC missing): still show app; route returns error JSON
      clearCachedRpcUrl()
      setStatus("ok")
    } catch {
      clearCachedRpcUrl()
      setStatus("ok")
    }
  }, [])

  useEffect(() => {
    void runProbe()
  }, [runProbe])

  const reportRateLimited = useCallback((sec: number) => {
    clearCachedRpcUrl()
    setRetryAfterSec(Number.isFinite(sec) && sec > 0 ? Math.ceil(sec) : 60)
    setStatus("limited")
  }, [])

  const value = useMemo(
    () => ({
      reportRateLimited,
      retryRpcProbe: runProbe,
    }),
    [reportRateLimited, runProbe]
  )

  if (status === "checking") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground text-sm animate-pulse">Loading…</p>
      </div>
    )
  }

  if (status === "limited") {
    return (
      <RateLimitFullPage
        retryAfterSec={retryAfterSec}
        onRetry={() => {
          clearCachedRpcUrl()
          void runProbe()
        }}
      />
    )
  }

  return (
    <RpcAvailabilityContext.Provider value={value}>
      {children}
    </RpcAvailabilityContext.Provider>
  )
}
