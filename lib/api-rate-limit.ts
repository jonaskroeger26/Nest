import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

/** Client IP for rate limiting (Vercel forwards `x-forwarded-for`). */
export function getClientIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = h.get("x-real-ip")?.trim()
  if (realIp) return realIp
  return "unknown"
}

export function isUpstashRateLimitConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  )
}

let redisSingleton: Redis | null = null
let adminLimiter: Ratelimit | null = null
let rpcLimiter: Ratelimit | null = null

function getRedis(): Redis | null {
  if (!isUpstashRateLimitConfigured()) return null
  if (!redisSingleton) {
    redisSingleton = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redisSingleton
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(Math.floor(n), 10_000)
}

/** Admin dashboard API: expensive RPC scans. Default 30 req / minute / IP. */
export function getAdminRatelimit(): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  if (!adminLimiter) {
    const perMinute = parsePositiveInt(
      process.env.NEST_RATE_LIMIT_ADMIN_PER_MINUTE,
      30
    )
    adminLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(perMinute, "1 m"),
      prefix: "nest:rl:admin",
    })
  }
  return adminLimiter
}

/** Public RPC URL proxy: default 20 req / minute / IP. */
export function getSolanaRpcRatelimit(): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  if (!rpcLimiter) {
    const perMinute = parsePositiveInt(
      process.env.NEST_RATE_LIMIT_RPC_PER_MINUTE,
      20
    )
    rpcLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(perMinute, "1 m"),
      prefix: "nest:rl:rpc",
    })
  }
  return rpcLimiter
}

function buildRateLimitedResponse(resetMs: number): NextResponse {
  const retryAfterSec = Math.max(
    1,
    Math.ceil((resetMs - Date.now()) / 1000)
  )
  return new NextResponse(
    JSON.stringify({
      error: "Too many requests. Try again shortly.",
      retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  )
}

/**
 * Apply Upstash limits inside **Route Handlers** (Node on Vercel).
 * Edge Middleware often does not see the same `UPSTASH_*` env vars — use this instead.
 */
export async function enforceApiRateLimit(
  req: Request,
  kind: "admin" | "rpc"
): Promise<
  { ok: true; headers: Record<string, string> } | { ok: false; response: NextResponse }
> {
  const disabled = process.env.NEST_RATE_LIMIT_DISABLED
  if (disabled === "1" || disabled === "true") {
    return { ok: true, headers: {} }
  }
  if (!isUpstashRateLimitConfigured()) {
    return { ok: true, headers: {} }
  }
  const rl = kind === "admin" ? getAdminRatelimit() : getSolanaRpcRatelimit()
  if (!rl) return { ok: true, headers: {} }

  const ip = getClientIpFromHeaders(req.headers)
  const prefix = kind === "admin" ? "admin" : "rpc"
  const { success, limit, remaining, reset } = await rl.limit(`${prefix}:${ip}`)
  if (!success) {
    return { ok: false, response: buildRateLimitedResponse(reset) }
  }
  return {
    ok: true,
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
    },
  }
}
