"use client"

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react"
import { useWallet } from "@/hooks/use-wallet"
import { saveChildGoalsForWallet } from "@/lib/child-local-storage"

export interface Goal {
  id?: string
  name: string
  current: number
  target: number
  locked: boolean
  /** ISO `yyyy-MM-dd` (preferred) or legacy text like "Sep 2028" */
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

function newGoalId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Match goal by stable id or list index (legacy goals without id). */
export type GoalCreditRef = { id?: string; index?: number }

type ChildrenContextType = {
  children: Child[]
  addChild: (child: Omit<Child, "goals" | "totalSaved"> & { goals?: Goal[] }) => void
  addGoal: (childName: string, goal: Goal) => void
  updateChildTotal: (childName: string, addAmount: number) => void
  /** Add USD progress to a goal after an on-chain lock (uses SOL × price). */
  creditGoalLock: (
    childName: string,
    ref: GoalCreditRef,
    amountUsd: number
  ) => void
  setChildren: (items: Child[]) => void
  resetChildren: () => void
}

const ChildrenContext = createContext<ChildrenContextType | null>(null)

export function ChildrenProvider({ children: kids }: { children: React.ReactNode }) {
  const { address } = useWallet()
  const [children, setChildren] = useState<Child[]>([])

  const addChild = useCallback(
    (child: Omit<Child, "goals" | "totalSaved"> & { goals?: Goal[] }) => {
      setChildren((prev) => [
        ...prev,
        {
          ...child,
          goals: (child.goals ?? []).map((g) => ({
            ...g,
            id: g.id ?? newGoalId(),
          })),
          totalSaved: 0,
        },
      ])
    },
    []
  )

  const addGoal = useCallback((childName: string, goal: Goal) => {
    const withId: Goal = { ...goal, id: goal.id ?? newGoalId() }
    setChildren((prev) =>
      prev.map((c) =>
        c.name === childName ? { ...c, goals: [...c.goals, withId] } : c
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

  const creditGoalLock = useCallback(
    (childName: string, ref: GoalCreditRef, amountUsd: number) => {
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) return
      const hasRef =
        (ref.id != null && ref.id !== "") || ref.index != null
      if (!hasRef) return
      setChildren((prev) =>
        prev.map((c) => {
          if (c.name !== childName) return c
          return {
            ...c,
            goals: c.goals.map((g, i) => {
              const byId = ref.id != null && ref.id !== "" && g.id === ref.id
              const byIdx = ref.index != null && ref.index === i
              if (!byId && !byIdx) return g
              return {
                ...g,
                id: g.id ?? newGoalId(),
                current: g.current + amountUsd,
              }
            }),
          }
        })
      )
    },
    []
  )

  const setChildrenDirect = useCallback((items: Child[]) => {
    setChildren(items)
  }, [])

  const resetChildren = useCallback(() => {
    setChildren([])
  }, [])

  // Persist goals whenever the list changes (skip empty profile = wallet switch / loading).
  useEffect(() => {
    if (!address) return
    if (children.length === 0) return
    saveChildGoalsForWallet(
      address,
      children.map((c) => ({
        name: c.name,
        goals: c.goals.map((g) => ({
          id: g.id,
          name: g.name,
          current: g.current,
          target: g.target,
          locked: g.locked,
          unlockDate: g.unlockDate,
        })),
      }))
    )
  }, [address, children])

  return (
    <ChildrenContext.Provider
      value={{
        children,
        addChild,
        addGoal,
        updateChildTotal,
        creditGoalLock,
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
