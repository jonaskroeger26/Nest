"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Bird,
  Bell,
  Copy,
  ExternalLink,
  LogOut,
  Settings,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useWallet } from "@/hooks/use-wallet"
import { useUser } from "@/context/user-context"
import {
  NEST_AVATAR_STYLES,
  nestAvatarImageUrl,
  type NestAvatarStyleId,
} from "@/lib/nest-avatar"
import { ConnectNameDialog } from "@/components/dialogs/connect-name-dialog"
import {
  getKidsVaultProgramId,
  getSolanaCluster,
  isMainnetVaults,
} from "@/lib/solana-config"
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
import { solanaAccountUrl, solanaTxUrl } from "@/lib/solana-explorer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SiteNavLinks } from "@/components/site-nav-links"

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

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch {
    toast.error("Could not copy")
  }
}

export function Header() {
  const { address, isConnecting, connect, disconnect, connected } = useWallet()
  const { userName, setUserName, userAvatar, setUserAvatar } = useUser()
  const [showConnectName, setShowConnectName] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [draftAvatarStyle, setDraftAvatarStyle] =
    useState<NestAvatarStyleId>("lorelei")
  const [draftAvatarSeed, setDraftAvatarSeed] = useState("")
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

  const resetNotificationReadState = useCallback(() => {
    try {
      localStorage.removeItem(NOTIF_READ_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setReadNotificationIds(new Set())
    toast.success("Notification badge reset")
  }, [])

  const cluster = getSolanaCluster()
  const programId = getKidsVaultProgramId().toBase58()

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

  const openSettings = useCallback(() => {
    setDraftAvatarStyle(userAvatar?.style ?? "lorelei")
    setDraftAvatarSeed(
      userAvatar?.seed ?? address ?? userName ?? ""
    )
    setShowSettings(true)
  }, [userAvatar, address, userName])

  const saveAppearance = useCallback(() => {
    const seed =
      draftAvatarSeed.trim() || address || userName || "nest"
    setUserAvatar({
      style: draftAvatarStyle,
      seed: seed.slice(0, 80),
    })
    toast.success("Avatar updated")
  }, [
    draftAvatarSeed,
    draftAvatarStyle,
    address,
    userName,
    setUserAvatar,
  ])

  const resetAppearance = useCallback(() => {
    setUserAvatar(null)
    setDraftAvatarStyle("lorelei")
    setDraftAvatarSeed(address ?? userName ?? "")
    toast.success("Avatar reset to default")
  }, [address, userName, setUserAvatar])

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
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:gap-6 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-6">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2 rounded-lg outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring sm:gap-3"
            aria-label="Nest marketing home"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
              <Bird className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="truncate text-lg font-semibold text-foreground sm:text-xl">
              Nest
            </span>
            {!isMainnetVaults() && (
              <Badge
                variant="secondary"
                className="hidden border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 sm:inline-flex"
              >
                Testnet
              </Badge>
            )}
          </Link>
          <SiteNavLinks className="hidden min-w-0 md:flex" />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
          <SiteNavLinks className="flex md:hidden" />
          {!connected ? (
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
          ) : null}
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
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogContent className="sm:max-w-lg max-h-[min(85vh,640px)] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                  Profile, wallet, and Nest preferences. Your display name is stored
                  on-chain (signed by this wallet).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-2">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Profile</h3>
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
                </section>

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Profile picture
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Avatars are generated in your browser (Dicebear). Pick a style
                    and a short phrase — same combo always gives the same face.
                  </p>
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={nestAvatarImageUrl(
                        {
                          style: draftAvatarStyle,
                          seed:
                            draftAvatarSeed.trim() ||
                            address ||
                            userName ||
                            "nest",
                        },
                        address ?? userName ?? "nest"
                      )}
                      alt=""
                      className="h-24 w-24 rounded-full border border-border bg-muted/40"
                      width={96}
                      height={96}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {NEST_AVATAR_STYLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        title={s.label}
                        onClick={() => setDraftAvatarStyle(s.id)}
                        className={
                          "flex flex-col items-center gap-1 rounded-lg border p-1.5 text-[10px] transition-colors " +
                          (draftAvatarStyle === s.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/60")
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={nestAvatarImageUrl(
                            {
                              style: s.id,
                              seed:
                                draftAvatarSeed.trim() ||
                                address ||
                                userName ||
                                "nest",
                            },
                            address ?? userName ?? "nest"
                          )}
                          alt=""
                          className="h-10 w-10 rounded-full"
                          width={40}
                          height={40}
                        />
                        <span className="line-clamp-1 text-center">{s.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-avatar-seed">Avatar phrase</Label>
                    <Input
                      id="settings-avatar-seed"
                      value={draftAvatarSeed}
                      onChange={(e) => setDraftAvatarSeed(e.target.value)}
                      placeholder={
                        address
                          ? "Leave empty to use wallet address"
                          : "e.g. sunny-koala"
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      className="flex-1"
                      variant="default"
                      onClick={saveAppearance}
                    >
                      Save avatar
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      variant="outline"
                      onClick={resetAppearance}
                    >
                      Reset default
                    </Button>
                  </div>
                </section>

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Wallet</h3>
                  {address ? (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Connected address</p>
                      <p className="break-all font-mono text-xs text-foreground">
                        {address}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => void copyToClipboard(address, "Address")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5" asChild>
                          <a
                            href={solanaAccountUrl(address)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Solscan
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Connect a wallet to lock funds and manage children.
                    </p>
                  )}
                </section>

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Network</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Cluster</span>
                      <span className="font-medium capitalize">{cluster}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        Kids vault program
                      </span>
                      <p className="break-all font-mono text-xs">{programId}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => void copyToClipboard(programId, "Program ID")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy program ID
                      </Button>
                    </div>
                  </div>
                </section>

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Notifications
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Reset the bell badge if you want tips to show as unread again
                    (stored in this browser only).
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={resetNotificationReadState}
                  >
                    Reset notification badge
                  </Button>
                </section>

                <Separator />

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Legal</h3>
                  <div className="flex flex-col gap-1 text-sm">
                    <Link
                      href="/privacy"
                      className="text-primary hover:underline"
                      onClick={() => setShowSettings(false)}
                    >
                      Privacy
                    </Link>
                    <Link
                      href="/terms"
                      className="text-primary hover:underline"
                      onClick={() => setShowSettings(false)}
                    >
                      Terms
                    </Link>
                    <Link
                      href="/security"
                      className="text-primary hover:underline"
                      onClick={() => setShowSettings(false)}
                    >
                      Security
                    </Link>
                  </div>
                </section>
              </div>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Profile menu"
              >
                <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                  <AvatarImage
                    src={nestAvatarImageUrl(
                      userAvatar,
                      address ?? userName ?? "nest"
                    )}
                    alt=""
                  />
                  <AvatarFallback>
                    {(userName ?? shortAddress ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-medium text-foreground">
                  {userName?.trim() || "Parent"}
                </p>
                {shortAddress ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {shortAddress}
                  </p>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onSelect={() => openSettings()}
              >
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              {connected ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    onSelect={() => disconnect()}
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
