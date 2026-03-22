"use client"

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react"
import type { NestUserAvatar } from "@/lib/nest-avatar"
import { isNestAvatarStyle } from "@/lib/nest-avatar"

const STORAGE_NAME = "nest-user-name"
const STORAGE_AVATAR = "nest_user_avatar_v1"

type UserContextType = {
  userName: string | null
  setUserName: (name: string | null) => void
  userAvatar: NestUserAvatar | null
  setUserAvatar: (avatar: NestUserAvatar | null) => void
}

const UserContext = createContext<UserContextType | null>(null)

function loadAvatar(): NestUserAvatar | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_AVATAR)
    if (!raw) return null
    const o = JSON.parse(raw) as { style?: string; seed?: string }
    if (!o || typeof o.seed !== "string" || !o.style) return null
    if (!isNestAvatarStyle(o.style)) return null
    return { style: o.style, seed: o.seed }
  } catch {
    return null
  }
}

function saveAvatar(avatar: NestUserAvatar | null) {
  try {
    if (!avatar) localStorage.removeItem(STORAGE_AVATAR)
    else localStorage.setItem(STORAGE_AVATAR, JSON.stringify(avatar))
  } catch {
    /* ignore */
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserNameState] = useState<string | null>(null)
  const [userAvatar, setUserAvatarState] = useState<NestUserAvatar | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(STORAGE_NAME)
      if (stored) setUserNameState(stored)
    } catch (_) {
      /* ignore */
    }
    setUserAvatarState(loadAvatar())
  }, [])

  const setUserName = useCallback((name: string | null) => {
    setUserNameState(name)
    try {
      if (name) localStorage.setItem(STORAGE_NAME, name)
      else localStorage.removeItem(STORAGE_NAME)
    } catch (_) {
      /* ignore */
    }
  }, [])

  const setUserAvatar = useCallback((avatar: NestUserAvatar | null) => {
    setUserAvatarState(avatar)
    saveAvatar(avatar)
  }, [])

  return (
    <UserContext.Provider
      value={{ userName, setUserName, userAvatar, setUserAvatar }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useUser must be used within UserProvider")
  return ctx
}
