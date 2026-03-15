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
