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

export function AddGoalDialog({
  open,
  onClose,
  childName,
}: {
  open: boolean
  onClose: () => void
  childName: string | null
}) {
  const { addGoal } = useChildren()
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [unlockDate, setUnlockDate] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!childName || !name.trim()) return
    const targetNum = parseFloat(target)
    if (!Number.isFinite(targetNum) || targetNum <= 0) return
    addGoal(childName, {
      name: name.trim(),
      current: 0,
      target: targetNum,
      locked: true,
      unlockDate: unlockDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    })
    toast.success(`Goal "${name.trim()}" added. Use Add SOL to lock funds.`)
    onClose()
    setName("")
    setTarget("")
    setUnlockDate("")
  }

  if (!childName) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New goal for {childName}</DialogTitle>
          <DialogDescription>
            Add a savings goal. Use &quot;Add SOL&quot; to lock funds into a vault for this goal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Goal name *</Label>
            <Input
              placeholder="e.g. College Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Target amount ($)</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="50000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Unlock (approx. date)</Label>
            <Input
              type="text"
              placeholder="Sep 2028"
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Add goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
