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
import { toast } from "sonner"
import { useChildren } from "@/context/children-context"

const AUTO_SAVE_KEY = "nest_autosave"

export function AutoSaveDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { children } = useChildren()
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("monthly")
  const [childName, setChildName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = parseFloat(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) return
    try {
      const existing = typeof localStorage !== "undefined" ? localStorage.getItem(AUTO_SAVE_KEY) : null
      const arr = existing ? JSON.parse(existing) : []
      arr.push({
        amountSol: amountNum,
        frequency,
        childName: childName || null,
        createdAt: new Date().toISOString(),
      })
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(arr))
      toast.success("Reminder saved. Deposit SOL when you’re ready.")
    } catch (_) {}
    onClose()
    setAmount("")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Auto-save (recurring)</DialogTitle>
          <DialogDescription>
            Set a reminder to deposit SOL regularly. You&apos;ll need to connect and send each time;
            full automation coming later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount (SOL) per deposit</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as "weekly" | "monthly")}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Target child (optional)</Label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
            >
              <option value="">Any</option>
              {children.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!amount || parseFloat(amount) <= 0}>
              Save reminder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
