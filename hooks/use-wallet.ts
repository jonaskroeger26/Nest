"use client"

import { useState, useCallback, useEffect } from "react"

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean
      publicKey?: { toString: () => string }
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>
      disconnect: () => Promise<void>
    }
    phantom?: { solana?: Window["solana"] }
  }
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const connect = useCallback(async () => {
    const provider = window.solana ?? window.phantom?.solana
    if (!provider) {
      window.open("https://phantom.app/", "_blank")
      return
    }
    setIsConnecting(true)
    try {
      const res = await provider.connect({ onlyIfTrusted: false })
      const pubkey = res?.publicKey?.toString?.() ?? (res as { publicKey?: { toString: () => string } })?.publicKey?.toString?.()
      if (pubkey) setAddress(pubkey)
    } catch (e) {
      if ((e as { code?: number })?.code !== 4001) console.error(e)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      await window.solana?.disconnect?.()
      await window.phantom?.solana?.disconnect?.()
    } catch (_) {}
    setAddress(null)
  }, [])

  useEffect(() => {
    const provider = window.solana ?? window.phantom?.solana
    if (!provider?.publicKey) return
    setAddress(provider.publicKey.toString())
  }, [])

  return { address, isConnecting, connect, disconnect, connected: !!address }
}
