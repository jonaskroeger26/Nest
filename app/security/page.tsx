export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Security &amp; Risk</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: March 2026
          </p>
        </header>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Nest is designed as a non-custodial interface for interacting with
            time-locked vaults on Solana. Security is a shared responsibility
            between the protocol and you as the user.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Smart contract risk
          </h2>
          <p>
            All locks and withdrawals are ultimately controlled by smart contracts
            deployed to Solana. Even with audits and best practices, smart contracts
            may still contain bugs or vulnerabilities. Exploits, economic attacks,
            or unexpected behavior are possible and may result in partial or total
            loss of funds.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Protocol &amp; dependency risk
          </h2>
          <p>
            Nest integrates with third-party infrastructure and protocols, including
            but not limited to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Solana (the underlying blockchain network),</li>
            <li>Marinade Finance (for mSOL staking),</li>
            <li>RPC providers (such as Helius or others), and</li>
            <li>Your wallet provider (such as Phantom).</li>
          </ul>
          <p>
            Outages, policy changes, or failures in any of these services can impact
            your ability to create, view, or withdraw from vaults.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Wallet &amp; key management
          </h2>
          <p>
            You are solely responsible for managing the security of your wallet,
            seed phrase, and private keys. If you lose access to your wallet or sign
            a malicious transaction, funds may be permanently lost and cannot be
            recovered by Nest or its contributors.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Time-lock behavior
          </h2>
          <p>
            Time-locked vaults are intended to be immutable until the unlock
            timestamp is reached. This design is meant to protect your children&apos;s
            future funds, but it also means that:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You may not be able to access funds before the unlock date.</li>
            <li>
              Incorrect configuration of unlock dates or beneficiaries may be
              irreversible.
            </li>
          </ul>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Best practices
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use hardware wallets where possible.</li>
            <li>Verify every transaction and message you sign.</li>
            <li>
              Start with small amounts to become comfortable with how the app and
              contracts behave.
            </li>
            <li>
              Keep an emergency fund outside of time-locked vaults for unexpected
              expenses.
            </li>
          </ul>

          <h2 className="text-base font-semibold text-foreground mt-4">
            No guarantees
          </h2>
          <p>
            As described in the Terms of Use, Nest is provided without any warranty
            or guarantee. By using the app, you acknowledge that you understand and
            accept the risks described on this page and in the Terms of Use.
          </p>
        </section>
      </div>
    </main>
  )
}

