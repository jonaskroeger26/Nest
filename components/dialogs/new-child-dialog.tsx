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
import { useProfileReady } from "@/context/profile-ready-context"
import { useProfileReload } from "@/context/profile-reload-context"
import { useWallet } from "@/hooks/use-wallet"
import { PublicKey } from "@solana/web3.js"
import {
  getConnection,
  registerChildOnChain,
} from "@/lib/solana-vault"
import { signTransactionWithBrowserWallet } from "@/lib/wallet-sign"
import { solanaTxUrl } from "@/lib/solana-explorer"

export function NewChildDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const profileReady = useProfileReady()
  const { reloadProfileFromChain } = useProfileReload()
  const { address } = useWallet()
  const [name, setName] = useState("")
  const [childWallet, setChildWallet] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const childName = name.trim().slice(0, 32)
    if (!childName) return
    if (!address) {
      toast.error("Connect your wallet first.")
      return
    }
    if (!profileReady) {
      toast.error("Still loading your profile — try again in a moment.")
      return
    }
    let beneficiary: PublicKey
    try {
      beneficiary = new PublicKey(childWallet.trim())
    } catch {
      toast.error("Enter a valid Solana address for the child’s wallet.")
      return
    }
    setLoading(true)
    try {
      const connection = await getConnection()
      const sig = await registerChildOnChain(
        connection,
        new PublicKey(address),
        beneficiary,
        childName,
        signTransactionWithBrowserWallet
      )
      reloadProfileFromChain()
      toast.success(
        <span>
          Child registered on-chain.{" "}
          <a
            href={solanaTxUrl(sig)}
            className="font-medium underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View transaction
          </a>
        </span>
      )
      onClose()
      setName("")
      setChildWallet("")
    } catch (err) {
      toast.error((err as Error).message?.slice(0, 120) ?? "Transaction failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register child on-chain</DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              Signs a transaction as the parent wallet. The child’s wallet address is stored on-chain
              and is the only address that can withdraw locked funds after unlock.
            </span>
            <span className="block text-muted-foreground text-xs">
              One registration per parent + child wallet. Locks use separate transactions.
            </span>
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
            <Label>Child&apos;s Solana wallet *</Label>
            <Input
              placeholder="Address that will withdraw after unlock"
              value={childWallet}
              onChange={(e) => setChildWallet(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !childWallet.trim() || loading}
            >
              {loading ? "Signing…" : "Sign & register on-chain"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
