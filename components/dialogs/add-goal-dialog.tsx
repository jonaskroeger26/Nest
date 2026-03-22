"use client"

import { useState, useEffect } from "react"
import { format, addYears } from "date-fns"
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
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { useChildren } from "@/context/children-context"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [unlockDay, setUnlockDay] = useState<Date | undefined>(undefined)

  useEffect(() => {
    if (open && childName) {
      setName("")
      setTarget("")
      setUnlockDay(addYears(new Date(), 1))
    }
  }, [open, childName])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!childName || !name.trim()) return
    const targetNum = parseFloat(target)
    if (!Number.isFinite(targetNum) || targetNum <= 0) return
    const day = unlockDay ?? addYears(new Date(), 1)
    const iso = format(day, "yyyy-MM-dd")
    addGoal(childName, {
      name: name.trim(),
      current: 0,
      target: targetNum,
      locked: true,
      unlockDate: iso,
    })
    toast.success(`Goal "${name.trim()}" added. Use Add SOL to lock funds.`)
    onClose()
  }

  if (!childName) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New goal for {childName}</DialogTitle>
          <DialogDescription>
            Add a savings goal. Use &quot;Add SOL&quot; to lock funds into a vault
            for this goal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Goal name *</Label>
            <Input
              id="goal-name"
              placeholder="e.g. College Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-target">Target amount ($)</Label>
            <Input
              id="goal-target"
              type="text"
              inputMode="decimal"
              placeholder="50000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Unlock date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !unlockDay && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {unlockDay
                    ? format(unlockDay, "PPP")
                    : "Pick unlock date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={unlockDay}
                  onSelect={setUnlockDay}
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Used for milestones and your dashboard. On-chain unlock is set when
              you create the vault.
            </p>
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
