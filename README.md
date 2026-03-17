# Nest (Fatherhood)

**Runs on testnet until you switch.** Default RPC is **testnet** (matches program `3be5xt…`). On Vercel, don’t set `mainnet-beta` until kids-vault is deployed on mainnet and you’re ready. Use **Phantom → Testnet** and faucet SOL.

### On-chain identity & locks

- **Parent name:** signed tx `set_parent_display_name` (welcome flow or Settings → “Save name on-chain”).
- **Each child:** signed tx `register_child` — stores child display name + **child wallet** on-chain (one PDA per parent + child wallet).
- **Each SOL lock:** `create_vault` (or top-up transfer) — toast links to Solscan.
- **Withdraw:** only the **child’s wallet** can sign after unlock (enforced in the program).

Redeploy **kids-vault** from this repo after pulling the latest `programs/kids-vault/src/lib.rs`; older deployments won’t have `register_child` / `set_parent_display_name`. Until you redeploy, Nest still loads legacy children from Supabase.

## Testnet (try vaults first)

1. **Deploy kids-vault on testnet** (from workspace root — parent of `fatherhood/`).  
   Run **one command per line** (don’t paste comment text into the terminal).

   ```bash
   solana config set --url https://api.testnet.solana.com
   ```

   Fund the wallet that pays for deploy (`~/.config/solana/id.json`). Deploy needs **~2.1 SOL on testnet** (not your mainnet balance):

   ```bash
   solana airdrop 5
   ```

   If CLI airdrop hits **rate limit**, use in order:

   1. **[faucet.solana.com](https://faucet.solana.com)** — pick **Testnet**, paste your address (`solana address`), request SOL. Repeat after cooldown if you need ~2 SOL for deploy.
   2. **Use devnet instead** (CLI airdrops usually work better):  
      `solana config set --url https://api.devnet.solana.com` → `solana airdrop 2` (repeat) →  
      `anchor deploy -p kids_vault --provider.cluster devnet`  
      In `.env.local`: `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`, Phantom on **Devnet**.

   ```bash
   anchor build -p kids_vault
   anchor deploy -p kids_vault --provider.cluster testnet
   ```

   Program ID must match `programs/kids-vault/src/lib.rs` and `target/deploy/kids_vault-keypair.json`.

2. **Phantom:** Settings → Developer Settings → enable **Testnet Mode** (or switch network to Testnet).

3. **App env:** In `fatherhood/`:

   ```bash
   cp .env.example .env.local
   ```

   Ensure `NEXT_PUBLIC_SOLANA_CLUSTER=testnet` and `NEXT_PUBLIC_KIDS_VAULT_PROGRAM_ID` matches your deploy.

4. Run: `npm run dev` → http://localhost:3000

On testnet, only **plain SOL vaults** work (mSOL / Marinade is mainnet-only).

## Vercel

The app **defaults to testnet** (same as default program `3be5xt…`). If you see **“program does not exist”**, you were on **mainnet** RPC with a **testnet-only** program.

- **Testnet demo:** set `NEXT_PUBLIC_SOLANA_CLUSTER=testnet` (or omit — default), `NEXT_PUBLIC_KIDS_VAULT_PROGRAM_ID=3be5xt…`, Phantom on Testnet.
- **Mainnet:** `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta`, Helius RPC envs, deploy kids-vault to mainnet, set that program ID.

## Mainnet

```bash
# .env.local
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_KIDS_VAULT_PROGRAM_ID=<program ID after mainnet deploy>
```

Deploy: `anchor deploy -p kids_vault --provider.cluster mainnet` with the **same** program keypair as testnet if you want one program ID on both (optional).

**RPC / 403:** Public mainnet RPC often returns 403 — use Helius.

## Devnet

Same as testnet but set `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`, use `anchor deploy --provider.cluster devnet`, and Phantom on Devnet. Faucet: `solana airdrop 2` on devnet.
