/**
 * Load-test YOUR Nest deployment to verify Upstash rate limits (429 responses).
 *
 * ⚠️  Only run against domains and infrastructure you own. Do not use against third parties.
 *
 * From `fatherhood/`:
 *   npx tsx scripts/stress-test-rate-limit.ts https://your-app.vercel.app
 *   (Use your real deployment host from Vercel — “nest.id” in the UI is often not the DNS name.)
 *
 * Args: <baseUrl> [totalRequests] [concurrency]
 * Env overrides:
 *   NEST_STRESS_BASE_URL   — if set, used when no URL arg
 *   NEST_STRESS_PATH       — default /api/solana-rpc (e.g. /api/admin/nestdev)
 *   NEST_STRESS_TOTAL      — default 80 (must exceed 20/min RPC default)
 *   NEST_STRESS_CONCURRENCY — default 40 (finish burst inside one minute)
 *
 * Expect: many 200 (or 401 on admin without cookie), then 429 once you exceed the per-minute limit.
 * If you get zero 429s, run the probe line: no X-RateLimit-* usually means Upstash env missing on Vercel.
 */

function normalizeBase(url: string): string {
  return url.replace(/\/$/, "")
}

function fetchHint(err: unknown, hostname: string): string {
  const msg = String((err as Error)?.message ?? err)
  const cause = (err as { cause?: { code?: string } })?.cause
  const code = cause?.code ?? ""
  if (code === "ENOTFOUND" || msg.includes("ENOTFOUND")) {
    return (
      `\nDNS could not resolve this host (${hostname}).\n` +
        `  → In Vercel: open your project → Deployments → click the latest → copy the real URL (usually *.vercel.app).\n` +
        `  → Or use the custom domain that actually has DNS pointed at Vercel.\n` +
        `  The marketing name “nest.id” is not always the same as the hostname your computer can reach.`
    )
  }
  if (code === "CERT_HAS_EXPIRED" || msg.includes("certificate")) {
    return "\nTLS/certificate error — check the URL (https vs http)."
  }
  return `\n${msg}`
}

/** Host or full URL, not a numeric concurrency/total arg. */
function looksLikeHostOrUrl(s: string): boolean {
  if (/^https?:\/\//i.test(s)) return true
  if (s === "localhost" || /^localhost:\d+$/i.test(s)) return true
  // nest.id, example.com, app.vercel.app
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(s)
}

function parseArgs(): {
  base: string
  path: string
  total: number
  concurrency: number
} {
  const argv = process.argv.slice(2).filter((a) => a.length > 0)
  let base =
    process.env.NEST_STRESS_BASE_URL?.trim() ||
    argv.find((a) => looksLikeHostOrUrl(a)) ||
    ""
  let path = (process.env.NEST_STRESS_PATH ?? "/api/solana-rpc").trim() || "/api/solana-rpc"
  if (!path.startsWith("/")) path = "/" + path

  const nums = argv.filter((a) => /^\d+$/.test(a)).map((a) => Number(a))
  const total = nums[0] ?? Number(process.env.NEST_STRESS_TOTAL ?? "80")
  const concurrency = nums[1] ?? Number(process.env.NEST_STRESS_CONCURRENCY ?? "40")

  return {
    base: normalizeBase(base),
    path,
    total: Number.isFinite(total) && total > 0 ? Math.min(total, 50_000) : 80,
    concurrency:
      Number.isFinite(concurrency) && concurrency > 0
        ? Math.min(concurrency, 200)
        : 40,
  }
}

async function main() {
  const cfg = parseArgs()
  if (cfg.base && !/^https?:\/\//i.test(cfg.base)) {
    cfg.base = "https://" + cfg.base.replace(/^\/+/, "")
  }
  if (!cfg.base) {
    // eslint-disable-next-line no-console
    console.error(
      "Usage: npx tsx scripts/stress-test-rate-limit.ts <host-or-url> [totalRequests] [concurrency]\n" +
        "Example: npx tsx scripts/stress-test-rate-limit.ts my-nest.vercel.app\n" +
        "Run from the Nest app folder (the one that contains package.json and scripts/). Or set NEST_STRESS_BASE_URL."
    )
    process.exit(1)
  }

  const targetBase = `${cfg.base}${cfg.path}`
  // eslint-disable-next-line no-console
  console.log("Stress test (your infra only)")
  // eslint-disable-next-line no-console
  console.log("Target:", targetBase)
  // eslint-disable-next-line no-console
  console.log("Total:", cfg.total, "Concurrency:", cfg.concurrency)
  // eslint-disable-next-line no-console
  console.log("---")

  const probeUrl = `${targetBase}${targetBase.includes("?") ? "&" : "?"}__rlprobe=1`
  let probe: Response
  try {
    probe = await fetch(probeUrl, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    })
  } catch (e) {
    let host = ""
    try {
      host = new URL(cfg.base).hostname
    } catch {
      host = cfg.base.replace(/^https?:\/\//i, "")
    }
    // eslint-disable-next-line no-console
    console.error("Probe failed (cannot reach server):", fetchHint(e, host))
    process.exit(1)
  }
  const lim = probe.headers.get("x-ratelimit-limit")
  const rem = probe.headers.get("x-ratelimit-remaining")
  // eslint-disable-next-line no-console
  console.log(
    "Probe:",
    probe.status,
    lim != null
      ? `(rate limit active: X-RateLimit-Limit=${lim} remaining=${rem ?? "?"})`
      : "(no X-RateLimit-* on probe — add UPSTASH_* on Vercel, redeploy latest Nest, or hit the wrong URL)"
  )
  // eslint-disable-next-line no-console
  console.log("---")

  const statusCounts = new Map<number, number>()
  let done = 0
  const t0 = Date.now()

  async function one(i: number): Promise<void> {
    try {
      const sep = targetBase.includes("?") ? "&" : "?"
      const url = `${targetBase}${sep}__ts=${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "X-Stress-Test": "nest-rate-limit",
        },
      })
      const s = res.status
      statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1)
      done++
      if (done % 25 === 0 || s === 429) {
        // eslint-disable-next-line no-console
        console.log(`  ${done}/${cfg.total} … last status ${s}${s === 429 ? " (rate limited)" : ""}`)
      }
    } catch (e) {
      statusCounts.set(-1, (statusCounts.get(-1) ?? 0) + 1)
      done++
      // eslint-disable-next-line no-console
      console.error(`  req ${i} error:`, (e as Error)?.message ?? e)
    }
  }

  let next = 0
  async function worker(): Promise<void> {
    while (next < cfg.total) {
      const i = next++
      await one(i)
    }
  }

  const workers = Array.from(
    { length: Math.min(cfg.concurrency, cfg.total) },
    () => worker()
  )
  await Promise.all(workers)

  const ms = Date.now() - t0
  // eslint-disable-next-line no-console
  console.log("---")
  // eslint-disable-next-line no-console
  console.log(`Done in ${ms}ms (${(cfg.total / (ms / 1000)).toFixed(1)} req/s)`)
  // eslint-disable-next-line no-console
  console.log("Status counts:")
  for (const [code, n] of [...statusCounts.entries()].sort((a, b) => a[0] - b[0])) {
    const label = code === -1 ? "network_error" : String(code)
    // eslint-disable-next-line no-console
    console.log(`  ${label}: ${n}`)
  }

  const n429 = statusCounts.get(429) ?? 0
  if (n429 === 0) {
    // eslint-disable-next-line no-console
    console.log(
      "\nNo 429 yet. If the probe showed no X-RateLimit-* headers, fix Vercel env + redeploy first.\n" +
        "Otherwise: raise total (e.g. 200), raise concurrency (e.g. 80), or temporarily lower NEST_RATE_LIMIT_RPC_PER_MINUTE on Vercel."
    )
  } else {
    // eslint-disable-next-line no-console
    console.log("\nRate limiting responded with 429 — looks good.")
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e)
  process.exit(1)
})
