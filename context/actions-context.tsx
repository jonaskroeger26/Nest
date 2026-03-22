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

/** Pre-select a goal in Add SOL (by id, or list index if no id yet). */
export type LockGoalRef = { goalId?: string; goalIndex?: number }

type ActionsContextType = {
  dialog: DialogType
  addGoalChildName: string | null
  /** Pre-select child in Add SOL by registered wallet (from child card) */
  lockForChildBeneficiary: string | null
  /** Pre-select goal row when opening Add SOL from a goal */
  lockGoalRef: LockGoalRef | null
  /** Pre-select child in Auto-save by beneficiary wallet (from child card) */
  autoSaveBeneficiary: string | null
  openAddSol: () => void
  openAddSolForChild: (
    childBeneficiaryAddress: string,
    goal?: LockGoalRef | null
  ) => void
  openNewChild: () => void
  openWithdraw: () => void
  openAutoSave: () => void
  openAutoSaveForChild: (childBeneficiaryAddress: string) => void
  openGift: () => void
  openAddGoal: (childName: string) => void
  closeDialog: () => void
}

const ActionsContext = createContext<ActionsContextType | null>(null)

export function ActionsProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogType>(null)
  const [addGoalChildName, setAddGoalChildName] = useState<string | null>(null)
  const [lockForChildBeneficiary, setLockForChildBeneficiary] = useState<
    string | null
  >(null)
  const [lockGoalRef, setLockGoalRef] = useState<LockGoalRef | null>(null)
  const [autoSaveBeneficiary, setAutoSaveBeneficiary] = useState<string | null>(
    null
  )

  const openAddSol = useCallback(() => {
    setLockForChildBeneficiary(null)
    setLockGoalRef(null)
    setDialog("addSol")
  }, [])
  const openAddSolForChild = useCallback(
    (childBeneficiaryAddress: string, goal?: LockGoalRef | null) => {
      setLockForChildBeneficiary(childBeneficiaryAddress.trim())
      setLockGoalRef(goal && (goal.goalId || goal.goalIndex != null) ? goal : null)
      setDialog("addSol")
    },
    []
  )
  const openNewChild = useCallback(() => setDialog("newChild"), [])
  const openWithdraw = useCallback(() => setDialog("withdraw"), [])
  const openAutoSave = useCallback(() => {
    setAutoSaveBeneficiary(null)
    setDialog("autoSave")
  }, [])
  const openAutoSaveForChild = useCallback((childBeneficiaryAddress: string) => {
    setAutoSaveBeneficiary(childBeneficiaryAddress.trim())
    setDialog("autoSave")
  }, [])
  const openGift = useCallback(() => setDialog("gift"), [])
  const openAddGoal = useCallback((childName: string) => {
    setAddGoalChildName(childName)
    setDialog("addGoal")
  }, [])
  const closeDialog = useCallback(() => {
    setDialog(null)
    setAddGoalChildName(null)
    setLockForChildBeneficiary(null)
    setLockGoalRef(null)
    setAutoSaveBeneficiary(null)
  }, [])

  return (
    <ActionsContext.Provider
      value={{
        dialog,
        addGoalChildName,
        lockForChildBeneficiary,
        lockGoalRef,
        autoSaveBeneficiary,
        openAddSol,
        openAddSolForChild,
        openNewChild,
        openWithdraw,
        openAutoSave,
        openAutoSaveForChild,
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
