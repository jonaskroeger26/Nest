/** Curated answers for the in-app help assistant (keyword matching, no external AI). */

export type NestFaqEntry = {
  id: string
  /** Short grouping for UI chips */
  category: "Basics" | "Vaults" | "Money" | "Safety"
  title: string
  keywords: string[]
  /** Optional follow-up topic ids shown after a match */
  relatedIds?: string[]
  answer: string
}

export const NEST_FAQ_ENTRIES: NestFaqEntry[] = [
  {
    id: "what-is-nest",
    category: "Basics",
    title: "What is Nest?",
    keywords: [
      "what",
      "nest",
      "app",
      "product",
      "purpose",
      "about",
      "overview",
      "explain",
      "does",
    ],
    relatedIds: ["how-to-start", "wallet", "vault-vs-child"],
    answer:
      "Nest helps parents **lock SOL or mSOL** on Solana for their children with **time-based unlock rules**. You keep using your own wallet; each child has a **beneficiary wallet** that can withdraw only after the conditions you set.\n\nIt’s built for long-term savings (school, first car, etc.) without giving kids spendable crypto today.",
  },
  {
    id: "wallet",
    category: "Safety",
    title: "Do you hold my crypto?",
    keywords: [
      "custody",
      "custodial",
      "hold",
      "keys",
      "wallet",
      "phantom",
      "solflare",
      "backpack",
      "safe",
      "non-custodial",
      "trust",
      "who",
      "controls",
    ],
    relatedIds: ["lost-wallet", "vault-vs-child"],
    answer:
      "**No.** Nest is **non-custodial**: the on-chain program holds vault logic, but **you** sign txs with your browser wallet. We **never** see your seed phrase or private keys.\n\nWhoever controls the **parent wallet** approves setup actions; the **child wallet** is the beneficiary for withdrawals after unlock.",
  },
  {
    id: "vault-vs-child",
    category: "Vaults",
    title: "Vault vs child wallet",
    keywords: [
      "vault",
      "pda",
      "account",
      "address",
      "child",
      "kid",
      "kids",
      "beneficiary",
      "difference",
      "where",
      "send",
      "transfer",
      "wrong",
      "which",
    ],
    relatedIds: ["gift", "withdraw"],
    answer:
      "A **vault** is an on-chain account (often a **PDA**) tied to your rules. **Deposits and gifts** should go to the **vault address** Nest shows—not necessarily the child’s everyday wallet.\n\nThe **child’s wallet** is the **beneficiary**: after unlock, **they** sign to withdraw from the vault. Sending SOL to the wrong address can mean **lost funds**—always double-check in the UI.",
  },
  {
    id: "how-to-start",
    category: "Basics",
    title: "How do I get started?",
    keywords: [
      "start",
      "begin",
      "first",
      "setup",
      "steps",
      "connect",
      "onboarding",
      "tutorial",
      "how",
      "use",
    ],
    relatedIds: ["register-child", "lock-funds", "testnet"],
    answer:
      "1. Open **Dashboard** and **connect** your Solana wallet.\n2. **Sign** the message when asked (proves you control the wallet).\n3. **Add a child** and their wallet address.\n4. Use **Lock / Add SOL** (or mSOL) to fund a vault and set an **unlock** time.\n5. Balances update on the dashboard as the chain confirms.",
  },
  {
    id: "register-child",
    category: "Vaults",
    title: "Adding a child on-chain",
    keywords: [
      "add",
      "child",
      "register",
      "kid",
      "new",
      "profile",
      "name",
      "beneficiary",
    ],
    relatedIds: ["vault-vs-child", "lock-funds"],
    answer:
      "You register each child with a **display name** and their **beneficiary wallet** via an on-chain transaction (your wallet signs it). That ties vaults and withdrawals to the **correct** child address.\n\nIf Supabase/profile backup is enabled in your deployment, Nest may still **show** legacy data—but **on-chain** registration is the source of truth for new flows.",
  },
  {
    id: "lock-funds",
    category: "Vaults",
    title: "Locking SOL or mSOL",
    keywords: [
      "lock",
      "deposit",
      "fund",
      "save",
      "add",
      "sol",
      "top",
      "up",
      "vault",
      "create",
    ],
    relatedIds: ["msol", "withdraw", "fees"],
    answer:
      "Use **Add SOL** / lock flows on a child card to move funds into a **time-locked vault**. You choose **how much** and **when** it unlocks (per program rules).\n\nAfter you approve in the wallet, wait for confirmation—then check the dashboard and **explorer** links in toasts if something fails.",
  },
  {
    id: "msol",
    category: "Money",
    title: "mSOL and Marinade (yield)",
    keywords: [
      "msol",
      "marinade",
      "yield",
      "stake",
      "staking",
      "liquid",
      "earn",
      "interest",
      "grow",
    ],
    relatedIds: ["lock-funds", "fees"],
    answer:
      "**mSOL** is liquid staked SOL (e.g. via **Marinade**). Nest can use it so locked funds **may earn yield** while rules still apply—details depend on your cluster and program build.\n\nYield is **not guaranteed**; smart-contract and DeFi risk still apply. Read Marinade docs for protocol specifics.",
  },
  {
    id: "testnet",
    category: "Basics",
    title: "Testnet vs mainnet",
    keywords: [
      "testnet",
      "mainnet",
      "devnet",
      "fake",
      "real",
      "faucet",
      "cluster",
      "network",
    ],
    relatedIds: ["fees", "how-to-start"],
    answer:
      "If you see a **Testnet** badge, SOL is **play money**—perfect for learning. **Mainnet** is real SOL and real risk.\n\nUse a **faucet** for test SOL, set Phantom to the same cluster, and verify **Settings** / env before moving meaningful mainnet funds.",
  },
  {
    id: "auto-save",
    category: "Vaults",
    title: "What is auto-save?",
    keywords: [
      "auto",
      "autosave",
      "schedule",
      "recurring",
      "cron",
      "relayer",
      "escrow",
      "periodic",
      "automatic",
    ],
    relatedIds: ["fees", "vault-vs-child"],
    answer:
      "**Auto-save** uses an on-chain **schedule** plus **escrow** SOL. A **relayer** (e.g. Vercel cron + server key) calls **execute** when rules are met—you **fund** and can **cancel** from the app.\n\nMisconfigured cron or empty escrow means **no transfer**; check README env vars for your deployment.",
  },
  {
    id: "gift",
    category: "Money",
    title: "How do gifts work?",
    keywords: [
      "gift",
      "qr",
      "donate",
      "donation",
      "grandparent",
      "family",
      "friend",
      "send",
      "money",
      "contribute",
    ],
    relatedIds: ["vault-vs-child", "withdraw"],
    answer:
      "Open **Gift** or the **QR** on a child card to show the **vault deposit address**. Others send SOL **there** so gifts follow **your** lock rules.\n\nSending to the child’s **personal wallet** skips the vault—that’s usually **not** what you want for locked savings.",
  },
  {
    id: "withdraw",
    category: "Vaults",
    title: "When can my child withdraw?",
    keywords: [
      "withdraw",
      "unlock",
      "claim",
      "access",
      "when",
      "milestone",
      "cash",
      "out",
      "get",
      "funds",
    ],
    relatedIds: ["vault-vs-child", "lost-wallet"],
    answer:
      "Withdrawals follow the **unlock time** (and program rules) from when the vault was created. The **beneficiary wallet** must **sign** the withdraw transaction.\n\nIf dates look wrong, verify **on-chain** in an explorer (program + accounts)—the app is only a lens on chain state.",
  },
  {
    id: "fees",
    category: "Money",
    title: "Fees and rent",
    keywords: [
      "fee",
      "fees",
      "rent",
      "cost",
      "gas",
      "transaction",
      "expensive",
      "cheap",
    ],
    relatedIds: ["testnet", "msol"],
    answer:
      "Solana charges **small network fees** per signature. New accounts (vaults, schedules) need **rent-exempt** SOL locked in the account.\n\nNest doesn’t add a typical **platform fee** in the contract by default—always confirm the **program ID** and cluster you’re using.",
  },
  {
    id: "lost-wallet",
    category: "Safety",
    title: "I lost access to my wallet",
    keywords: [
      "lost",
      "recover",
      "recovery",
      "seed",
      "phrase",
      "secret",
      "forgot",
      "stolen",
      "hack",
      "hacked",
    ],
    relatedIds: ["wallet", "withdraw"],
    answer:
      "If you lose the **parent** seed phrase, **no one** (including Nest) can recover funds for you.\n\nIf a **child** loses access before withdraw, that’s critical—plan backups, hardware wallets, or legal arrangements for large amounts. **Not financial or legal advice.**",
  },
  {
    id: "program-explorer",
    category: "Safety",
    title: "Program ID and explorers",
    keywords: [
      "program",
      "contract",
      "explorer",
      "solscan",
      "solana",
      "verify",
      "audit",
      "code",
      "github",
    ],
    relatedIds: ["wallet", "fees"],
    answer:
      "Nest shows the **kids-vault program ID** in settings/banners when configured. Paste it into **Solscan** (or similar) for your cluster to inspect transactions and accounts.\n\nOpen-source code is on **GitHub**—always verify you’re interacting with the **intended** deployed program.",
  },
  {
    id: "goals",
    category: "Basics",
    title: "Goals on child cards",
    keywords: [
      "goal",
      "goals",
      "milestone",
      "target",
      "savings",
      "track",
      "progress",
    ],
    relatedIds: ["lock-funds", "gift"],
    answer:
      "**Goals** help you **track** savings targets in the UI (e.g. college fund). They’re mainly **organizational**—actual locked funds still follow **vault** rules on-chain.\n\nUse goals alongside **locks** and **gifts** to see progress toward a number you care about.",
  },
  {
    id: "disconnect",
    category: "Basics",
    title: "Wallet disconnect & switching",
    keywords: [
      "disconnect",
      "logout",
      "log",
      "out",
      "switch",
      "change",
      "wallet",
      "another",
    ],
    relatedIds: ["how-to-start", "wallet"],
    answer:
      "Use the **profile menu** (avatar) → **Disconnect** to clear the connected address in Nest. To use **another wallet**, disconnect first—then connect again and **sign** when prompted.\n\nEach wallet has its **own** on-chain parent state; they don’t share children automatically.",
  },
]

/** Map informal words → extra tokens for matching */
const SYNONYM_GROUPS: string[][] = [
  ["child", "children", "kid", "kids", "son", "daughter"],
  ["withdraw", "withdrawal", "claim", "cashout", "take"],
  ["lock", "locked", "locking", "save", "saving", "deposit"],
  ["gift", "gifts", "donate", "donation", "present"],
  ["wallet", "phantom", "solflare", "address"],
  ["fee", "fees", "cost", "rent", "gas"],
  ["safe", "safety", "secure", "security", "risk"],
]

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "her",
  "was",
  "one",
  "our",
  "out",
  "day",
  "get",
  "has",
  "him",
  "his",
  "how",
  "its",
  "may",
  "new",
  "now",
  "old",
  "see",
  "two",
  "who",
  "way",
  "use",
  "any",
  "did",
  "let",
  "put",
  "say",
  "she",
  "too",
  "tell",
  "from",
  "that",
  "this",
  "with",
  "have",
  "what",
  "when",
  "will",
  "your",
  "into",
  "just",
  "like",
  "know",
  "want",
  "need",
  "does",
  "about",
  "after",
  "also",
  "been",
  "being",
  "could",
  "should",
  "would",
  "their",
  "there",
  "these",
  "them",
  "then",
  "than",
  "some",
  "very",
  "where",
  "which",
  "while",
  "help",
  "please",
  "thanks",
  "thank",
  "hello",
  "hey",
  "hi",
])

function expandTokens(words: string[]): string[] {
  const out = new Set(words)
  for (const w of words) {
    for (const group of SYNONYM_GROUPS) {
      if (group.includes(w)) {
        group.forEach((x) => out.add(x))
      }
    }
  }
  return [...out]
}

function tokenize(s: string): string[] {
  const raw = s
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
  return expandTokens(raw)
}

function entryTokens(entry: NestFaqEntry): Set<string> {
  const fromTitle = tokenize(entry.title.replace(/[?.,]/g, ""))
  const fromKw = expandTokens(entry.keywords.map((k) => k.toLowerCase()))
  const fromAnswer = tokenize(entry.answer.slice(0, 220))
  return new Set([...fromTitle, ...fromKw, ...fromAnswer])
}

/** Score query against one entry; higher is better. */
function scoreEntry(query: string, entry: NestFaqEntry): number {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  const qWords = tokenize(q)
  const qSet = new Set(qWords)
  let score = 0

  const titleLower = entry.title.toLowerCase()
  if (titleLower.includes(q)) score += 14
  if (q.includes(titleLower.slice(0, Math.min(12, titleLower.length))))
    score += 10

  const eTokens = entryTokens(entry)
  for (const w of qSet) {
    if (eTokens.has(w)) score += 4
  }
  for (const kw of entry.keywords) {
    if (q.includes(kw)) score += 6
    if (qSet.has(kw)) score += 5
  }

  // Light fuzzy: prefix / substring on keywords
  for (const w of qWords) {
    if (w.length < 4) continue
    for (const kw of entry.keywords) {
      if (kw.length >= 4 && (kw.startsWith(w) || w.startsWith(kw)))
        score += 2
    }
  }

  return score
}

export type RankedFaq = { entry: NestFaqEntry; score: number }

/** Top matches sorted by score descending. */
export function rankNestFaq(query: string, topK = 5): RankedFaq[] {
  const q = query.trim()
  if (!q) return []
  const ranked: RankedFaq[] = NEST_FAQ_ENTRIES.map((entry) => ({
    entry,
    score: scoreEntry(q, entry),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
  return ranked.slice(0, topK)
}

const FALLBACK_BODY =
  "I couldn’t match that to a specific topic. Try one of the **suggested questions** below, use a shorter phrase (e.g. “gifts”, “testnet”, “auto-save”), or open the **Tour** tab for a walkthrough.\n\nI’m a **built-in guide**—no live AI—so typos and very long questions are harder to match."

export type NestAnswer = {
  title: string
  body: string
  confidence: "high" | "medium" | "low"
  matched: NestFaqEntry | null
  /** Other plausible topics (for “You might mean” chips) */
  alternatives: NestFaqEntry[]
  /** Follow-up topics when we have a strong/medium match */
  related: NestFaqEntry[]
}

function byId(id: string): NestFaqEntry | undefined {
  return NEST_FAQ_ENTRIES.find((e) => e.id === id)
}

export function answerNestQuestion(query: string): NestAnswer {
  const ranked = rankNestFaq(query, 8)
  const best = ranked[0]

  if (!best || best.score < 4) {
    return {
      title: "Nest assistant",
      body: FALLBACK_BODY,
      confidence: "low",
      matched: null,
      alternatives: ranked.slice(0, 5).map((r) => r.entry),
      related: [],
    }
  }

  // Uncertain range: suggest topics instead of guessing one answer
  if (best.score < 8) {
    return {
      title: "Which topic did you mean?",
      body: "I found a few possible matches. Tap one below, or ask with a **shorter phrase** (e.g. **gift**, **withdraw**, **testnet**).",
      confidence: "low",
      matched: null,
      alternatives: ranked.filter((r) => r.score >= 4).slice(0, 5).map((r) => r.entry),
      related: [],
    }
  }

  const confidence: NestAnswer["confidence"] =
    best.score >= 16 ? "high" : best.score >= 11 ? "medium" : "low"

  const alternatives = ranked
    .slice(1)
    .filter((r) => r.score >= 6)
    .slice(0, 3)
    .map((r) => r.entry)

  const related: NestFaqEntry[] = []
  if (best.entry.relatedIds) {
    for (const id of best.entry.relatedIds) {
      const e = byId(id)
      if (e && e.id !== best.entry.id) related.push(e)
    }
  }

  return {
    title: best.entry.title,
    body: best.entry.answer,
    confidence,
    matched: best.entry,
    alternatives: confidence === "low" ? alternatives : [],
    related: related.slice(0, 4),
  }
}

/** @deprecated use rankNestFaq / answerNestQuestion */
export function matchNestFaq(query: string): NestFaqEntry | null {
  const r = rankNestFaq(query, 1)[0]
  if (!r || r.score < 8) return null
  return r.entry
}

/** Filter entries by chip search (title + keywords). */
export function filterFaqEntries(search: string, limit = 20): NestFaqEntry[] {
  const q = search.trim().toLowerCase()
  if (!q) return NEST_FAQ_ENTRIES.slice(0, limit)
  return NEST_FAQ_ENTRIES.filter((e) => {
    if (e.title.toLowerCase().includes(q)) return true
    if (e.keywords.some((k) => k.includes(q) || q.includes(k))) return true
    if (e.category.toLowerCase().includes(q)) return true
    return false
  }).slice(0, limit)
}
