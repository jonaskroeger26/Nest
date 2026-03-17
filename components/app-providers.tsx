"use client"

import { useEffect, useState, useRef } from "react"
import { PublicKey } from "@solana/web3.js"
import { Toaster } from "sonner"
import { useRouter, usePathname } from "next/navigation"
import { UserProvider, useUser } from "@/context/user-context"
import { ChildrenProvider, useChildren } from "@/context/children-context"
import { VaultBalancesProvider } from "@/context/vault-balances-context"
import { ProfileReadyContext } from "@/context/profile-ready-context"
import { ProfileReloadProvider, useProfileReload } from "@/context/profile-reload-context"
import { ActionsProvider, useActions } from "@/context/actions-context"
import { WalletProvider, useWallet } from "@/hooks/use-wallet"
import { AddSolDialog } from "@/components/dialogs/add-sol-dialog"
import { NewChildDialog } from "@/components/dialogs/new-child-dialog"
import { WithdrawDialog } from "@/components/dialogs/withdraw-dialog"
import { AutoSaveDialog } from "@/components/dialogs/auto-save-dialog"
import { GiftDialog } from "@/components/dialogs/gift-dialog"
import { AddGoalDialog } from "@/components/dialogs/add-goal-dialog"
import {
  getConnection,
  fetchParentDisplayNameFromChain,
  fetchRegisteredChildrenFromChain,
} from "@/lib/solana-vault"

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

/**
 * Parent name + children: load from on-chain (kids-vault program) when available;
 * fall back to Supabase for legacy profiles. Each lock / register_child is its own tx.
 */
function ProfileGate({ children }: { children: React.ReactNode }) {
  const { address } = useWallet()
  const { setUserName, userName } = useUser()
  const { setChildren, children: savedChildren } = useChildren()
  const { reloadNonce } = useProfileReload()
  const [hydrated, setHydrated] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const prevAddressRef = useRef<string | null>(null)

  useEffect(() => {
    if (!address) {
      prevAddressRef.current = null
      setHydrated(false)
      setProfileReady(false)
      return
    }

    const addressChanged = prevAddressRef.current !== address
    prevAddressRef.current = address
    const isInitialOrWalletSwitch = addressChanged || reloadNonce === 0

    if (addressChanged) {
      setChildren([])
      setHydrated(false)
      setProfileReady(false)
    }

    let cancelled = false

    ;(async () => {
      try {
        const connection = await getConnection()
        const parentPk = new PublicKey(address)
        const [onChainName, chainChildren] = await Promise.all([
          fetchParentDisplayNameFromChain(connection, parentPk).catch(() => null),
          fetchRegisteredChildrenFromChain(connection, parentPk),
        ])
        if (cancelled) return

        const res = await fetch(
          `/api/profile?wallet=${encodeURIComponent(address)}`
        )
        const api = res.ok
          ? ((await res.json()) as {
              name: string | null
              children: { child_wallet: string | null; child_name: string }[]
            })
          : { name: null, children: [] as { child_wallet: string | null; child_name: string }[] }
        if (cancelled) return

        const name = onChainName ?? api.name ?? null
        if (name) setUserName(name)

        if (chainChildren.length > 0) {
          setChildren(
            chainChildren.map((c) => ({
              name: c.name,
              age: 0,
              avatar: `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(c.name)}`,
              totalSaved: 0,
              goals: [],
              beneficiaryAddress: c.beneficiary,
            }))
          )
        } else if (isInitialOrWalletSwitch && Array.isArray(api.children)) {
          setChildren(
            api.children.map((c) => ({
              name: c.child_name,
              age: 0,
              avatar: `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(
                c.child_name
              )}`,
              totalSaved: 0,
              goals: [],
              beneficiaryAddress: c.child_wallet ?? undefined,
            }))
          )
        }
      } catch (e) {
        console.error("Failed to load profile", e)
      } finally {
        if (!cancelled) {
          setHydrated(true)
          setProfileReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [address, reloadNonce, setChildren, setUserName])

  useEffect(() => {
    if (!address || !hydrated) return
    ;(async () => {
      try {
        await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: address,
            name: userName,
            children: savedChildren.map((c) => ({
              child_wallet: c.beneficiaryAddress ?? null,
              child_name: c.name,
            })),
          }),
        })
      } catch (e) {
        console.error("Failed to save profile", e)
      }
    })()
  }, [address, userName, savedChildren, hydrated])

  const ready = !address || profileReady
  return (
    <ProfileReadyContext.Provider value={ready}>{children}</ProfileReadyContext.Provider>
  )
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
      <VaultBalancesProvider>
        <UserProvider>
          <ChildrenProvider>
            <ProfileReloadProvider>
              <ProfileGate>
                <ActionsProvider>
                  <RedirectOnConnect />
                  {children}
                  <DialogRenderer />
                  <Toaster position="bottom-center" richColors />
                </ActionsProvider>
              </ProfileGate>
            </ProfileReloadProvider>
          </ChildrenProvider>
        </UserProvider>
      </VaultBalancesProvider>
    </WalletProvider>
  )
}
