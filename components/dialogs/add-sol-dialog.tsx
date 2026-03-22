"use client"

import { useState, useEffect, useMemo } from "react"
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
import { useChildren, type Child, type Goal } from "@/context/children-context"
import { useActions } from "@/context/actions-context"
import { useMarinadeApy } from "@/hooks/use-marinade-apy"
import { getConnection, createSolVault, createMsolVault } from "@/lib/solana-vault"
import { signTransactionWithBrowserWallet } from "@/lib/wallet-sign"
import { solanaTxUrl } from "@/lib/solana-explorer"
import { isMainnetVaults } from "@/lib/solana-config"
import { useVaultBalances } from "@/context/vault-balances-context"
import { useSolPrice } from "@/hooks/use-sol-price"
import { PublicKey } from "@solana/web3.js"
import { toast } from "sonner"
import {
  formatGoalUnlockDisplay,
  parseGoalUnlockDate,
} from "@/lib/goal-dates"

function goalKeyFromLockRef(ref: {
  goalId?: string
  goalIndex?: number
} | null): string {
  if (!ref) return ""
  if (ref.goalId) return `id:${ref.goalId}`
  if (ref.goalIndex != null && ref.goalIndex >= 0) return `idx:${ref.goalIndex}`
  return ""
}

function resolveGoalFromKey(child: Child, key: string): Goal | null {
  if (!key) return null
  if (key.startsWith("id:")) {
    const id = key.slice(3)
    return child.goals.find((g) => g.id === id) ?? null
  }
  if (key.startsWith("idx:")) {
    const i = parseInt(key.slice(4), 10)
    if (Number.isNaN(i) || i < 0 || i >= child.goals.length) return null
    return child.goals[i] ?? null
  }
  return null
}

function keyToCreditRef(key: string): { id?: string; index?: number } {
  if (key.startsWith("id:")) return { id: key.slice(3) }
  if (key.startsWith("idx:")) {
    const index = parseInt(key.slice(4), 10)
    if (Number.isNaN(index)) return {}
    return { index }
  }
  return {}
}

/**
 * End of the goal’s unlock calendar day (local), as unix seconds — used on-chain
 * so adding to a goal never requires re-entering a datetime.
 */
function goalUnlockToUnixSeconds(unlockDate: string): number | null {
  const d = parseGoalUnlockDate(unlockDate)
  if (!d) return null
  const end = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    23,
    59,
    59,
    999
  )
  return Math.floor(end.getTime() / 1000)
}

export function AddSolDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { address, connect } = useWallet()
  const { children, updateChildTotal, creditGoalLock } = useChildren()
  const { lockForChildBeneficiary, lockGoalRef } = useActions()
  const { refresh: refreshVaults } = useVaultBalances()
  const { usdPerSol } = useSolPrice()
  const marinadeApy = useMarinadeApy()
  const [selectedIdx, setSelectedIdx] = useState<number | "">("")
  const [selectedGoalKey, setSelectedGoalKey] = useState("")
  const [amount, setAmount] = useState("")
  const [unlockDate, setUnlockDate] = useState("")
  const [lockAsMsol, setLockAsMsol] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const selected = useMemo(() => {
    if (typeof selectedIdx !== "number" || selectedIdx < 0) return null
    return children[selectedIdx] ?? null
  }, [children, selectedIdx])

  const beneficiary = selected?.beneficiaryAddress?.trim() ?? ""

  const selectedGoal = useMemo(() => {
    if (!selected || !selectedGoalKey) return null
    return resolveGoalFromKey(selected, selectedGoalKey)
  }, [selected, selectedGoalKey])

  useEffect(() => {
    if (!open) return
    setError("")
    setAmount("")
    setUnlockDate("")
    setSelectedGoalKey(goalKeyFromLockRef(lockGoalRef))
    if (lockForChildBeneficiary) {
      const idx = children.findIndex(
        (x) =>
          (x.beneficiaryAddress?.trim() ?? "") === lockForChildBeneficiary
      )
      setSelectedIdx(idx >= 0 ? idx : "")
    } else {
      setSelectedIdx("")
    }
  }, [open, lockForChildBeneficiary, lockGoalRef, children])

  useEffect(() => {
    if (!open || !lockForChildBeneficiary || children.length === 0) return
    const idx = children.findIndex(
      (x) => (x.beneficiaryAddress?.trim() ?? "") === lockForChildBeneficiary
    )
    if (idx >= 0) setSelectedIdx(idx)
  }, [open, lockForChildBeneficiary, children])

  // If the chosen goal doesn’t exist on this child anymore, clear it.
  useEffect(() => {
    if (!selected || selectedGoalKey === "") return
    if (!resolveGoalFromKey(selected, selectedGoalKey)) {
      setSelectedGoalKey("")
    }
  }, [selected, selectedGoalKey])

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
    const nowSec = Math.floor(Date.now() / 1000)

    let unlockTs = 0
    if (selectedGoal) {
      unlockTs = goalUnlockToUnixSeconds(selectedGoal.unlockDate) ?? 0
      if (!unlockTs) {
        setError(
          "Could not read this goal’s unlock date. Use Custom and set unlock manually, or fix the goal date."
        )
        return
      }
      if (unlockTs <= nowSec) {
        setError(
          "This goal’s unlock date is already in the past. Switch to Custom to set a future unlock, or edit the goal."
        )
        return
      }
    } else {
      unlockTs = unlockDate
        ? Math.floor(new Date(unlockDate).getTime() / 1000)
        : 0
      if (!unlockTs) {
        setError("Set an unlock date, or pick a goal to use its date.")
        return
      }
      if (unlockTs <= nowSec) {
        setError("Unlock date must be in the future.")
        return
      }
    }

    const benStr = selected.beneficiaryAddress.trim()
    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount.")
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
      const goalLabel = selectedGoal ? ` · ${selectedGoal.name}` : ""
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
            mSOL locked for <strong>{selected.name}</strong>
            {goalLabel}.{" "}
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
            SOL locked for <strong>{selected.name}</strong>
            {goalLabel}.{" "}
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
      const ref = keyToCreditRef(selectedGoalKey)
      const refOk = ref.id != null || ref.index != null
      if (selectedGoalKey && refOk && usdPerSol != null) {
        const usd = amountNum * usdPerSol
        creditGoalLock(selected.name, ref, usd)
      } else if (selectedGoalKey && refOk && usdPerSol == null) {
        toast.message(
          "Goal progress in USD will update once the SOL price loads — refresh if needed."
        )
      }
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
              Pick a child, then a <strong>goal</strong> to reuse its unlock date
              automatically (no date picker), or Custom to set unlock yourself.
            </span>
            <span className="block">
              The lock is still bound to <strong>their</strong> on-chain vault
              (their wallet).
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
                setSelectedGoalKey("")
                setUnlockDate("")
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
          {selected && selected.goals.length > 0 ? (
            <div className="space-y-2">
              <Label>Goal</Label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={selectedGoalKey}
                onChange={(e) => {
                  const v = e.target.value
                  setSelectedGoalKey(v)
                  if (v === "") setUnlockDate("")
                }}
              >
                <option value="">Custom — set unlock date manually</option>
                {selected.goals.map((g, i) => (
                  <option
                    key={g.id ?? `${g.name}-${i}`}
                    value={g.id ? `id:${g.id}` : `idx:${i}`}
                  >
                    {g.name} · unlock {formatGoalUnlockDisplay(g.unlockDate)}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                With a goal selected, unlock time comes from that goal (end of that
                calendar day). Progress still credits in USD after the tx.
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Child&apos;s vault wallet (bound)</Label>
            <Input
              readOnly
              className="bg-muted/50 font-mono text-xs"
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
            {selectedGoal ? (
              <>
                <Label>Unlock</Label>
                <div className="rounded-md border border-input bg-muted/30 px-3 py-2.5 text-sm text-foreground">
                  <span className="font-medium">
                    {formatGoalUnlockDisplay(selectedGoal.unlockDate)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Taken from this goal — you don’t need to set the date again.
                  </span>
                </div>
              </>
            ) : (
              <>
                <Label>Unlock date *</Label>
                <Input
                  type="datetime-local"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                />
              </>
            )}
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
