"use client"

import React, { createContext, useContext, useState, useCallback } from "react"

type DialogType =
  | "addSol"
  | "newChild"
  | "withdraw"
  | "autoSave"
  | "gift"
  | "addGoal"
  | null

type ActionsContextType = {
  dialog: DialogType
  addGoalChildName: string | null
  openAddSol: () => void
  openNewChild: () => void
  openWithdraw: () => void
  openAutoSave: () => void
  openGift: () => void
  openAddGoal: (childName: string) => void
  closeDialog: () => void
}

const ActionsContext = createContext<ActionsContextType | null>(null)

export function ActionsProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogType>(null)
  const [addGoalChildName, setAddGoalChildName] = useState<string | null>(null)

  const openAddSol = useCallback(() => setDialog("addSol"), [])
  const openNewChild = useCallback(() => setDialog("newChild"), [])
  const openWithdraw = useCallback(() => setDialog("withdraw"), [])
  const openAutoSave = useCallback(() => setDialog("autoSave"), [])
  const openGift = useCallback(() => setDialog("gift"), [])
  const openAddGoal = useCallback((childName: string) => {
    setAddGoalChildName(childName)
    setDialog("addGoal")
  }, [])
  const closeDialog = useCallback(() => {
    setDialog(null)
    setAddGoalChildName(null)
  }, [])

  return (
    <ActionsContext.Provider
      value={{
        dialog,
        addGoalChildName,
        openAddSol,
        openNewChild,
        openWithdraw,
        openAutoSave,
        openGift,
        openAddGoal,
        closeDialog,
      }}
    >
      {children}
    </ActionsContext.Provider>
  )
}

export function useActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useActions must be used within ActionsProvider")
  return ctx
}
