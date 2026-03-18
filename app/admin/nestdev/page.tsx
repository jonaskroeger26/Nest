"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type ParentRow = {
  parent: string
  displayName: string | null
  parentSol: number
  children: Array<{
    beneficiary: string
    name: string
    registeredAt: number
    childSol: number
    pda: string
  }>
}

type NestDevPayload = {
  ok: true
  cluster: string
  rpcUrl: string
  programId: string
  parents: ParentRow[]
}

export default function NestDevPage() {
  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("admin123")
  const [status, setStatus] = useState<string | null>(null)
  const [data, setData] = useState<NestDevPayload | null>(null)
  const [loading, setLoading] = useState(false)

  const doLogin = useCallback(async () => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        setStatus("Login failed.")
        return
      }
      setStatus("Logged in.")
    } catch (e) {
      setStatus((e as Error).message ?? "Login failed.")
    } finally {
      setLoading(false)
    }
  }, [username, password])

  const refresh = useCallback(async () => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch("/api/admin/nestdev", { cache: "no-store" })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        setStatus(j?.error ?? "Unauthorized or server error.")
        setData(null)
        return
      }
      const j = (await res.json()) as NestDevPayload
      setData(j)
    } catch (e) {
      setStatus((e as Error).message ?? "Failed to load.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const parentCount = data?.parents.length ?? 0
  const childCount = useMemo(() => {
    if (!data) return 0
    return data.parents.reduce((acc, p) => acc + p.children.length, 0)
  }, [data])

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">NestDev</h1>
        <p className="text-sm text-muted-foreground">
          Admin view: all on-chain parents/children + SOL balances.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="sm:max-w-[220px]"
          />
          <Input
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sm:max-w-[260px]"
            type="password"
          />
          <div className="flex gap-2">
            <Button
              onClick={doLogin}
              disabled={loading || !username.trim() || password.length < 3}
            >
              Login
            </Button>
            <Button variant="secondary" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {status ? <div className="text-sm">{status}</div> : null}
        {data ? (
          <div className="text-xs text-muted-foreground">
            Cluster: {data.cluster} · Program: {data.programId} · RPC: {data.rpcUrl} · Parents:{" "}
            {parentCount} · Children: {childCount}
          </div>
        ) : null}
      </Card>

      <Card className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parent</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Parent SOL</TableHead>
              <TableHead className="text-right">Children</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.parents ?? []).map((p) => (
              <TableRow key={p.parent}>
                <TableCell className="font-mono text-xs">{p.parent}</TableCell>
                <TableCell>{p.displayName ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.parentSol.toFixed(4)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.children.length}
                </TableCell>
              </TableRow>
            ))}
            {!data?.parents?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  No data (login required or no parents on-chain yet).
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>

      {data?.parents?.length ? (
        <Card className="p-4 space-y-2">
          <h2 className="font-semibold">Children (grouped)</h2>
          <div className="space-y-4">
            {data.parents.map((p) => (
              <div key={p.parent} className="space-y-2">
                <div className="text-sm font-medium">
                  {p.displayName ?? "Parent"}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.parent}
                  </span>
                </div>
                {p.children.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Child wallet</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Child SOL</TableHead>
                        <TableHead className="text-right">Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.children.map((c) => (
                        <TableRow key={c.pda}>
                          <TableCell className="font-mono text-xs">
                            {c.beneficiary}
                          </TableCell>
                          <TableCell>{c.name}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c.childSol.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c.registeredAt ? new Date(c.registeredAt * 1000).toLocaleString() : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-sm text-muted-foreground">No children registered.</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

