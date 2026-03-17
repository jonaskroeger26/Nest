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
import { useProfileReady } from "@/context/profile-ready-context"
import { useWallet } from "@/hooks/use-wallet"

export function NewChildDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { addChild } = useChildren()
  const profileReady = useProfileReady()
  const { address } = useWallet()
  const [name, setName] = useState("")
  const [age, setAge] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ageNum = parseInt(age, 10)
    if (!name.trim()) return
    if (address && !profileReady) {
      toast.error("Still loading your profile — try again in a moment.")
      return
    }
    const childName = name.trim().slice(0, 32)
    addChild({
      name: childName,
      age: Number.isFinite(ageNum) && ageNum >= 0 ? ageNum : 0,
      avatar: `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(name.trim())}`,
    })
    toast.success(
      `${childName} added. Set their wallet on the profile so locked SOL shows on their card.`
    )
    onClose()
    setName("")
    setAge("")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New child</DialogTitle>
          <DialogDescription>
            Add a child profile. You can add goals and lock SOL for them later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              placeholder="e.g. Emma"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Age</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Add child
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
