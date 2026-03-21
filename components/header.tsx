"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import Link from "next/link"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NOTIF_READ_STORAGE_KEY = "nest_notifications_read_v1"

type InAppNotification = {
  id: string
  title: string
  body: string
  href?: string
}

const DEFAULT_NOTIFICATIONS: InAppNotification[] = [
  {
    id: "welcome",
    title: "Welcome to Nest",
    body: "Lock SOL for your kids with time-based vaults. Your child wallet withdraws after unlock.",
    href: "/",
  },
  {
    id: "testnet",
    title: "Testnet mode",
    body: "You’re on testnet — use a faucet for SOL. Mainnet locks and Marinade are for production.",
  },
  {
    id: "dashboard",
    title: "Your dashboard",
    body: "Manage children, locks, and settings from the Nest app home.",
    href: "/app",
  },
]

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(NOTIF_READ_STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is string => typeof x === "string"))
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(NOTIF_READ_STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

export function Header() {
  const { address, isConnecting, connect, disconnect, connected } = useWallet()
  const { userName, setUserName } = useUser()
  const [showConnectName, setShowConnectName] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [savingNameOnChain, setSavingNameOnChain] = useState(false)
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(
    () => new Set()
  )
  const prevAddress = useRef<string | null>(null)

  useEffect(() => {
    setReadNotificationIds(loadReadIds())
  }, [])

  const notifications = useMemo(() => {
    const list = [...DEFAULT_NOTIFICATIONS]
    if (isMainnetVaults()) {
      return list.filter((n) => n.id !== "testnet")
    }
    return list
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readNotificationIds.has(n.id)).length,
    [notifications, readNotificationIds]
  )

  const markNotificationRead = useCallback((id: string) => {
    setReadNotificationIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setReadNotificationIds(() => {
      const next = new Set(notifications.map((n) => n.id))
      saveReadIds(next)
      return next
    })
  }, [notifications])

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
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Nest home"
        >
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
        </Link>

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-0.5 text-[10px] font-medium text-accent-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between gap-2 font-semibold">
                <span>Notifications</span>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    className="text-xs font-normal text-primary hover:underline"
                    onClick={(e) => {
                      e.preventDefault()
                      markAllNotificationsRead()
                    }}
                  >
                    Mark all read
                  </button>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-72 overflow-y-auto py-1">
                {notifications.map((n) => {
                  const isRead = readNotificationIds.has(n.id)
                  const content = (
                    <>
                      <div className="flex items-start gap-2">
                        {!isRead ? (
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                            aria-hidden
                          />
                        ) : (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                            {n.body}
                          </p>
                        </div>
                      </div>
                    </>
                  )
                  if (n.href) {
                    return (
                      <DropdownMenuItem
                        key={n.id}
                        className="cursor-pointer items-start px-3 py-2.5"
                        asChild
                      >
                        <Link
                          href={n.href}
                          onClick={() => markNotificationRead(n.id)}
                        >
                          {content}
                        </Link>
                      </DropdownMenuItem>
                    )
                  }
                  return (
                    <DropdownMenuItem
                      key={n.id}
                      className="cursor-pointer items-start px-3 py-2.5"
                      onSelect={() => markNotificationRead(n.id)}
                    >
                      {content}
                    </DropdownMenuItem>
                  )
                })}
              </div>
              {notifications.length === 0 ? (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                  No notifications
                </p>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
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
