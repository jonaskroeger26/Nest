"use client"

import { useState } from "react"
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
import { useMarinadeApy } from "@/hooks/use-marinade-apy"
import { getConnection, createSolVault, createMsolVault } from "@/lib/solana-vault"
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
  const { children } = useChildren()
  const marinadeApy = useMarinadeApy()
  const [childName, setChildName] = useState("")
  const [beneficiary, setBeneficiary] = useState("")
  const [amount, setAmount] = useState("")
  const [unlockDate, setUnlockDate] = useState("")
  const [lockAsMsol, setLockAsMsol] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!address) {
      connect()
      return
    }
    const amountNum = parseFloat(amount)
    const unlockTs = unlockDate ? Math.floor(new Date(unlockDate).getTime() / 1000) : 0
    if (!beneficiary.trim() || !amountNum || amountNum <= 0) {
      setError("Enter child wallet address and a valid amount.")
      return
    }
    if (unlockTs <= Math.floor(Date.now() / 1000)) {
      setError("Unlock date must be in the future.")
      return
    }
    let beneficiaryPubkey: PublicKey
    try {
      beneficiaryPubkey = new PublicKey(beneficiary.trim())
    } catch {
      setError("Invalid Solana address.")
      return
    }
    setLoading(true)
    try {
      const connection = await getConnection()
      const creatorPubkey = new PublicKey(address)
      const signTransaction = async (tx: import("@solana/web3.js").Transaction) => {
        const provider = (typeof window !== "undefined" && window.solana) ?? (window as unknown as { phantom?: { solana?: { signTransaction: (t: unknown) => Promise<unknown> } } }).phantom?.solana
        if (!provider?.signTransaction) throw new Error("Wallet cannot sign")
        const signed = await provider.signTransaction(tx)
        return signed as import("@solana/web3.js").Transaction
      }
      if (lockAsMsol) {
        await createMsolVault(
          connection,
          creatorPubkey,
          beneficiaryPubkey,
          amountNum,
          unlockTs,
          signTransaction
        )
        toast.success("mSOL vault created! SOL was staked via Marinade and locked until the unlock date.")
      } else {
        await createSolVault(
          connection,
          creatorPubkey,
          beneficiaryPubkey,
          amountNum,
          unlockTs,
          signTransaction
        )
        toast.success("Vault created! SOL is locked until the unlock date.")
      }
      onClose()
      setBeneficiary("")
      setAmount("")
      setUnlockDate("")
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
          <DialogTitle>Add SOL (lock in vault)</DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">SOL is locked in the vault on-chain until the unlock date. Only the child&apos;s wallet can withdraw after that; no one can withdraw early.</span>
            {lockAsMsol && (
              <span className="block text-muted-foreground">
                With mSOL: funds stay staked until unlock. After unlock the child withdraws mSOL to their wallet; they can then unstake mSOL → SOL via Marinade if they want.
              </span>
            )}
            {!lockAsMsol && (
              <span className="block">Optionally lock as mSOL to earn {marinadeApy != null ? `~${marinadeApy}% APY` : "APY"} (mainnet).</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Child / goal (optional)</Label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
            >
              <option value="">Select child</option>
              {children.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Child&apos;s Solana wallet address *</Label>
            <Input
              placeholder="Address that can withdraw after unlock"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="lock-msol"
              checked={lockAsMsol}
              onChange={(e) => setLockAsMsol(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="lock-msol" className="cursor-pointer">
              Earn {marinadeApy != null ? `~${marinadeApy}% ` : ""}APY — lock as mSOL (mainnet)
            </Label>
          </div>
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
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : lockAsMsol ? "Stake SOL → mSOL & lock in vault" : "Create vault & lock SOL"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
