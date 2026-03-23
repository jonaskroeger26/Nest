"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { PublicKey } from "@solana/web3.js"
import { useWallet } from "@/hooks/use-wallet"
import { useChildren } from "@/context/children-context"
import {
  notifyRpcRateLimitedIfNeeded,
  useRpcAvailabilityOptional,
} from "@/components/rpc-availability-gate"
import {
  getConnection,
  getVaultsByCreator,
  getTokenVaultsByCreator,
  deriveVaultPDA,
  MSOL_MINT_MAINNET,
} from "@/lib/solana-vault"
import { isMainnetVaults, getKidsVaultProgramId } from "@/lib/solana-config"

const SOL_VAULT_DATA_LEN = 81

type VaultBalancesValue = {
  byBeneficiarySol: Record<string, number>
  totalSol: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const VaultBalancesContext = createContext<VaultBalancesValue | null>(null)

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, 600 * (i + 1)))
    }
  }
  throw last
}

export function VaultBalancesProvider({ children }: { children: React.ReactNode }) {
  const rpcAvail = useRpcAvailabilityOptional()
  const { address } = useWallet()
  const { children: childProfiles } = useChildren()
  const [byBeneficiarySol, setByBeneficiarySol] = useState<Record<string, number>>({})
  const [totalSol, setTotalSol] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const childrenKey = useMemo(
    () =>
      childProfiles
        .map((c) => `${c.beneficiaryAddress ?? ""}:${c.name}`)
        .sort()
        .join("|"),
    [childProfiles]
  )

  const refresh = useCallback(async () => {
    if (!address) {
      setByBeneficiarySol({})
      setTotalSol(0)
      return
    }
    setLoading(true)
    setError(null)
    const programId = getKidsVaultProgramId()
    const creator = new PublicKey(address)
    const map: Record<string, number> = {}

    const beneficiarySet = new Set<string>()
    const validPks: { ben: string; pk: PublicKey }[] = []
    for (const c of childProfiles) {
      const b = c.beneficiaryAddress?.trim()
      if (!b) continue
      try {
        const pk = new PublicKey(b)
        const key = pk.toBase58()
        if (beneficiarySet.has(key)) continue
        beneficiarySet.add(key)
        validPks.push({ ben: key, pk })
      } catch {
        /* skip invalid */
      }
    }

    try {
      const connection = await getConnection()

      // 1) Reliable: read each child vault PDA directly (public RPC often breaks getProgramAccounts)
      const chunk = 100
      for (let i = 0; i < validPks.length; i += chunk) {
        const slice = validPks.slice(i, i + chunk)
        const pdas = slice.map(({ pk }) => deriveVaultPDA(creator, pk))
        const infos = await connection.getMultipleAccountsInfo(pdas)
        slice.forEach(({ ben }, j) => {
          const acc = infos[j]
          if (
            acc &&
            acc.owner.equals(programId) &&
            acc.data.length >= SOL_VAULT_DATA_LEN
          ) {
            map[ben] = (map[ben] ?? 0) + acc.lamports / 1e9
          }
        })
      }

      // 2) SOL vaults for addresses not on child list (orphans) + backup if PDA read missed
      try {
        const solVaults = await withRetry(() =>
          getVaultsByCreator(connection, creator)
        )
        for (const v of solVaults) {
          if (!beneficiarySet.has(v.beneficiary)) {
            map[v.beneficiary] = (map[v.beneficiary] ?? 0) + v.balanceSol
          } else if ((map[v.beneficiary] ?? 0) < 1e-9) {
            map[v.beneficiary] = v.balanceSol
          }
        }
      } catch (e) {
        console.warn("[Nest] getVaultsByCreator failed (orphans may be missing)", e)
      }

      if (isMainnetVaults()) {
        try {
          const tokenVaults = await withRetry(() =>
            getTokenVaultsByCreator(connection, creator, MSOL_MINT_MAINNET)
          )
          for (const t of tokenVaults) {
            map[t.beneficiary] = (map[t.beneficiary] ?? 0) + t.tokenAmountUi
          }
        } catch (e) {
          console.warn("[Nest] getTokenVaultsByCreator failed", e)
        }
      }

      let sum = 0
      for (const v of Object.values(map)) sum += v
      setByBeneficiarySol(map)
      setTotalSol(sum)
    } catch (e) {
      if (notifyRpcRateLimitedIfNeeded(e, rpcAvail?.reportRateLimited)) {
        setError(null)
        setByBeneficiarySol({})
        setTotalSol(0)
      } else {
        setError((e as Error).message ?? "Failed to load vaults")
        setByBeneficiarySol({})
        setTotalSol(0)
      }
    } finally {
      setLoading(false)
    }
  }, [address, childrenKey, childProfiles])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <VaultBalancesContext.Provider
      value={{ byBeneficiarySol, totalSol, loading, error, refresh }}
    >
      {children}
    </VaultBalancesContext.Provider>
  )
}

export function useVaultBalances() {
  const ctx = useContext(VaultBalancesContext)
  if (!ctx) {
    throw new Error("useVaultBalances must be used within VaultBalancesProvider")
  }
  return ctx
}
