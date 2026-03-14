"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { Copy, Check } from "lucide-react"

export function GiftDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { address } = useWallet()
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {}
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gift funds</DialogTitle>
          <DialogDescription>
            Share your wallet address so family can send you SOL. You can then lock it in vaults for your children.
          </DialogDescription>
        </DialogHeader>
        {address ? (
          <div className="space-y-2">
            <p className="break-all rounded-md border bg-muted/50 p-3 text-sm font-mono">
              {address}
            </p>
            <Button onClick={copyAddress} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy address"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Connect your wallet first to show your address.
          </p>
        )}
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
