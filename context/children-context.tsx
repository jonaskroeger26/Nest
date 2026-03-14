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

const initialChildren: Child[] = [
  {
    name: "Emma",
    age: 17,
    avatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=emma",
    totalSaved: 20500,
    goals: [
      { name: "College Fund", current: 15000, target: 50000, locked: true, unlockDate: "Sep 2028" },
      { name: "18th Birthday", current: 5500, target: 5000, locked: true, unlockDate: "Aug 2026" },
    ],
  },
  {
    name: "Liam",
    age: 14,
    avatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=liam",
    totalSaved: 14750,
    goals: [
      { name: "First Car", current: 6250, target: 12000, locked: true, unlockDate: "Dec 2027" },
      { name: "Summer Camp", current: 2500, target: 3000, locked: false, unlockDate: "Jun 2026" },
      { name: "College Fund", current: 6000, target: 40000, locked: true, unlockDate: "Sep 2030" },
    ],
  },
  {
    name: "Sophia",
    age: 8,
    avatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=sophia",
    totalSaved: 12000,
    goals: [
      { name: "Education Fund", current: 8000, target: 30000, locked: true, unlockDate: "Sep 2036" },
      { name: "Future Home", current: 4000, target: 25000, locked: true, unlockDate: "Jun 2035" },
    ],
  },
]

type ChildrenContextType = {
  children: Child[]
  addChild: (child: Omit<Child, "goals" | "totalSaved"> & { goals?: Goal[] }) => void
  addGoal: (childName: string, goal: Goal) => void
  updateChildTotal: (childName: string, addAmount: number) => void
}

const ChildrenContext = createContext<ChildrenContextType | null>(null)

export function ChildrenProvider({ children: kids }: { children: React.ReactNode }) {
  const [children, setChildren] = useState<Child[]>(initialChildren)

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

  return (
    <ChildrenContext.Provider
      value={{ children, addChild, addGoal, updateChildTotal }}
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
