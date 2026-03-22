# Nest (Fatherhood)

**Runs on testnet until you switch.** Default RPC is **testnet** (matches program `3be5xt…`). On Vercel, don’t set `mainnet-beta` until kids-vault is deployed on mainnet and you’re ready. Use **Phantom → Testnet** and faucet SOL.

### On-chain identity & locks

- **Parent name:** signed tx `set_parent_display_name` (welcome flow or Settings → “Save name on-chain”).
- **Each child:** signed tx `register_child` — stores child display name + **child wallet** on-chain (one PDA per parent + child wallet).
- **Each SOL lock:** `create_vault` (or top-up transfer) — toast links to Solscan.
- **Withdraw:** only the **child’s wallet** can sign after unlock (enforced in the program).

**If Nest shows “program outdated” / `register_child` fails with 0x65** while Phantom + Vercel are already on **testnet**: the **on-chain bytecode** at `3be5xt…` is still the **old build** (smaller `.so`, no `register_child`). Your env vars are not the bug.

1. **Anchor 0.32** often puts the built program here (not always `target/deploy/`):

   `target/sbpf-solana-solana/release/kids_vault.so` (~370KB with `register_child`)

2. **Upgrade** that file (needs **~2.6+ SOL** on the upgrade authority wallet after any extend):

   ```bash
   cd /path/to/snake-dapp   # workspace root with programs/kids-vault
   anchor build -p kids_vault
   SO=target/sbpf-solana-solana/release/kids_vault.so
   ```

3. If `anchor upgrade` errors with **0x1** or “insufficient”, **extend** program data first (new binary is larger than old ~293KB):

   ```bash
   solana program extend 3be5xtB1AUiCxQ3dPn8bEt95VrzzEEW2cJym2wXo4rnN 80000 \
     --url https://api.testnet.solana.com
   ```

4. Then:

   ```bash
   anchor upgrade "$SO" --program-id 3be5xtB1AUiCxQ3dPn8bEt95VrzzEEW2cJym2wXo4rnN \
     --provider.cluster testnet
   ```

Fund the deploy wallet via [faucet.solana.com](https://faucet.solana.com) (Testnet) if balance is low.

Until this upgrade succeeds, Nest still loads legacy children from Supabase and **register child on-chain** will keep failing.

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

### Vercel env for auto-save (this deployment’s relayer pubkey)

In **Vercel → Project → Settings → Environment Variables**, add (Production + Preview as needed):

| Name | Example / note |
|------|----------------|
| `NEXT_PUBLIC_NEST_AUTOSAVE_RELAYER_PUBKEY` | `GE9Lu3sc3izKydLL9dqETa8YxLK8fhBpUGw68RcqCwzT` (must match `NEST_AUTOSAVE_RELAYER_SECRET`) |
| `NEST_AUTOSAVE_RELAYER_SECRET` | JSON byte array from `nest-autosave-relayer.json` (server-only, never `NEXT_PUBLIC_`) |
| `NEST_AUTOSAVE_CRON_SECRET` or `CRON_SECRET` | Same random string as local; use `CRON_SECRET` if you rely on Vercel’s Bearer header for cron |

Redeploy after changing any **`NEXT_PUBLIC_*`** variable so the browser bundle picks it up.

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

## Auto-save (allowance + relayer)

Recurring deposits are **pre-funded**: SOL sits in a program PDA (`auto_save` seeds). Only the configured **relayer** can call `execute_auto_save` to move one period’s lamports into the child’s existing **SOL vault** (same unlock timestamp as on-chain).

1. **Upgrade** `kids-vault` after pulling the new instructions (same `anchor build` / `extend` / `upgrade` flow as above; the `.so` grows again).
2. **Generate a relayer keypair** (separate from user wallets). Put the secret in **`NEST_AUTOSAVE_RELAYER_SECRET`** (JSON byte array). Fund that pubkey with a small amount of SOL for fees.
3. Set **`NEXT_PUBLIC_NEST_AUTOSAVE_RELAYER_PUBKEY`** to that pubkey (must match the secret).
4. Set **`NEST_AUTOSAVE_CRON_SECRET`** (or **`CRON_SECRET`** on Vercel — same value, Vercel sends it as `Authorization: Bearer …` on cron requests). The repo includes **`vercel.json`** with an hourly cron to **`/api/cron/auto-save`**. Locally, call the route with `Authorization: Bearer <your secret>`. The handler scans on-chain schedules for this relayer and submits `execute_auto_save` when due.

Parents start a schedule from **Quick Actions → Auto-Save** or a child card (**Auto-save allowance**). The child must already have a SOL vault (use **Lock SOL** once). The dialog loads the on-chain schedule when present: **Fund** tops up escrow; **Cancel** closes the PDA and returns remaining SOL.

## Devnet

Same as testnet but set `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`, use `anchor deploy --provider.cluster devnet`, and Phantom on Devnet. Faucet: `solana airdrop 2` on devnet.

## NestDev (admin monitoring)

Defaults (dev): **username** `admin`, **password** `admin123`.

For deployments, override in `fatherhood/.env.local` (server-only env vars):

```bash
NEST_ADMIN_USER="admin"
NEST_ADMIN_PASS="admin123"
```

Then open `http://localhost:3000/admin/nestdev`, login, then **Refresh**.
