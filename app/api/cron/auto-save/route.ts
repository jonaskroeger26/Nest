import { NextResponse } from "next/server"
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js"
import { getKidsVaultProgramId } from "@/lib/solana-config"
import { getServerSolanaRpcUrl } from "@/lib/server-solana-env"
import {
  AUTO_SAVE_SCHEDULE_DATA_SIZE,
  buildExecuteAutoSaveInstruction,
  deriveVaultPDA,
  parseAutoSaveScheduleAccount,
} from "@/lib/solana-vault"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function cronSecrets(): string[] {
  const a = process.env.NEST_AUTOSAVE_CRON_SECRET?.trim()
  const b = process.env.CRON_SECRET?.trim()
  return [a, b].filter((x): x is string => !!x)
}

function requireCronAuth(req: Request): NextResponse | null {
  const secrets = cronSecrets()
  if (secrets.length === 0) {
    return NextResponse.json(
      {
        error:
          "Set NEST_AUTOSAVE_CRON_SECRET or CRON_SECRET (Vercel Cron uses CRON_SECRET in Authorization).",
      },
      { status: 503 }
    )
  }
  const auth = req.headers.get("authorization") ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  if (!secrets.includes(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

function loadRelayerKeypair(): Keypair | NextResponse {
  const raw = process.env.NEST_AUTOSAVE_RELAYER_SECRET?.trim()
  if (!raw) {
    return NextResponse.json(
      { error: "NEST_AUTOSAVE_RELAYER_SECRET is not set." },
      { status: 503 }
    )
  }
  try {
    const arr = JSON.parse(raw) as number[]
    if (!Array.isArray(arr) || arr.length < 64) {
      return NextResponse.json(
        { error: "NEST_AUTOSAVE_RELAYER_SECRET must be a JSON byte array (64 bytes)." },
        { status: 500 }
      )
    }
    return Keypair.fromSecretKey(Uint8Array.from(arr))
  } catch {
    return NextResponse.json(
      { error: "Invalid NEST_AUTOSAVE_RELAYER_SECRET JSON." },
      { status: 500 }
    )
  }
}

/**
 * POST or GET with `Authorization: Bearer NEST_AUTOSAVE_CRON_SECRET`.
 * Scans schedules for this relayer and runs `execute_auto_save` when due.
 * Configure Vercel Cron to hit this route on an interval (e.g. hourly).
 */
async function runAutoSaveCron(req: Request) {
  const deny = requireCronAuth(req)
  if (deny) return deny

  const kpOrErr = loadRelayerKeypair()
  if (kpOrErr instanceof NextResponse) return kpOrErr
  const relayerKp = kpOrErr

  const rpc = getServerSolanaRpcUrl()
  const connection = new Connection(rpc, "confirmed")
  const programId = getKidsVaultProgramId()
  const now = Math.floor(Date.now() / 1000)

  const accounts = await connection.getProgramAccounts(programId, {
    filters: [
      { dataSize: AUTO_SAVE_SCHEDULE_DATA_SIZE },
      {
        memcmp: {
          offset: 72,
          bytes: relayerKp.publicKey.toBase58(),
        },
      },
    ],
  })

  const executed: string[] = []
  const skipped: string[] = []
  const errors: { pda: string; message: string }[] = []

  for (const { pubkey, account } of accounts) {
    const parsed = parseAutoSaveScheduleAccount(pubkey, Buffer.from(account.data))
    if (!parsed || !parsed.active) {
      skipped.push(pubkey.toBase58())
      continue
    }
    if (now < parsed.nextExecutionUnix) {
      skipped.push(pubkey.toBase58())
      continue
    }

    try {
      const parentPk = new PublicKey(parsed.parent)
      const benPk = new PublicKey(parsed.beneficiary)
      const vaultPda = deriveVaultPDA(parentPk, benPk)
      const ix = await buildExecuteAutoSaveInstruction(
        connection,
        pubkey,
        vaultPda,
        relayerKp.publicKey
      )
      const tx = new Transaction().add(ix)
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed")
      tx.recentBlockhash = blockhash
      tx.feePayer = relayerKp.publicKey
      tx.sign(relayerKp)
      const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
      })
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      )
      executed.push(sig)
    } catch (e) {
      errors.push({
        pda: pubkey.toBase58(),
        message: (e as Error)?.message ?? String(e),
      })
    }
  }

  return NextResponse.json({
    ok: true,
    relayer: relayerKp.publicKey.toBase58(),
    scanned: accounts.length,
    executedCount: executed.length,
    signatures: executed,
    skippedPdAs: skipped,
    errors,
  })
}

export async function POST(req: Request) {
  return runAutoSaveCron(req)
}

export async function GET(req: Request) {
  return runAutoSaveCron(req)
}
