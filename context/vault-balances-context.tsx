"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { PublicKey } from "@solana/web3.js"
import { useWallet } from "@/hooks/use-wallet"
import {
  getConnection,
  getVaultsByCreator,
  getTokenVaultsByCreator,
  MSOL_MINT_MAINNET,
} from "@/lib/solana-vault"
import { isMainnetVaults } from "@/lib/solana-config"

type VaultBalancesValue = {
  byBeneficiarySol: Record<string, number>
  totalSol: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const VaultBalancesContext = createContext<VaultBalancesValue | null>(null)

export function VaultBalancesProvider({ children }: { children: React.ReactNode }) {
  const { address } = useWallet()
  const [byBeneficiarySol, setByBeneficiarySol] = useState<Record<string, number>>({})
  const [totalSol, setTotalSol] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!address) {
      setByBeneficiarySol({})
      setTotalSol(0)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const connection = await getConnection()
      const creator = new PublicKey(address)
      const map: Record<string, number> = {}
      let sum = 0
      const solVaults = await getVaultsByCreator(connection, creator)
      for (const v of solVaults) {
        sum += v.balanceSol
        map[v.beneficiary] = (map[v.beneficiary] ?? 0) + v.balanceSol
      }
      if (isMainnetVaults()) {
        const tokenVaults = await getTokenVaultsByCreator(
          connection,
          creator,
          MSOL_MINT_MAINNET
        )
        for (const t of tokenVaults) {
          sum += t.tokenAmountUi
          map[t.beneficiary] = (map[t.beneficiary] ?? 0) + t.tokenAmountUi
        }
      }
      setByBeneficiarySol(map)
      setTotalSol(sum)
    } catch (e) {
      setError((e as Error).message ?? "Failed to load vaults")
    } finally {
      setLoading(false)
    }
  }, [address])

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
