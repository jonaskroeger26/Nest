/**
 * Persist goals per child per wallet. On-chain/API only stores names + wallets —
 * goals are merged back in ProfileGate so they survive refresh.
 */

const STORAGE_KEY = "nest_child_goals_v1"

/** Shape stored in JSON (avoids circular import with children-context). */
export type StoredGoal = {
  id?: string
  name: string
  current: number
  target: number
  locked: boolean
  unlockDate: string
}

type WalletBucket = Record<string, { goals: StoredGoal[] }>

type Root = Record<string, WalletBucket>

export function normalizeChildStorageKey(name: string): string {
  return name.trim().toLowerCase()
}

export function loadChildGoalsMap(
  wallet: string | null | undefined
): Record<string, StoredGoal[]> {
  if (!wallet || typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const root = JSON.parse(raw) as Root
    const bucket = root[wallet]
    if (!bucket || typeof bucket !== "object") return {}
    const out: Record<string, StoredGoal[]> = {}
    for (const [k, v] of Object.entries(bucket)) {
      if (v && Array.isArray(v.goals)) out[k] = v.goals
    }
    return out
  } catch {
    return {}
  }
}

export function saveChildGoalsForWallet(
  wallet: string,
  children: { name: string; goals: StoredGoal[] }[]
) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const root = (raw ? JSON.parse(raw) : {}) as Root
    if (typeof root !== "object" || root === null) {
      throw new Error("bad root")
    }
    const bucket: WalletBucket = {}
    for (const c of children) {
      bucket[normalizeChildStorageKey(c.name)] = { goals: c.goals }
    }
    root[wallet] = bucket
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root))
  } catch {
    /* quota / private mode */
  }
}
