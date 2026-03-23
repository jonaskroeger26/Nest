/** Curated answers for the in-app help assistant (keyword matching, no external AI). */

export type NestFaqEntry = {
  id: string
  title: string
  keywords: string[]
  answer: string
}

export const NEST_FAQ_ENTRIES: NestFaqEntry[] = [
  {
    id: "what-is-nest",
    title: "What is Nest?",
    keywords: [
      "what",
      "nest",
      "app",
      "product",
      "purpose",
      "about",
      "overview",
    ],
    answer:
      "Nest helps parents lock SOL (or mSOL) on Solana for their children with time-based rules. You stay in control of your wallet; each child has a beneficiary wallet that can withdraw only after the unlock conditions you set.",
  },
  {
    id: "wallet",
    title: "Do you hold my crypto?",
    keywords: [
      "custody",
      "custodial",
      "hold",
      "keys",
      "wallet",
      "phantom",
      "safe",
      "non-custodial",
    ],
    answer:
      "No. Nest is non-custodial: funds move through on-chain programs and your connected wallet signs transactions. We never store your seed phrase. Keep your wallet secure—whoever controls the parent wallet approves actions; the child wallet receives withdrawals after unlock.",
  },
  {
    id: "vault-vs-child",
    title: "Vault vs child wallet",
    keywords: [
      "vault",
      "pda",
      "address",
      "child",
      "beneficiary",
      "difference",
      "where",
      "send",
      "gift",
    ],
    answer:
      "Each lock uses an on-chain vault (a program-derived account). Gifts and deposits go to the vault address shown in the app—not the same as sending SOL to the child’s personal wallet. The child’s wallet is the beneficiary that can withdraw after unlock.",
  },
  {
    id: "how-to-start",
    title: "How do I get started?",
    keywords: [
      "start",
      "begin",
      "first",
      "setup",
      "steps",
      "connect",
      "add child",
    ],
    answer:
      "1) Open Dashboard and connect your Solana wallet. 2) Sign the message when prompted. 3) Add a child and their wallet address. 4) Use Lock / Add SOL to fund a vault and set an unlock time. You’ll see balances update on the dashboard.",
  },
  {
    id: "testnet",
    title: "Testnet vs mainnet",
    keywords: [
      "testnet",
      "mainnet",
      "devnet",
      "fake",
      "real",
      "sol",
      "faucet",
    ],
    answer:
      "If you see a Testnet badge, you’re using test SOL only—good for trying the product. Mainnet uses real SOL and real risk. Always double-check the cluster shown in settings before moving meaningful funds.",
  },
  {
    id: "auto-save",
    title: "What is auto-save?",
    keywords: [
      "auto",
      "autosave",
      "schedule",
      "recurring",
      "cron",
      "relayer",
      "escrow",
    ],
    answer:
      "Auto-save lets you fund a schedule that periodically moves SOL from escrow into a child’s vault according to rules you set. Execution is done by a relayer service you configure (e.g. Vercel cron)—your wallet funds and can cancel the schedule on-chain.",
  },
  {
    id: "gift",
    title: "How do gifts work?",
    keywords: [
      "gift",
      "qr",
      "donate",
      "grandparent",
      "family",
      "deposit",
    ],
    answer:
      "Use the Gift / QR flow on a child card to show the vault deposit address (or QR). Others send SOL to that vault address so funds stay locked under your rules until unlock—not to the child’s hot wallet directly.",
  },
  {
    id: "withdraw",
    title: "When can my child withdraw?",
    keywords: [
      "withdraw",
      "unlock",
      "claim",
      "access",
      "when",
      "milestone",
    ],
    answer:
      "Withdrawals follow the unlock time and rules set when the vault was created. The beneficiary wallet must sign the withdraw transaction. If something looks wrong, verify the beneficiary address and unlock time on-chain in an explorer.",
  },
  {
    id: "fees",
    title: "Fees and rent",
    keywords: ["fee", "fees", "rent", "cost", "gas", "transaction"],
    answer:
      "Solana charges small network fees per transaction. Creating accounts (vaults, schedules) may require one-time rent in SOL. Nest does not add a separate platform fee on-chain by default—check the cluster and program you’re using.",
  },
  {
    id: "lost-wallet",
    title: "I lost access to my wallet",
    keywords: [
      "lost",
      "recover",
      "seed",
      "phrase",
      "forgot",
      "stolen",
      "hack",
    ],
    answer:
      "If you lose the parent wallet seed phrase, no one—including Nest—can recover it. If the child loses their wallet before withdraw, that’s a serious problem: plan backups and consider multisig or legal custody for large amounts. This is not financial or legal advice.",
  },
]

const FALLBACK_ANSWER =
  "I’m a built-in guide with fixed answers—try rephrasing or pick a suggested question below. For deep technical detail, check the FAQ on the homepage or Solana docs. You can also replay the tour from the **Tour** tab."

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((w) => w.length > 1)
}

/** Best-matching FAQ entry or null. */
export function matchNestFaq(query: string): NestFaqEntry | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  const words = tokenize(q)
  let best: NestFaqEntry | null = null
  let bestScore = 0

  for (const entry of NEST_FAQ_ENTRIES) {
    let score = 0
    if (entry.title.toLowerCase().includes(q)) score += 8
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += 5
      for (const w of words) {
        if (w === kw || kw.includes(w) || w.includes(kw)) score += 2
      }
    }
    for (const w of words) {
      if (entry.answer.toLowerCase().includes(w)) score += 0.5
    }
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  if (bestScore < 3) return null
  return best
}

export function answerNestQuestion(query: string): { title: string; body: string } {
  const hit = matchNestFaq(query)
  if (hit) return { title: hit.title, body: hit.answer }
  return { title: "Nest assistant", body: FALLBACK_ANSWER }
}
