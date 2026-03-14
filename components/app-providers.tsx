"use client"

import { Toaster } from "sonner"
import { ChildrenProvider } from "@/context/children-context"
import { ActionsProvider, useActions } from "@/context/actions-context"
import { AddSolDialog } from "@/components/dialogs/add-sol-dialog"
import { NewChildDialog } from "@/components/dialogs/new-child-dialog"
import { WithdrawDialog } from "@/components/dialogs/withdraw-dialog"
import { AutoSaveDialog } from "@/components/dialogs/auto-save-dialog"
import { GiftDialog } from "@/components/dialogs/gift-dialog"
import { AddGoalDialog } from "@/components/dialogs/add-goal-dialog"

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
    <ChildrenProvider>
      <ActionsProvider>
        {children}
        <DialogRenderer />
        <Toaster position="bottom-center" richColors />
      </ActionsProvider>
    </ChildrenProvider>
  )
}
