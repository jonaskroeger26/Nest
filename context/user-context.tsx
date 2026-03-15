"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"

const STORAGE_KEY = "nest-user-name"

type UserContextType = {
  userName: string | null
  setUserName: (name: string | null) => void
}

const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserNameState] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setUserNameState(stored)
    } catch (_) {}
  }, [])

  const setUserName = useCallback((name: string | null) => {
    setUserNameState(name)
    try {
      if (name) localStorage.setItem(STORAGE_KEY, name)
      else localStorage.removeItem(STORAGE_KEY)
    } catch (_) {}
  }, [])

  return (
    <UserContext.Provider value={{ userName, setUserName }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useUser must be used within UserProvider")
  return ctx
}
