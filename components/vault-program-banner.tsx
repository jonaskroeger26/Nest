"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { getConnection } from "@/lib/solana-vault"
import { getKidsVaultProgramId, getSolanaCluster } from "@/lib/solana-config"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/** Warn when kids-vault program ID is missing on the configured cluster. */
export function VaultProgramBanner() {
  const { connected } = useWallet()
  const [missing, setMissing] = useState(false)
  const cluster = getSolanaCluster()
  const programId = getKidsVaultProgramId().toBase58()

  useEffect(() => {
    if (!connected) {
      setMissing(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const conn = await getConnection()
        const acc = await conn.getAccountInfo(getKidsVaultProgramId())
        if (cancelled) return
        setMissing(!acc?.executable)
      } catch {
        if (!cancelled) setMissing(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [connected])

  if (!connected || !missing) return null

  return (
    <Alert variant="destructive" className="mb-6 text-left">
      <AlertTitle>Vault program not on this network</AlertTitle>
      <AlertDescription className="mt-2 space-y-2 text-sm">
        <p>
          Program <code className="rounded bg-background px-1 py-0.5 text-xs">{programId}</code>{" "}
          is not deployed on <strong>{cluster}</strong>, so locks will fail.
        </p>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>
            <strong>Testnet:</strong> Vercel env{" "}
            <code className="text-xs">NEXT_PUBLIC_SOLANA_CLUSTER=testnet</code> and Phantom →
            Testnet.
          </li>
          <li>
            <strong>Mainnet:</strong> Deploy kids-vault to mainnet, then set{" "}
            <code className="text-xs">NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta</code> and your
            mainnet program ID.
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  )
}
