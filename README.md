# Nest (Fatherhood)

Run the app:

```bash
npm install
cp .env.example .env.local
# Edit .env.local and replace YOUR_HELIUS_API_KEY with your Helius API key (https://helius.dev)
npm run dev
```

Then open **http://localhost:3000** in your browser.

**RPC / 403 errors:** The public Solana RPC often returns `403` (rate limit). Use a [Helius](https://helius.dev) API key and set `NEXT_PUBLIC_SOLANA_RPC_MAINNET` and `SOLANA_RPC_MAINNET` in `.env.local` as in `.env.example`.

**Error 0x65 (InstructionFallbackNotFound):** The on-chain program at the ID in `lib/solana-vault.ts` must be the **same build** as the Anchor program in `programs/kids-vault/`. If you see "Fallback functions are not supported", the deployed binary doesn’t match the frontend’s instructions. Fix: from the **repo root** (where `Anchor.toml` is), run `anchor build` and `anchor deploy --provider.cluster mainnet` so the deployed program matches this codebase. The program ID in the app is set in `fatherhood/lib/solana-vault.ts`; ensure `Anchor.toml` and `programs/kids-vault/src/lib.rs` `declare_id!` match that ID (or deploy with the keypair that yields that ID).
