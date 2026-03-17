"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import {
  getConnection,
  getAllVaultsByBeneficiary,
  withdrawSolVault,
  withdrawTokenVault,
  MSOL_MINT_MAINNET,
  type AnyVaultInfo,
} from "@/lib/solana-vault"
import { PublicKey } from "@solana/web3.js"
import { toast } from "sonner"

function getSignTransaction(provider: {
  signTransaction: (t: unknown) => Promise<unknown>
}) {
  return async (tx: import("@solana/web3.js").Transaction) =>
    provider.signTransaction(tx) as Promise<import("@solana/web3.js").Transaction>
}

function vaultLabel(v: AnyVaultInfo): string {
  if (v.isToken) {
    return `${v.tokenAmountUi.toFixed(4)} mSOL`
  }
  return `${v.balanceSol.toFixed(4)} SOL`
}

function vaultKey(v: AnyVaultInfo): string {
  return v.isToken ? v.vaultAta : v.vaultPda
}

export function WithdrawDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { address } = useWallet()
  const [vaults, setVaults] = useState<AnyVaultInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !address) {
      setVaults([])
      return
    }
    setLoading(true)
    getConnection()
      .then((connection) =>
        getAllVaultsByBeneficiary(connection, new PublicKey(address))
      )
      .then((list) => {
        const now = Math.floor(Date.now() / 1000)
        // Only show unlocked vaults with a non-zero balance
        setVaults(
          list.filter((v) => {
            if (v.unlockTimestamp > now) return false
            if (v.isToken) return v.tokenAmount > 0n
            return v.balanceLamports > 0
          })
        )
      })
      .catch(() => setVaults([]))
      .finally(() => setLoading(false))
  }, [open, address])

  const handleWithdraw = async (v: AnyVaultInfo) => {
    if (!address) return
    const provider =
      typeof window !== "undefined"
        ? (
            window as unknown as {
              solana?: { signTransaction: (t: unknown) => Promise<unknown> }
            }
          ).solana
        : undefined
    if (!provider?.signTransaction) {
      toast.error("Wallet cannot sign")
      return
    }
    const key = vaultKey(v)
    setWithdrawing(key)
    try {
      const connection = await getConnection()
      const sign = getSignTransaction(provider)
      if (v.isToken) {
        await withdrawTokenVault(
          connection,
          new PublicKey(v.creator),
          new PublicKey(v.beneficiary),
          MSOL_MINT_MAINNET,
          sign
        )
        toast.success(
          `${v.tokenAmountUi.toFixed(4)} mSOL withdrawn to your wallet.`
        )
      } else {
        await withdrawSolVault(
          connection,
          new PublicKey(v.creator),
          new PublicKey(v.beneficiary),
          sign
        )
        toast.success(`${v.balanceSol.toFixed(4)} SOL withdrawn to your wallet.`)
      }
      setVaults((prev) => prev.filter((x) => vaultKey(x) !== key))
    } catch (e) {
      toast.error((e as Error).message?.slice(0, 80) ?? "Withdraw failed")
    } finally {
      setWithdrawing(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw unlocked funds</DialogTitle>
          <DialogDescription>
            Connect the <strong>child&apos;s wallet</strong> (the beneficiary). The program only
            allows that address to sign withdrawals after unlock — not the parent.
            SOL goes to the child wallet; mSOL to their mSOL token account.
          </DialogDescription>
        </DialogHeader>
        {!address ? (
          <p className="text-sm text-muted-foreground">
            Connect your wallet to see and withdraw from your vaults.
          </p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading vaults…</p>
        ) : vaults.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No unlocked vaults to withdraw. Unlock date must be in the past.
          </p>
        ) : (
          <ul className="space-y-3">
            {vaults.map((v) => {
              const key = vaultKey(v)
              return (
                <li
                  key={key}
                  className="flex items-center justify-between rounded-lg border bg-muted/50 p-3"
                >
                  <div>
                    <p className="font-medium">{vaultLabel(v)}</p>
                    <p className="text-xs text-muted-foreground">
                      From {v.creator.slice(0, 4)}…{v.creator.slice(-4)}
                      {v.isToken && (
                        <span className="ml-2 rounded bg-primary/10 px-1 py-0.5 text-primary">
                          mSOL
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleWithdraw(v)}
                    disabled={withdrawing !== null}
                  >
                    {withdrawing === key ? "Withdrawing…" : "Withdraw"}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
