#!/usr/bin/env node
/**
 * Simulate register_child on testnet (needs parent keypair with SOL).
 * Run: node scripts/sim-register-child.mjs
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js"
import { readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"

const PROGRAM = new PublicKey(
  "3be5xtB1AUiCxQ3dPn8bEt95VrzzEEW2cJym2wXo4rnN"
)
const DISC = Buffer.from([147, 197, 225, 49, 210, 4, 21, 223])
const name = Buffer.alloc(32)
name.write("TestChild")

function deriveRegisteredChild(parent, beneficiary) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("registered_child"),
      parent.toBuffer(),
      beneficiary.toBuffer(),
    ],
    PROGRAM
  )[0]
}

const kpPath =
  process.env.SOLANA_KEYPAIR ?? join(homedir(), ".config/solana/id.json")
const parent = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(readFileSync(kpPath, "utf8")))
)
const beneficiary = Keypair.generate().publicKey
const registeredChild = deriveRegisteredChild(parent.publicKey, beneficiary)

const data = Buffer.alloc(40)
DISC.copy(data, 0)
name.copy(data, 8)

const ix = new TransactionInstruction({
  programId: PROGRAM,
  keys: [
    { pubkey: registeredChild, isSigner: false, isWritable: true },
    { pubkey: parent.publicKey, isSigner: true, isWritable: true },
    { pubkey: beneficiary, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  data,
})

const conn = new Connection("https://api.testnet.solana.com", "confirmed")
const tx = new Transaction().add(ix)
tx.feePayer = parent.publicKey
const { blockhash } = await conn.getLatestBlockhash()
tx.recentBlockhash = blockhash
tx.sign(parent)

const sim = await conn.simulateTransaction(tx)
console.log("err:", sim.value.err)
console.log("logs:\n", (sim.value.logs || []).join("\n"))
