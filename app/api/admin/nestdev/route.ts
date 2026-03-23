import { NextResponse } from "next/server"
import { Connection, PublicKey } from "@solana/web3.js"
import { enforceApiRateLimit } from "@/lib/api-rate-limit"
import { decodeDisplayName32 } from "@/lib/solana-vault"
import { getKidsVaultProgramId } from "@/lib/solana-config"
import { getServerSolanaCluster, getServerSolanaRpcUrl } from "@/lib/server-solana-env"

export const runtime = "nodejs"

const COOKIE_NAME = "nest_admin"

function requireAdmin(req: Request): NextResponse | null {
  const got = req.headers.get("cookie") ?? ""
  const match = got
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(COOKIE_NAME + "="))
  const value = match ? decodeURIComponent(match.split("=", 2)[1] ?? "") : ""
  if (value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

type ParentRow = {
  parent: string
  displayName: string | null
  parentSol: number
  children: Array<{
    beneficiary: string
    name: string
    registeredAt: number
    childSol: number
    pda: string
  }>
}

// Anchor account sizes from kids-vault
const PARENT_PROFILE_DATA_SIZE = 8 + 32 + 32 + 1 // 73
const REGISTERED_CHILD_DATA_SIZE = 8 + 32 + 32 + 32 + 8 + 1 + 1 // 114

function lamportsToSol(lamports: number) {
  return lamports / 1_000_000_000
}

export async function GET(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const programId = getKidsVaultProgramId()
  const conn = new Connection(getServerSolanaRpcUrl(), "confirmed")

  // Fetch all parent profiles
  const parentProfiles = await conn.getProgramAccounts(programId, {
    filters: [{ dataSize: PARENT_PROFILE_DATA_SIZE }],
  })

  // Fetch all registered children records
  const children = await conn.getProgramAccounts(programId, {
    filters: [{ dataSize: REGISTERED_CHILD_DATA_SIZE }],
  })

  const parentsByKey = new Map<string, ParentRow>()

  for (const { account } of parentProfiles) {
    const d = account.data
    if (d.length < PARENT_PROFILE_DATA_SIZE) continue
    const parent = new PublicKey(d.subarray(8, 40)).toBase58()
    const displayName = decodeDisplayName32(d.subarray(40, 72)) || null
    parentsByKey.set(parent, {
      parent,
      displayName,
      parentSol: 0,
      children: [],
    })
  }

  for (const { pubkey, account } of children) {
    const d = account.data
    if (d.length < REGISTERED_CHILD_DATA_SIZE) continue
    const parent = new PublicKey(d.subarray(8, 40)).toBase58()
    const beneficiary = new PublicKey(d.subarray(40, 72)).toBase58()
    const name = decodeDisplayName32(d.subarray(72, 104)) || "Child"
    const dv = new DataView(d.buffer, d.byteOffset, d.length)
    const registeredAt = Number(dv.getBigInt64(104, true))

    if (!parentsByKey.has(parent)) {
      parentsByKey.set(parent, {
        parent,
        displayName: null,
        parentSol: 0,
        children: [],
      })
    }
    parentsByKey.get(parent)!.children.push({
      beneficiary,
      name,
      registeredAt,
      childSol: 0,
      pda: pubkey.toBase58(),
    })
  }

  // Fetch balances (parents + child wallets)
  const parentKeys = [...parentsByKey.keys()].map((k) => new PublicKey(k))
  const childKeys: PublicKey[] = []
  for (const p of parentsByKey.values()) {
    for (const c of p.children) childKeys.push(new PublicKey(c.beneficiary))
  }
  const uniq = new Map<string, PublicKey>()
  for (const pk of [...parentKeys, ...childKeys]) uniq.set(pk.toBase58(), pk)
  const uniqKeys = [...uniq.values()]

  const infos = await conn.getMultipleAccountsInfo(uniqKeys, "confirmed")
  const lamportsBy = new Map<string, number>()
  for (let i = 0; i < uniqKeys.length; i++) {
    lamportsBy.set(uniqKeys[i]!.toBase58(), infos[i]?.lamports ?? 0)
  }

  for (const row of parentsByKey.values()) {
    row.parentSol = lamportsToSol(lamportsBy.get(row.parent) ?? 0)
    for (const c of row.children) {
      c.childSol = lamportsToSol(lamportsBy.get(c.beneficiary) ?? 0)
    }
    row.children.sort((a, b) => a.registeredAt - b.registeredAt)
  }

  const rows = [...parentsByKey.values()].sort(
    (a, b) => b.children.length - a.children.length
  )

  return NextResponse.json(
    {
      ok: true,
      cluster: getServerSolanaCluster(),
      rpcUrl: getServerSolanaRpcUrl(),
      programId: programId.toBase58(),
      parents: rows,
    },
    { headers: limited.headers }
  )
}

