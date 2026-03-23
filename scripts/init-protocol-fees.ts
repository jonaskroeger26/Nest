/**
 * One-time per cluster: initialize kids-vault `protocol_fees` PDA (treasury + fee bps).
 * Run after upgrading the program to a build that includes protocol fees.
 *
 * From `fatherhood/`:
 *   SOLANA_RPC_URL=https://api.testnet.solana.com \
 *   NEST_INIT_ADMIN_KEYPAIR=~/.config/solana/id.json \
 *   npx tsx scripts/init-protocol-fees.ts <TREASURY_PUBKEY> [fee_bps]
 *
 * Defaults: fee_bps = 50 (0.5%). On-chain max = 1000 (10%).
 * Treasury receives fees from create_vault, withdraw, and execute_auto_save.
 */

import fs from "node:fs"
import path from "node:path"
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js"
import {
  buildInitProtocolFeesInstruction,
  fetchProtocolFeesConfig,
} from "../lib/solana-vault"

function expandHome(p: string): string {
  if (p.startsWith("~/")) {
    return path.join(process.env.HOME ?? "", p.slice(2))
  }
  return p
}

async function main() {
  const treasuryStr = process.argv[2]
  const feeBps = parseInt(process.argv[3] ?? "50", 10)
  if (!treasuryStr) {
    console.error(
      "Usage: npx tsx scripts/init-protocol-fees.ts <TREASURY_PUBKEY> [fee_bps]"
    )
    process.exit(1)
  }
  if (feeBps < 0 || feeBps > 1_000) {
    console.error("fee_bps must be 0..1000")
    process.exit(1)
  }

  const kpRaw =
    process.env.NEST_INIT_ADMIN_KEYPAIR ??
    path.join(process.env.HOME ?? "", ".config/solana/id.json")
  const kpPath = expandHome(kpRaw)
  const secret = JSON.parse(fs.readFileSync(kpPath, "utf8")) as number[]
  const admin = Keypair.fromSecretKey(Uint8Array.from(secret))
  const treasury = new PublicKey(treasuryStr)

  const rpc =
    process.env.SOLANA_RPC_URL?.trim() ||
    "https://api.testnet.solana.com"
  const connection = new Connection(rpc, "confirmed")

  const existing = await fetchProtocolFeesConfig(connection)
  if (existing) {
    console.log("Already initialized:", {
      admin: existing.admin.toBase58(),
      treasury: existing.treasury.toBase58(),
      feeBps: existing.feeBps,
    })
    process.exit(0)
  }

  const ix = await buildInitProtocolFeesInstruction(
    admin.publicKey,
    treasury,
    feeBps
  )
  const tx = new Transaction().add(ix)
  const sig = await sendAndConfirmTransaction(connection, tx, [admin], {
    commitment: "confirmed",
  })
  console.log("init_protocol_fees signature:", sig)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
