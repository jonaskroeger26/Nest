import { NextResponse } from "next/server"
import { Connection, PublicKey } from "@solana/web3.js"
import { Marinade, MarinadeConfig, BN } from "@marinade.finance/marinade-ts-sdk"

function getMainnetRpc(): string {
  const url =
    process.env.SOLANA_RPC_MAINNET ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ??
    "https://api.mainnet-beta.solana.com"
  return url
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amountSol, creator } = body as { amountSol: number; creator: string }
    if (typeof amountSol !== "number" || amountSol <= 0 || !creator) {
      return NextResponse.json(
        { error: "Missing or invalid amountSol or creator" },
        { status: 400 }
      )
    }
    const creatorPubkey = new PublicKey(creator)
    const amountLamports = Math.floor(amountSol * 1e9)
    const connection = new Connection(getMainnetRpc(), "confirmed")
    const config = new MarinadeConfig({
      connection,
      publicKey: creatorPubkey,
    })
    const marinade = new Marinade(config)
    const { transaction, associatedMSolTokenAccountAddress } =
      await marinade.deposit(new BN(amountLamports))
    transaction.feePayer = creatorPubkey
    const { blockhash } = await connection.getLatestBlockhash("confirmed")
    transaction.recentBlockhash = blockhash
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })
    const transactionBase64 = Buffer.from(serialized).toString("base64")
    const ataAddress =
      typeof associatedMSolTokenAccountAddress === "string"
        ? associatedMSolTokenAccountAddress
        : associatedMSolTokenAccountAddress.toBase58()
    return NextResponse.json({
      transactionBase64,
      associatedMSolTokenAccountAddress: ataAddress,
    })
  } catch (err) {
    console.error("build-marinade-deposit-tx", err)
    return NextResponse.json(
      { error: (err as Error).message ?? "Failed to build deposit transaction" },
      { status: 500 }
    )
  }
}
