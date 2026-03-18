"use client"

import { useEffect, useState } from "react"
import { PublicKey } from "@solana/web3.js"
import { useWallet } from "@/hooks/use-wallet"
import { getConnection } from "@/lib/solana-vault"
import {
  fetchChildBoundTransactions,
  type ChildBoundTx,
} from "@/lib/child-chain-activity"
import { solanaTxUrl } from "@/lib/solana-explorer"
import { ExternalLink } from "lucide-react"

function formatTxTime(blockTime: number | null): string {
  if (blockTime == null) return "…"
  return new Date(blockTime * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ChildVaultActivity({
  beneficiaryAddress,
}: {
  beneficiaryAddress: string
}) {
  const { address: parent } = useWallet()
  const [txs, setTxs] = useState<ChildBoundTx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!parent || !beneficiaryAddress.trim()) {
      setTxs([])
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        let ben: PublicKey
        try {
          ben = new PublicKey(beneficiaryAddress.trim())
        } catch {
          setTxs([])
          return
        }
        const connection = await getConnection()
        const list = await fetchChildBoundTransactions(
          connection,
          new PublicKey(parent),
          ben,
          15
        )
        if (!cancelled) setTxs(list)
      } catch {
        if (!cancelled) setTxs([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [parent, beneficiaryAddress])

  if (!beneficiaryAddress.trim()) {
    return (
      <p className="text-xs text-muted-foreground">
        Register this child on-chain with a wallet to see bound transactions.
      </p>
    )
  }

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground">Loading activity…</p>
    )
  }

  if (txs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No on-chain activity yet. Lock SOL for this child to create vault txs here.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Transactions for this child
      </p>
      <ul className="max-h-36 space-y-1 overflow-y-auto text-xs">
        {txs.map((t) => (
          <li key={t.signature} className="flex items-center justify-between gap-2">
            <span className="shrink-0 text-muted-foreground">
              {formatTxTime(t.blockTime)}
            </span>
            <a
              href={solanaTxUrl(t.signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-1 font-mono text-primary hover:underline"
            >
              <span className="truncate">
                {t.signature.slice(0, 6)}…{t.signature.slice(-4)}
              </span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
