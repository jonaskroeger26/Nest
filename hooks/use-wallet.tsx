"use client"

import {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
} from "react"

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean
      publicKey?: { toString: () => string }
      connect: (opts?: {
        onlyIfTrusted?: boolean
      }) => Promise<{ publicKey: { toString: () => string } }>
      disconnect: () => Promise<void>
      signMessage?: (
        message: Uint8Array | string,
        display?: "hex" | "utf8"
      ) => Promise<{ signature: Uint8Array; publicKey: Uint8Array }>
    }
    phantom?: { solana?: Window["solana"] }
  }
}

const SIGN_MESSAGE_PREFIX = "Sign in to Nest\n"

type WalletContextValue = {
  address: string | null
  isConnecting: boolean
  connected: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: React.ReactNode }) {
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
      const pubkey =
        res?.publicKey?.toString?.() ??
        (res as { publicKey?: { toString: () => string } })?.publicKey?.toString?.()
      if (!pubkey) {
        setIsConnecting(false)
        return
      }
      const message = new TextEncoder().encode(
        SIGN_MESSAGE_PREFIX + new Date().toISOString()
      )
      const sign =
        provider.signMessage ??
        (provider as { signMessage?: (m: Uint8Array) => Promise<unknown> })
          .signMessage
      if (sign) {
        await sign.call(provider, message, "utf8")
      }
      setAddress(pubkey)
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

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnecting,
        connected: !!address,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return ctx
}

