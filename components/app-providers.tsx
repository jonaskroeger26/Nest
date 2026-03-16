"use client"

import { useEffect } from "react"
import { Toaster } from "sonner"
import { useRouter, usePathname } from "next/navigation"
import { UserProvider, useUser } from "@/context/user-context"
import { ChildrenProvider, useChildren } from "@/context/children-context"
import { ActionsProvider, useActions } from "@/context/actions-context"
import { WalletProvider, useWallet } from "@/hooks/use-wallet"
import { AddSolDialog } from "@/components/dialogs/add-sol-dialog"
import { NewChildDialog } from "@/components/dialogs/new-child-dialog"
import { WithdrawDialog } from "@/components/dialogs/withdraw-dialog"
import { AutoSaveDialog } from "@/components/dialogs/auto-save-dialog"
import { GiftDialog } from "@/components/dialogs/gift-dialog"
import { AddGoalDialog } from "@/components/dialogs/add-goal-dialog"

function RedirectOnConnect() {
  const { connected } = useWallet()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (connected && pathname === "/") {
      router.push("/app")
    }
  }, [connected, pathname, router])

  return null
}

function ProfileHydrator() {
  const { address } = useWallet()
  const { setUserName } = useUser()
  const { setChildren } = useChildren()

  useEffect(() => {
    if (!address) return

    let cancelled = false

    async function loadProfile() {
      try {
        const res = await fetch(`/api/profile?wallet=${encodeURIComponent(address)}`)
        if (!res.ok) return
        const data = (await res.json()) as {
          name: string | null
          children: { child_wallet: string | null; child_name: string }[]
        }
        if (cancelled) return
        if (data.name) setUserName(data.name)
        if (Array.isArray(data.children)) {
          const mapped = data.children.map((c) => ({
            name: c.child_name,
            age: 0,
            avatar: `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(
              c.child_name
            )}`,
            totalSaved: 0,
            goals: [],
            beneficiaryAddress: c.child_wallet ?? undefined,
          }))
          setChildren(mapped)
        }
      } catch (e) {
        console.error("Failed to load profile", e)
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [address, setChildren, setUserName])

  return null
}

function ProfileAutosave() {
  const { address } = useWallet()
  const { userName } = useUser()
  const { children } = useChildren()

  useEffect(() => {
    if (!address) return

    async function saveProfile() {
      try {
        await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: address,
            name: userName,
            children: children.map((c) => ({
              child_wallet: c.beneficiaryAddress ?? null,
              child_name: c.name,
            })),
          }),
        })
      } catch (e) {
        console.error("Failed to save profile", e)
      }
    }

    saveProfile()
  }, [address, userName, children])

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
    <WalletProvider>
      <UserProvider>
        <ChildrenProvider>
          <ActionsProvider>
            <ProfileHydrator />
            <ProfileAutosave />
            <RedirectOnConnect />
            {children}
            <DialogRenderer />
            <Toaster position="bottom-center" richColors />
          </ActionsProvider>
        </ChildrenProvider>
      </UserProvider>
    </WalletProvider>
  )
}
