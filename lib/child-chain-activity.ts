import { Connection, PublicKey } from "@solana/web3.js"
import { deriveVaultPDA, deriveRegisteredChildPda } from "@/lib/solana-vault"

export type ChildBoundTx = {
  signature: string
  blockTime: number | null
}

/**
 * Transactions touching this child’s on-chain records: registration PDA + SOL vault PDA.
 */
export async function fetchChildBoundTransactions(
  connection: Connection,
  parent: PublicKey,
  beneficiary: PublicKey,
  limit = 20
): Promise<ChildBoundTx[]> {
  const vault = deriveVaultPDA(parent, beneficiary)
  const reg = deriveRegisteredChildPda(parent, beneficiary)
  const [vaultSigs, regSigs] = await Promise.all([
    connection
      .getSignaturesForAddress(vault, { limit: 30 })
      .catch(() => []),
    connection
      .getSignaturesForAddress(reg, { limit: 10 })
      .catch(() => []),
  ])
  const bySig = new Map<string, number | null>()
  for (const s of [...regSigs, ...vaultSigs]) {
    const t = s.blockTime ?? null
    const cur = bySig.get(s.signature)
    if (cur === undefined || (t != null && (cur === null || t > cur))) {
      bySig.set(s.signature, t)
    }
  }
  return [...bySig.entries()]
    .map(([signature, blockTime]) => ({ signature, blockTime }))
    .sort((a, b) => {
      const ta = a.blockTime ?? 0
      const tb = b.blockTime ?? 0
      if (tb !== ta) return tb - ta
      return b.signature.localeCompare(a.signature)
    })
    .slice(0, limit)
}
