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
  getVaultsByBeneficiary,
  withdrawSolVault,
  type VaultInfo,
} from "@/lib/solana-vault"
import { PublicKey } from "@solana/web3.js"
import { toast } from "sonner"

export function WithdrawDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { address } = useWallet()
  const [vaults, setVaults] = useState<VaultInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !address) {
      setVaults([])
      return
    }
    setLoading(true)
    getConnection()
      .then((connection) => getVaultsByBeneficiary(connection, new PublicKey(address)))
      .then((list) => {
        const now = Math.floor(Date.now() / 1000)
        setVaults(list.filter((v) => v.unlockTimestamp <= now && v.balanceLamports > 0))
      })
      .catch(() => setVaults([]))
      .finally(() => setLoading(false))
  }, [open, address])

  const handleWithdraw = async (v: VaultInfo) => {
    if (!address) return
    const provider =
      (typeof window !== "undefined" && (window as unknown as { solana?: { signTransaction: (t: unknown) => Promise<unknown> } }).solana)
    if (!provider?.signTransaction) {
      toast.error("Wallet cannot sign")
      return
    }
    setWithdrawing(v.vaultPda)
    try {
      const connection = await getConnection()
      await withdrawSolVault(
        connection,
        new PublicKey(v.creator),
        new PublicKey(v.beneficiary),
        async (tx) => provider.signTransaction(tx) as Promise<import("@solana/web3.js").Transaction>
      )
      toast.success(`${v.balanceSol.toFixed(4)} SOL withdrawn to your wallet.`)
      setVaults((prev) => prev.filter((x) => x.vaultPda !== v.vaultPda))
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
            Vaults where you are the beneficiary and the unlock date has passed. SOL is sent to your connected wallet.
          </DialogDescription>
        </DialogHeader>
        {!address ? (
          <p className="text-sm text-muted-foreground">Connect your wallet to see and withdraw from your vaults.</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading vaults…</p>
        ) : vaults.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unlocked vaults to withdraw. Unlock date must be in the past.</p>
        ) : (
          <ul className="space-y-3">
            {vaults.map((v) => (
              <li
                key={v.vaultPda}
                className="flex items-center justify-between rounded-lg border bg-muted/50 p-3"
              >
                <div>
                  <p className="font-medium">{v.balanceSol.toFixed(4)} SOL</p>
                  <p className="text-xs text-muted-foreground">
                    From {v.creator.slice(0, 4)}…{v.creator.slice(-4)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleWithdraw(v)}
                  disabled={withdrawing !== null}
                >
                  {withdrawing === v.vaultPda ? "Withdrawing…" : "Withdraw"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
