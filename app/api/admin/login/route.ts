import { NextResponse } from "next/server"

const COOKIE_NAME = "nest_admin"

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = null
  }
  const username = (body as { username?: unknown } | null)?.username
  const password = (body as { password?: unknown } | null)?.password
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Dev defaults (requested): admin / admin123
  // You can override via env vars for deployment.
  const expectedUser = process.env.NEST_ADMIN_USER?.trim() || "admin"
  const expectedPass = process.env.NEST_ADMIN_PASS?.trim() || "admin123"

  if (username.trim() !== expectedUser || password !== expectedPass) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: COOKIE_NAME,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return res
}

