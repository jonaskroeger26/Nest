import type { Transaction } from "@solana/web3.js"

type Signer = { signTransaction: (t: unknown) => Promise<unknown> }

function getInjectedSigner(): Signer | null {
  if (typeof window === "undefined") return null
  const sol = window.solana
  if (sol && typeof sol === "object" && "signTransaction" in sol) {
    return sol as Signer
  }
  const phantom = (
    window as unknown as { phantom?: { solana?: Signer } }
  ).phantom?.solana
  return phantom?.signTransaction ? phantom : null
}

/** Sign with Phantom / injected Solana wallet (browser only). */
export async function signTransactionWithBrowserWallet(
  tx: Transaction
): Promise<Transaction> {
  const w = getInjectedSigner()
  if (!w) throw new Error("Wallet cannot sign transactions")
  const signed = await w.signTransaction(tx)
  return signed as Transaction
}
