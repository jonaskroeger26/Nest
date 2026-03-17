"use client"

import { useState, useEffect, useRef } from "react"
import { Bird, Bell, Settings, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useWallet } from "@/hooks/use-wallet"
import { useUser } from "@/context/user-context"
import { ConnectNameDialog } from "@/components/dialogs/connect-name-dialog"
import { isMainnetVaults } from "@/lib/solana-config"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PublicKey } from "@solana/web3.js"
import { toast } from "sonner"
import {
  getConnection,
  setParentDisplayNameOnChain,
} from "@/lib/solana-vault"
import { signTransactionWithBrowserWallet } from "@/lib/wallet-sign"
import { solanaTxUrl } from "@/lib/solana-explorer"

export function Header() {
  const { address, isConnecting, connect, disconnect, connected } = useWallet()
  const { userName, setUserName } = useUser()
  const [showConnectName, setShowConnectName] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [savingNameOnChain, setSavingNameOnChain] = useState(false)
  const prevAddress = useRef<string | null>(null)

  const shortAddress = address
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : null

  useEffect(() => {
    if (address && !prevAddress.current && !userName) setShowConnectName(true)
    prevAddress.current = address ?? null
  }, [address, userName])

  const handleConnectClick = () => {
    connect()
  }

  const handleNameContinue = async (name: string) => {
    setUserName(name)
    if (address) {
      try {
        const conn = await getConnection()
        const sig = await setParentDisplayNameOnChain(
          conn,
          new PublicKey(address),
          name,
          signTransactionWithBrowserWallet
        )
        toast.success(
          <span>
            Name saved on-chain.{" "}
            <a
              href={solanaTxUrl(sig)}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View tx
            </a>
          </span>
        )
      } catch (e) {
        toast.error(
          (e as Error).message?.slice(0, 100) ?? "Could not save name on-chain"
        )
        throw e
      }
    }
  }

  const saveSettingsNameOnChain = async () => {
    const n = userName?.trim()
    if (!address || !n) {
      toast.error("Enter a name and stay connected.")
      return
    }
    setSavingNameOnChain(true)
    try {
      const conn = await getConnection()
      const sig = await setParentDisplayNameOnChain(
        conn,
        new PublicKey(address),
        n,
        signTransactionWithBrowserWallet
      )
      toast.success(
        <span>
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
      setShowSettings(false)
    } catch (e) {
      toast.error((e as Error).message?.slice(0, 100) ?? "Failed")
    } finally {
      setSavingNameOnChain(false)
    }
  }

  return (
    <header className="border-b border-border bg-card">
      <ConnectNameDialog
        open={showConnectName}
        onClose={() => setShowConnectName(false)}
        onContinue={handleNameContinue}
      />
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Bird className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-foreground">Nest</span>
          {!isMainnetVaults() && (
            <Badge
              variant="secondary"
              className="hidden border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 sm:inline-flex"
            >
              Testnet
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          {connected ? (
            <>
              <span className="max-w-[140px] truncate text-sm font-medium text-primary">
                {shortAddress}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                className="gap-2"
              >
                <Wallet className="h-4 w-4" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              onClick={handleConnectClick}
              disabled={isConnecting}
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? "Connecting…" : "Connect wallet"}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
              3
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                  Your greeting name is stored on-chain (signed by this wallet).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-name">Your name</Label>
                  <Input
                    id="settings-name"
                    value={userName ?? ""}
                    onChange={(e) => setUserName(e.target.value || null)}
                    placeholder="e.g. James"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={savingNameOnChain || !userName?.trim()}
                  onClick={() => void saveSettingsNameOnChain()}
                >
                  {savingNameOnChain ? "Signing…" : "Save name on-chain"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Avatar className="h-9 w-9 ring-2 ring-primary/20">
            <AvatarImage src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${address ?? userName ?? "user"}`} alt="User" />
            <AvatarFallback>{(userName ?? shortAddress ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
