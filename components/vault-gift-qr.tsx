"use client"

import { useMemo, useState } from "react"
import QRCode from "react-qr-code"
import { useWallet } from "@/hooks/use-wallet"
import { PublicKey } from "@solana/web3.js"
import { deriveVaultPDA } from "@/lib/solana-vault"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { QrCode } from "lucide-react"

/** Solana Pay–style transfer target; many wallets accept plain address too. */
export function vaultGiftQrPayload(vaultPda: string, childName: string): string {
  const label = encodeURIComponent(`Nest · ${childName}`)
  const message = encodeURIComponent("Gift to time-locked vault")
  return `solana:${vaultPda}?label=${label}&message=${message}`
}

export function VaultGiftQrPanel({
  vaultPda,
  childName,
  size = 200,
  className = "",
}: {
  vaultPda: string
  childName: string
  size?: number
  className?: string
}) {
  const payload = useMemo(
    () => vaultGiftQrPayload(vaultPda, childName),
    [vaultPda, childName]
  )
  return (
    <div
      className={`inline-flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-3 shadow-sm dark:bg-white ${className}`}
    >
      <QRCode
        value={payload}
        size={size}
        level="M"
        fgColor="#111827"
        bgColor="#ffffff"
      />
      <p className="max-w-[220px] text-center text-[10px] text-muted-foreground dark:text-neutral-600">
        Scan with Phantom (Send) or any wallet that reads Solana payment QR codes.
      </p>
    </div>
  )
}

/** Opens a dialog with vault deposit QR for one child (parent must be connected). */
export function VaultGiftQrButton({
  childName,
  beneficiaryAddress,
}: {
  childName: string
  beneficiaryAddress: string
}) {
  const { address, connected } = useWallet()
  const [open, setOpen] = useState(false)

  const vaultPda = useMemo(() => {
    const b = beneficiaryAddress?.trim()
    if (!address || !b) return null
    try {
      return deriveVaultPDA(new PublicKey(address), new PublicKey(b)).toBase58()
    } catch {
      return null
    }
  }, [address, beneficiaryAddress])

  if (!connected || !vaultPda) return null

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => setOpen(true)}
      >
        <QrCode className="h-4 w-4" />
        Show gift QR (vault)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gift {childName}&apos;s vault</DialogTitle>
            <DialogDescription>
              This QR sends SOL to the <strong>time-locked vault</strong> for this child
              (not their personal wallet). Gifts show in Nest after the vault exists — use{" "}
              <strong>Lock SOL</strong> once first if you haven&apos;t yet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <VaultGiftQrPanel vaultPda={vaultPda} childName={childName} size={220} />
            <p className="break-all text-center font-mono text-xs text-muted-foreground">
              {vaultPda}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
