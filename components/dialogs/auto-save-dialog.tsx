"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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
import { toast } from "sonner"
import { useChildren } from "@/context/children-context"
import { useWallet } from "@/hooks/use-wallet"
import { useActions } from "@/context/actions-context"
import { PublicKey } from "@solana/web3.js"
import {
  getConnection,
  getSolVaultUnlockTimestamp,
  initAutoSaveSchedule,
  fundAutoSaveSchedule,
  cancelAutoSaveSchedule,
  fetchAutoSaveScheduleState,
  deriveAutoSaveSchedulePDA,
  type AutoSaveScheduleLoaded,
} from "@/lib/solana-vault"
import { signTransactionWithBrowserWallet } from "@/lib/wallet-sign"
import { solanaTxUrl, solanaAccountUrl } from "@/lib/solana-explorer"
import { CalendarClock, RefreshCw, PiggyBank, Lock } from "lucide-react"
import { getSolanaCluster } from "@/lib/solana-config"

const AUTO_SAVE_KEY = "nest_autosave_schedules"

function relayerPubkeyFromEnv(): PublicKey | null {
  const s = process.env.NEXT_PUBLIC_NEST_AUTOSAVE_RELAYER_PUBKEY?.trim()
  if (!s) return null
  try {
    return new PublicKey(s)
  } catch {
    return null
  }
}

const PERIOD_WEEK = 7 * 24 * 3600
const PERIOD_MONTH = 30 * 24 * 3600

function formatSol(lamports: number): string {
  return `${(lamports / 1e9).toFixed(4)} SOL`
}

function estimatedDrips(spendableLamports: number, perPeriodLamports: bigint): number {
  if (perPeriodLamports <= BigInt(0)) return 0
  const per = Number(perPeriodLamports)
  if (!Number.isFinite(per) || per <= 0) return 0
  return Math.floor(spendableLamports / per)
}

export function AutoSaveDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { children } = useChildren()
  const { address, connect, connected } = useWallet()
  const { autoSaveBeneficiary, openAddSolForChild } = useActions()
  const relayerPk = useMemo(() => relayerPubkeyFromEnv(), [])
  const cluster = useMemo(() => getSolanaCluster(), [])

  const [amount, setAmount] = useState("")
  const [escrow, setEscrow] = useState("")
  const [fundMore, setFundMore] = useState("")
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("monthly")
  const [selectedIdx, setSelectedIdx] = useState<number | "">("")
  const [loading, setLoading] = useState(false)
  const [fundLoading, setFundLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [unlockTs, setUnlockTs] = useState<number | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleChecked, setScheduleChecked] = useState(false)
  const [existingSchedule, setExistingSchedule] =
    useState<AutoSaveScheduleLoaded | null>(null)

  const selected =
    typeof selectedIdx === "number" && selectedIdx >= 0
      ? children[selectedIdx] ?? null
      : null
  const beneficiaryStr = selected?.beneficiaryAddress?.trim() ?? ""

  const loadSchedule = useCallback(async () => {
    if (!address || !beneficiaryStr) {
      setExistingSchedule(null)
      setScheduleChecked(false)
      return
    }
    setScheduleLoading(true)
    try {
      const conn = await getConnection()
      const s = await fetchAutoSaveScheduleState(
        conn,
        new PublicKey(address),
        new PublicKey(beneficiaryStr)
      )
      setExistingSchedule(s)
    } catch {
      setExistingSchedule(null)
    } finally {
      setScheduleLoading(false)
      setScheduleChecked(true)
    }
  }, [address, beneficiaryStr])

  useEffect(() => {
    if (!open) return
    setAmount("")
    setEscrow("")
    setFundMore("")
    setUnlockTs(null)
    setExistingSchedule(null)
    setScheduleChecked(false)
    if (!autoSaveBeneficiary?.trim()) setSelectedIdx("")
  }, [open, autoSaveBeneficiary])

  useEffect(() => {
    if (!open || !autoSaveBeneficiary?.trim()) return
    const idx = children.findIndex(
      (c) => (c.beneficiaryAddress?.trim() ?? "") === autoSaveBeneficiary.trim()
    )
    if (idx >= 0) setSelectedIdx(idx)
  }, [open, autoSaveBeneficiary, children])

  useEffect(() => {
    if (!open || !address || !beneficiaryStr) {
      setUnlockTs(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const conn = await getConnection()
        const u = await getSolVaultUnlockTimestamp(
          conn,
          new PublicKey(address),
          new PublicKey(beneficiaryStr)
        )
        if (!cancelled) setUnlockTs(u)
      } catch {
        if (!cancelled) setUnlockTs(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, address, beneficiaryStr])

  useEffect(() => {
    if (!open || !address || !beneficiaryStr) {
      setExistingSchedule(null)
      setScheduleChecked(false)
      return
    }
    void loadSchedule()
  }, [open, address, beneficiaryStr, loadSchedule])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!relayerPk) {
      toast.error("Relayer is not configured (NEXT_PUBLIC_NEST_AUTOSAVE_RELAYER_PUBKEY).")
      return
    }
    if (!connected || !address) {
      toast.error("Connect your wallet first.")
      return
    }
    if (!beneficiaryStr) {
      toast.error("Pick a child with a wallet address saved.")
      return
    }
    const amountNum = parseFloat(amount)
    const escrowNum = parseFloat(escrow || "0")
    if (!Number.isFinite(amountNum) || amountNum <= 0) return
    if (!Number.isFinite(escrowNum) || escrowNum <= 0) {
      toast.error("Add an initial escrow budget (SOL) for automated drips.")
      return
    }
    if (unlockTs == null) {
      toast.error(
        "No SOL vault found for this child. Create a vault (lock SOL) first with the same unlock date."
      )
      return
    }

    const periodSeconds = frequency === "weekly" ? PERIOD_WEEK : PERIOD_MONTH

    setLoading(true)
    try {
      const conn = await getConnection()
      const parent = new PublicKey(address)
      const beneficiary = new PublicKey(beneficiaryStr)
      const sig = await initAutoSaveSchedule(
        conn,
        parent,
        beneficiary,
        relayerPk,
        amountNum,
        periodSeconds,
        unlockTs,
        escrowNum,
        signTransactionWithBrowserWallet
      )
      const schedulePda = deriveAutoSaveSchedulePDA(parent, beneficiary).toBase58()
      try {
        const raw = localStorage.getItem(AUTO_SAVE_KEY)
        const arr = raw ? JSON.parse(raw) : []
        arr.push({
          schedulePda,
          beneficiary: beneficiaryStr,
          amountSol: amountNum,
          escrowSol: escrowNum,
          frequency,
          createdAt: new Date().toISOString(),
          initTx: sig,
        })
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(arr))
      } catch (_) {}
      toast.success(
        <span>
          Auto-save started.{" "}
          <a
            href={solanaTxUrl(sig)}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            View tx
          </a>
        </span>
      )
      await loadSchedule()
      onClose()
    } catch (err) {
      const msg = (err as Error)?.message ?? "Transaction failed"
      if (/already in use|0x0|custom program error/i.test(msg)) {
        toast.error(
          "A schedule may already exist for this child. Refresh — use Fund / Cancel below."
        )
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFund = async () => {
    if (!connected || !address || !beneficiaryStr) return
    const n = parseFloat(fundMore)
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a positive SOL amount to add.")
      return
    }
    setFundLoading(true)
    try {
      const conn = await getConnection()
      const sig = await fundAutoSaveSchedule(
        conn,
        new PublicKey(address),
        new PublicKey(beneficiaryStr),
        n,
        signTransactionWithBrowserWallet
      )
      toast.success(
        <span>
          Escrow topped up.{" "}
          <a href={solanaTxUrl(sig)} target="_blank" rel="noreferrer" className="underline">
            View tx
          </a>
        </span>
      )
      setFundMore("")
      await loadSchedule()
    } catch (err) {
      toast.error((err as Error)?.message ?? "Fund failed")
    } finally {
      setFundLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!connected || !address || !beneficiaryStr) return
    if (
      !confirm(
        "Cancel auto-save? Remaining escrow (minus rent) returns to your wallet. This cannot be undone."
      )
    )
      return
    setCancelLoading(true)
    try {
      const conn = await getConnection()
      const sig = await cancelAutoSaveSchedule(
        conn,
        new PublicKey(address),
        new PublicKey(beneficiaryStr),
        signTransactionWithBrowserWallet
      )
      toast.success(
        <span>
          Schedule closed.{" "}
          <a href={solanaTxUrl(sig)} target="_blank" rel="noreferrer" className="underline">
            View tx
          </a>
        </span>
      )
      await loadSchedule()
    } catch (err) {
      toast.error((err as Error)?.message ?? "Cancel failed")
    } finally {
      setCancelLoading(false)
    }
  }

  const showManage = existingSchedule != null && scheduleChecked
  const p = existingSchedule?.parsed

  const amountNum = parseFloat(amount)
  const escrowNum = parseFloat(escrow)
  const startReasons: string[] = []
  if (!relayerPk)
    startReasons.push(
      "Relayer pubkey missing — add NEXT_PUBLIC_NEST_AUTOSAVE_RELAYER_PUBKEY to env and restart the app."
    )
  if (!amount || !Number.isFinite(amountNum) || amountNum <= 0)
    startReasons.push("Enter amount per period (SOL) greater than zero.")
  if (!escrow || !Number.isFinite(escrowNum) || escrowNum <= 0)
    startReasons.push("Enter initial escrow (SOL) greater than zero.")
  if (unlockTs == null && beneficiaryStr && connected)
    startReasons.push(
      `No SOL vault found for this parent + child on ${cluster}. Use the same wallet you used to lock, switch Phantom to ${cluster}, then Lock SOL once — or open Lock SOL below.`
    )
  if (!connected) startReasons.push("Connect your wallet.")
  if (!beneficiaryStr) startReasons.push("Select a child with a wallet address.")

  const showStartForm =
    !showManage && scheduleChecked && !scheduleLoading && beneficiaryStr

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Auto-save (allowance)
          </DialogTitle>
          <DialogDescription>
            Pre-fund an on-chain escrow; the Nest relayer moves SOL into your
            child&apos;s vault each period. Only the escrow can be spent — not an
            unlimited wallet pull.
          </DialogDescription>
          <p className="text-xs text-muted-foreground">
            App RPC cluster:{" "}
            <span className="font-medium text-foreground">{cluster}</span> — match
            Phantom (Developer settings → network).
          </p>
        </DialogHeader>

        {!relayerPk && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Set{" "}
            <code className="text-xs">NEXT_PUBLIC_NEST_AUTOSAVE_RELAYER_PUBKEY</code>{" "}
            for this deployment.
          </p>
        )}

        {!connected && (
          <Button type="button" onClick={() => void connect()}>
            Connect wallet
          </Button>
        )}

        <div className="space-y-2">
          <Label>Child</Label>
          <select
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={selectedIdx === "" ? "" : String(selectedIdx)}
            onChange={(e) => {
              const v = e.target.value
              setSelectedIdx(v === "" ? "" : parseInt(v, 10))
            }}
          >
            <option value="">Select…</option>
            {children.map((c, i) => (
              <option
                key={c.name}
                value={String(i)}
                disabled={!c.beneficiaryAddress?.trim()}
              >
                {c.name}
                {!c.beneficiaryAddress?.trim() ? " (no wallet)" : ""}
              </option>
            ))}
          </select>
          {children.length === 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Add a child in Nest first (with a beneficiary wallet).
            </p>
          )}
        </div>

        {beneficiaryStr && connected && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {unlockTs != null
                ? `Vault unlock: ${new Date(unlockTs * 1000).toLocaleString()}`
                : "No SOL vault yet — use Lock SOL first."}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1 px-2"
              onClick={() => void loadSchedule()}
              disabled={scheduleLoading || !address}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${scheduleLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        )}

        {scheduleLoading && beneficiaryStr && (
          <p className="text-sm text-muted-foreground">Loading schedule…</p>
        )}

        {connected && !beneficiaryStr && (
          <p className="text-sm text-muted-foreground">
            Select a child to see an existing schedule or create one.
          </p>
        )}

        {showManage && p && existingSchedule && (
          <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="h-4 w-4" />
              Active schedule
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                Per period:{" "}
                <span className="text-foreground">
                  {(Number(p.amountPerPeriodLamports) / 1e9).toFixed(6)} SOL
                </span>{" "}
                every {Math.round(p.periodSeconds / 86400)}d
              </li>
              <li>
                Next drip (earliest):{" "}
                <span className="text-foreground">
                  {new Date(p.nextExecutionUnix * 1000).toLocaleString()}
                </span>
              </li>
              <li>
                Escrow (spendable est.):{" "}
                <span className="text-foreground">
                  ~{formatSol(existingSchedule.spendableLamports)}
                </span>{" "}
                · ~{estimatedDrips(existingSchedule.spendableLamports, p.amountPerPeriodLamports)}{" "}
                drips at current rate
              </li>
              <li className="break-all">
                <a
                  href={solanaAccountUrl(existingSchedule.schedulePda)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Schedule account on explorer
                </a>
              </li>
            </ul>

            <div className="space-y-2">
              <Label>Add to escrow (SOL)</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.1"
                  value={fundMore}
                  onChange={(e) => setFundMore(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={() => void handleFund()}
                  disabled={fundLoading}
                >
                  {fundLoading ? "…" : "Fund"}
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => void handleCancel()}
              disabled={cancelLoading}
            >
              {cancelLoading ? "Confirm in wallet…" : "Cancel schedule & reclaim escrow"}
            </Button>
          </div>
        )}

        {showStartForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              No on-chain schedule for this child yet. Create one below (vault required).
            </p>
            {startReasons.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                <p className="mb-1 font-medium">Can’t start yet:</p>
                <ul className="list-inside list-disc space-y-1">
                  {startReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {unlockTs == null && beneficiaryStr && connected && (
              <Button
                type="button"
                variant="secondary"
                className="w-full gap-2"
                onClick={() => {
                  onClose()
                  openAddSolForChild(beneficiaryStr)
                }}
              >
                <Lock className="h-4 w-4" />
                Open Lock SOL for this child
              </Button>
            )}
            <div className="space-y-2">
              <Label>Amount (SOL) per period</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.05"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as "weekly" | "monthly")
                }
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly (~30d)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Initial escrow (SOL)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.5"
                value={escrow}
                onChange={(e) => setEscrow(e.target.value)}
              />
            </div>
            {relayerPk && (
              <p className="text-xs text-muted-foreground break-all">
                Relayer: {relayerPk.toBase58()}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  !relayerPk ||
                  !amount ||
                  !Number.isFinite(amountNum) ||
                  amountNum <= 0 ||
                  !escrow ||
                  !Number.isFinite(escrowNum) ||
                  escrowNum <= 0 ||
                  unlockTs == null
                }
              >
                {loading ? "Confirm in wallet…" : "Start auto-save"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {showManage && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
