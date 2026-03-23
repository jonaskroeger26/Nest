"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { useChildren } from "@/context/children-context"
import { Copy, Check, ExternalLink, Gift } from "lucide-react"
import { PublicKey } from "@solana/web3.js"
import {
  getConnection,
  deriveVaultPDA,
  getSolVaultUnlockTimestamp,
} from "@/lib/solana-vault"
import { solanaAccountUrl } from "@/lib/solana-explorer"
import { getSolanaCluster } from "@/lib/solana-config"
import { VaultGiftQrPanel } from "@/components/vault-gift-qr"
import {
  notifyRpcRateLimitedIfNeeded,
  useRpcAvailabilityOptional,
} from "@/components/rpc-availability-gate"

type ChildGiftRow = {
  name: string
  vaultPda: string
  vaultExists: boolean
}

function CopyPill({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {}
  }
  return (
    <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="break-all font-mono text-xs text-muted-foreground">{value}</p>
      {sub}
    </div>
  )
}

export function GiftDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { address, connect, connected } = useWallet()
  const rpcAvail = useRpcAvailabilityOptional()
  const { children } = useChildren()
  const [rows, setRows] = useState<ChildGiftRow[]>([])
  const [loading, setLoading] = useState(false)
  const cluster = getSolanaCluster()

  const loadVaultRows = useCallback(async () => {
    if (!address) {
      setRows([])
      return
    }
    const parent = new PublicKey(address)
    const withBen = children.filter((c) => c.beneficiaryAddress?.trim())
    if (withBen.length === 0) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const conn = await getConnection()
      const out: ChildGiftRow[] = []
      for (const c of withBen) {
        const ben = new PublicKey(c.beneficiaryAddress!.trim())
        const vaultPda = deriveVaultPDA(parent, ben).toBase58()
        const unlock = await getSolVaultUnlockTimestamp(conn, parent, ben)
        out.push({
          name: c.name,
          vaultPda,
          vaultExists: unlock != null,
        })
      }
      setRows(out)
    } catch (e) {
      if (notifyRpcRateLimitedIfNeeded(e, rpcAvail?.reportRateLimited)) {
        setRows([])
        return
      }
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [address, children, rpcAvail?.reportRateLimited])

  useEffect(() => {
    if (!open) return
    void loadVaultRows()
  }, [open, loadVaultRows])

  const [parentCopied, setParentCopied] = useState(false)
  const copyParent = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setParentCopied(true)
      setTimeout(() => setParentCopied(false), 2000)
    } catch (_) {}
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Gift funds
          </DialogTitle>
          <DialogDescription>
            SOL sent to a <strong>child&apos;s wallet</strong> stays in that wallet — Nest does not
            move it into a vault automatically (that would require their signature). To gift into a{" "}
            <strong>time-locked vault</strong> that shows in Nest, send SOL to that child&apos;s{" "}
            <strong>vault address</strong> below (after a first lock exists).
          </DialogDescription>
          <p className="text-xs text-muted-foreground">
            Network: <span className="font-medium text-foreground">{cluster}</span> — gifts must be
            on the same network as Nest.
          </p>
        </DialogHeader>

        {!connected && (
          <Button type="button" onClick={() => void connect()}>
            Connect wallet
          </Button>
        )}

        {connected && address && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Gift into a child&apos;s vault (Nest)
              </h4>
              {loading && (
                <p className="text-sm text-muted-foreground">Loading vault addresses…</p>
              )}
              {!loading && rows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add a child with a wallet address to show vault deposit addresses.
                </p>
              )}
              {!loading &&
                rows.map((r) => (
                  <div
                    key={r.vaultPda}
                    className="mb-4 rounded-lg border border-border bg-card/40 p-3"
                  >
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                      <VaultGiftQrPanel
                        vaultPda={r.vaultPda}
                        childName={r.name}
                        size={140}
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <CopyPill
                          label={r.name}
                          value={r.vaultPda}
                          sub={
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              {!r.vaultExists ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  No vault yet — parent must use <strong>Lock SOL</strong> once
                                  first; then gifts to this address add to the same lock.
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  Vault active — SOL sent here stacks in the locked vault.
                                </span>
                              )}
                              <a
                                href={solanaAccountUrl(r.vaultPda)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary underline"
                              >
                                Explorer <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Or send to your (parent) wallet
              </h4>
              <p className="mb-2 text-xs text-muted-foreground">
                You can receive SOL here, then use <strong>Lock SOL</strong> to move it into a vault.
              </p>
              <p className="break-all rounded-md border bg-muted/50 p-3 font-mono text-sm">
                {address}
              </p>
              <Button onClick={copyParent} className="mt-2 gap-2" variant="secondary">
                {parentCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {parentCopied ? "Copied" : "Copy parent address"}
              </Button>
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={onClose}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
