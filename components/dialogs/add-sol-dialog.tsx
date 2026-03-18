"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet } from "@/hooks/use-wallet"
import { useChildren } from "@/context/children-context"
import { useActions } from "@/context/actions-context"
import { useMarinadeApy } from "@/hooks/use-marinade-apy"
import { getConnection, createSolVault, createMsolVault } from "@/lib/solana-vault"
import { signTransactionWithBrowserWallet } from "@/lib/wallet-sign"
import { solanaTxUrl } from "@/lib/solana-explorer"
import { isMainnetVaults } from "@/lib/solana-config"
import { useVaultBalances } from "@/context/vault-balances-context"
import { PublicKey } from "@solana/web3.js"
import { toast } from "sonner"

export function AddSolDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { address, connect } = useWallet()
  const { children, updateChildTotal } = useChildren()
  const { lockForChildBeneficiary } = useActions()
  const { refresh: refreshVaults } = useVaultBalances()
  const marinadeApy = useMarinadeApy()
  const [selectedIdx, setSelectedIdx] = useState<number | "">("")
  const [amount, setAmount] = useState("")
  const [unlockDate, setUnlockDate] = useState("")
  const [lockAsMsol, setLockAsMsol] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setError("")
    setAmount("")
    setUnlockDate("")
    if (lockForChildBeneficiary) {
      const idx = children.findIndex(
        (x) =>
          (x.beneficiaryAddress?.trim() ?? "") === lockForChildBeneficiary
      )
      setSelectedIdx(idx >= 0 ? idx : "")
    } else {
      setSelectedIdx("")
    }
  }, [open, lockForChildBeneficiary, children])

  useEffect(() => {
    if (!open || !lockForChildBeneficiary || children.length === 0) return
    const idx = children.findIndex(
      (x) => (x.beneficiaryAddress?.trim() ?? "") === lockForChildBeneficiary
    )
    if (idx >= 0) setSelectedIdx(idx)
  }, [open, lockForChildBeneficiary, children])

  const selected =
    typeof selectedIdx === "number" && selectedIdx >= 0
      ? children[selectedIdx]
      : null
  const childName = selected?.name ?? ""
  const beneficiary = selected?.beneficiaryAddress?.trim() ?? ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!address) {
      connect()
      return
    }
    if (!selected?.beneficiaryAddress?.trim()) {
      setError("Select a child with a registered wallet — SOL binds to their vault.")
      return
    }
    const amountNum = parseFloat(amount)
    const unlockTs = unlockDate ? Math.floor(new Date(unlockDate).getTime() / 1000) : 0
    const benStr = selected.beneficiaryAddress.trim()
    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount.")
      return
    }
    if (unlockTs <= Math.floor(Date.now() / 1000)) {
      setError("Unlock date must be in the future.")
      return
    }
    let beneficiaryPubkey: PublicKey
    try {
      beneficiaryPubkey = new PublicKey(benStr)
    } catch {
      setError("Invalid Solana address.")
      return
    }
    setLoading(true)
    try {
      const connection = await getConnection()
      const creatorPubkey = new PublicKey(address)
      if (lockAsMsol) {
        const { depositSig, lockSig } = await createMsolVault(
          connection,
          creatorPubkey,
          beneficiaryPubkey,
          amountNum,
          unlockTs,
          signTransactionWithBrowserWallet
        )
        toast.success(
          <span>
            mSOL locked for <strong>{selected.name}</strong>.{" "}
            <a
              href={solanaTxUrl(depositSig)}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Deposit tx
            </a>
            {" · "}
            <a
              href={solanaTxUrl(lockSig)}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Lock tx
            </a>
          </span>
        )
      } else {
        const sig = await createSolVault(
          connection,
          creatorPubkey,
          beneficiaryPubkey,
          amountNum,
          unlockTs,
          signTransactionWithBrowserWallet
        )
        toast.success(
          <span>
            SOL locked for <strong>{selected.name}</strong>.{" "}
            <a
              href={solanaTxUrl(sig)}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View transaction
            </a>
          </span>
        )
      }
      updateChildTotal(selected.name, amountNum)
      await refreshVaults()
      onClose()
    } catch (err) {
      setError((err as Error).message?.slice(0, 80) ?? "Transaction failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lock SOL for a child</DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">
              Choose the child — the lock is bound to <strong>their</strong> on-chain vault
              (their wallet). Each lock appears under that child&apos;s card.
            </span>
            {!lockAsMsol && isMainnetVaults() && (
              <span className="block">
                Optionally lock as mSOL for{" "}
                {marinadeApy != null ? `~${marinadeApy}% APY` : "yield"} (mainnet).
              </span>
            )}
            {!isMainnetVaults() && (
              <span className="block text-muted-foreground">
                Testnet: use test SOL; Phantom on Testnet.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Child *</Label>
            <select
              required
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={selectedIdx === "" ? "" : String(selectedIdx)}
              onChange={(e) => {
                const v = e.target.value
                setSelectedIdx(v === "" ? "" : parseInt(v, 10))
              }}
            >
              <option value="">Select child</option>
              {children.map((c, i) => (
                <option key={`${i}-${c.beneficiaryAddress ?? ""}`} value={String(i)}>
                  {c.name}
                  {!c.beneficiaryAddress ? " (register wallet first)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Child&apos;s vault wallet (bound)</Label>
            <Input
              readOnly
              className="font-mono text-xs bg-muted/50"
              placeholder="Select a child above"
              value={beneficiary}
            />
            <p className="text-[11px] text-muted-foreground">
              This address receives funds after unlock. It comes from the child&apos;s
              on-chain registration.
            </p>
          </div>
          {isMainnetVaults() && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lock-msol"
                checked={lockAsMsol}
                onChange={(e) => setLockAsMsol(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="lock-msol" className="cursor-pointer">
                Lock as mSOL (mainnet)
              </Label>
            </div>
          )}
          <div className="space-y-2">
            <Label>Amount (SOL) *</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Unlock date *</Label>
            <Input
              type="datetime-local"
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Signing…" : lockAsMsol ? "Stake & lock mSOL" : "Lock SOL"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
