# Nest (Fatherhood)

The app uses **Solana mainnet** for vaults and RPC. To run it locally:

```bash
npm install
cp .env.example .env.local
# Edit .env.local: set YOUR_HELIUS_API_KEY (https://helius.dev) for mainnet RPC
npm run dev
```

Then open **http://localhost:3000** in your browser.

**RPC / 403 errors:** The public Solana RPC often returns `403` (rate limit). Use a [Helius](https://helius.dev) API key and set `NEXT_PUBLIC_SOLANA_RPC_MAINNET` and `SOLANA_RPC_MAINNET` in `.env.local` as in `.env.example`.

**Error 0x65 (InstructionFallbackNotFound):** The app uses program ID **56SHmZiWXW6NhgCQXSoRUct4mub9aAoCYCTXMgqRUrLW**. The on-chain program at that address must be the same build as the Anchor program in the **parent repo** (`programs/kids-vault/`). If you see "Fallback functions are not supported", deploy the program: from the **parent workspace root** (where `Anchor.toml` lives), run `anchor build -p kids_vault` then `anchor deploy -p kids_vault --provider.cluster mainnet`. You may need `rustup update` so that `anchor build` succeeds. The deploy keypair is `target/deploy/kids_vault-keypair.json` in that workspace.
