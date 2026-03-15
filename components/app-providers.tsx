"use client"

import { useEffect, useRef } from "react"
import { Toaster } from "sonner"
import { UserProvider } from "@/context/user-context"
import { ChildrenProvider, useChildren } from "@/context/children-context"
import { ActionsProvider, useActions } from "@/context/actions-context"
import { useWallet } from "@/hooks/use-wallet"
import { AddSolDialog } from "@/components/dialogs/add-sol-dialog"
import { NewChildDialog } from "@/components/dialogs/new-child-dialog"
import { WithdrawDialog } from "@/components/dialogs/withdraw-dialog"
import { AutoSaveDialog } from "@/components/dialogs/auto-save-dialog"
import { GiftDialog } from "@/components/dialogs/gift-dialog"
import { AddGoalDialog } from "@/components/dialogs/add-goal-dialog"

function ClearDataOnConnect() {
  const { address } = useWallet()
  const { resetChildren } = useChildren()
  const prevAddress = useRef<string | null>(null)
  useEffect(() => {
    if (address && !prevAddress.current) resetChildren()
    prevAddress.current = address ?? null
  }, [address, resetChildren])
  return null
}

function DialogRenderer() {
  const { dialog, addGoalChildName, closeDialog } = useActions()
  return (
    <>
      <AddSolDialog open={dialog === "addSol"} onClose={closeDialog} />
      <NewChildDialog open={dialog === "newChild"} onClose={closeDialog} />
      <WithdrawDialog open={dialog === "withdraw"} onClose={closeDialog} />
      <AutoSaveDialog open={dialog === "autoSave"} onClose={closeDialog} />
      <GiftDialog open={dialog === "gift"} onClose={closeDialog} />
      <AddGoalDialog
        open={dialog === "addGoal"}
        onClose={closeDialog}
        childName={addGoalChildName}
      />
    </>
  )
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <ChildrenProvider>
        <ActionsProvider>
          <ClearDataOnConnect />
          {children}
          <DialogRenderer />
          <Toaster position="bottom-center" richColors />
        </ActionsProvider>
      </ChildrenProvider>
    </UserProvider>
  )
}
