"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type Ctx = {
  reloadNonce: number
  reloadProfileFromChain: () => void
}

const ProfileReloadContext = createContext<Ctx | null>(null)

export function ProfileReloadProvider({ children }: { children: ReactNode }) {
  const [reloadNonce, setReloadNonce] = useState(0)
  const reloadProfileFromChain = useCallback(() => {
    setReloadNonce((n) => n + 1)
  }, [])
  const value = useMemo(
    () => ({ reloadNonce, reloadProfileFromChain }),
    [reloadNonce, reloadProfileFromChain]
  )
  return (
    <ProfileReloadContext.Provider value={value}>
      {children}
    </ProfileReloadContext.Provider>
  )
}

export function useProfileReload() {
  const ctx = useContext(ProfileReloadContext)
  if (!ctx) {
    throw new Error("useProfileReload must be used within ProfileReloadProvider")
  }
  return ctx
}
