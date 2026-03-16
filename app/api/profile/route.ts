import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-client"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get("wallet")
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("wallet", wallet)
    .maybeSingle()

  const { data: children } = await supabase
    .from("children")
    .select("child_wallet, child_name")
    .eq("parent_wallet", wallet)

  return NextResponse.json({
    name: profile?.name ?? null,
    children: children ?? [],
  })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { wallet, name, children } = body as {
    wallet: string
    name?: string | null
    children?: { child_wallet: string; child_name: string }[]
  }

  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 })
  }

  if (typeof name === "string") {
    await supabase
      .from("profiles")
      .upsert({ wallet, name }, { onConflict: "wallet" })
  }

  if (Array.isArray(children)) {
    await supabase.from("children").delete().eq("parent_wallet", wallet)
    if (children.length) {
      await supabase.from("children").insert(
        children.map((c) => ({
          parent_wallet: wallet,
          child_wallet: c.child_wallet,
          child_name: c.child_name,
        }))
      )
    }
  }

  return NextResponse.json({ ok: true })
}

