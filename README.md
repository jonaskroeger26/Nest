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

**"Program that does not exist" or 0x65:** The app uses program ID **3R6Ft4K2yYioguKNdxiuEJ2Vhsm2B3KmwBVCAzqtvnv5**. That program must be deployed on mainnet. From the **parent workspace root** (where `Anchor.toml` and `programs/kids-vault/` live), run `anchor build -p kids_vault` then `anchor deploy -p kids_vault --provider.cluster mainnet`. Use the keypair for that program ID in `target/deploy/kids_vault-keypair.json`.
