"use client"

import React, { createContext, useContext, useState, useCallback } from "react"

export interface Goal {
  name: string
  current: number
  target: number
  locked: boolean
  unlockDate: string
}

export interface Child {
  name: string
  age: number
  avatar: string
  totalSaved: number
  goals: Goal[]
  beneficiaryAddress?: string
}

type ChildrenContextType = {
  children: Child[]
  addChild: (child: Omit<Child, "goals" | "totalSaved"> & { goals?: Goal[] }) => void
  addGoal: (childName: string, goal: Goal) => void
  updateChildTotal: (childName: string, addAmount: number) => void
  setChildren: (items: Child[]) => void
  resetChildren: () => void
}

const ChildrenContext = createContext<ChildrenContextType | null>(null)

export function ChildrenProvider({ children: kids }: { children: React.ReactNode }) {
  const [children, setChildren] = useState<Child[]>([])

  const addChild = useCallback(
    (child: Omit<Child, "goals" | "totalSaved"> & { goals?: Goal[] }) => {
      setChildren((prev) => [
        ...prev,
        {
          ...child,
          goals: child.goals ?? [],
          totalSaved: 0,
        },
      ])
    },
    []
  )

  const addGoal = useCallback((childName: string, goal: Goal) => {
    setChildren((prev) =>
      prev.map((c) =>
        c.name === childName ? { ...c, goals: [...c.goals, goal] } : c
      )
    )
  }, [])

  const updateChildTotal = useCallback((childName: string, addAmount: number) => {
    setChildren((prev) =>
      prev.map((c) =>
        c.name === childName ? { ...c, totalSaved: c.totalSaved + addAmount } : c
      )
    )
  }, [])

  const setChildrenDirect = useCallback((items: Child[]) => {
    setChildren(items)
  }, [])

  const resetChildren = useCallback(() => {
    setChildren([])
  }, [])

  return (
    <ChildrenContext.Provider
      value={{
        children,
        addChild,
        addGoal,
        updateChildTotal,
        setChildren: setChildrenDirect,
        resetChildren,
      }}
    >
      {kids}
    </ChildrenContext.Provider>
  )
}

export function useChildren() {
  const ctx = useContext(ChildrenContext)
  if (!ctx) throw new Error("useChildren must be used within ChildrenProvider")
  return ctx
}
