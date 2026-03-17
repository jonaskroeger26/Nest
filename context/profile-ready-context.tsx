"use client"

import { createContext, useContext } from "react"

export const ProfileReadyContext = createContext(false)

export function useProfileReady() {
  return useContext(ProfileReadyContext)
}
