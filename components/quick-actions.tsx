"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { useActions } from "@/context/actions-context"
import {
  Plus,
  ArrowUpRight,
  Clock,
  UserPlus,
  Wallet,
  Gift,
} from "lucide-react"

const actions: Array<{
  label: string
  description: string
  icon: typeof Plus
  variant: "default" | "outline"
  action: "addSol" | "newChild" | "withdraw" | "autoSave" | "connect" | "gift"
}> = [
  { label: "Lock SOL", description: "Pick child — binds to their vault", icon: Plus, variant: "default", action: "addSol" },
  { label: "New Child", description: "Add child profile", icon: UserPlus, variant: "outline", action: "newChild" },
  { label: "Withdraw", description: "Unlocked funds", icon: ArrowUpRight, variant: "outline", action: "withdraw" },
  { label: "Auto-Save", description: "Recurring deposits", icon: Clock, variant: "outline", action: "autoSave" },
  { label: "Connect wallet", description: "Solana wallet", icon: Wallet, variant: "outline", action: "connect" },
  { label: "Gift Funds", description: "Family contribute", icon: Gift, variant: "outline", action: "gift" },
]

export function QuickActions() {
  const { connect, connected, isConnecting } = useWallet()
  const {
    openAddSol,
    openNewChild,
    openWithdraw,
    openAutoSave,
    openGift,
  } = useActions()

  const handleAction = (action: string) => {
    switch (action) {
      case "addSol":
        openAddSol()
        break
      case "newChild":
        openNewChild()
        break
      case "withdraw":
        openWithdraw()
        break
      case "autoSave":
        openAutoSave()
        break
      case "connect":
        connect()
        break
      case "gift":
        openGift()
        break
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {actions.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.label}
              variant={item.variant}
              className="h-auto min-w-0 flex-col items-start gap-1 overflow-hidden p-4 text-left"
              onClick={() => handleAction(item.action)}
              disabled={item.action === "connect" && (connected || isConnecting)}
            >
              <div className="flex w-full min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate font-medium">{item.label}</span>
              </div>
              <span
                className={
                  "block w-full min-w-0 truncate text-xs " +
                  (item.variant === "default"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground")
                }
              >
                {item.description}
              </span>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
