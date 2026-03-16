export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: March 2026
          </p>
        </header>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Nest is a non-custodial interface for interacting with smart contracts on
            the Solana blockchain. We do not hold, control, or custody your assets.
            You interact with Nest using your own wallet (for example, Phantom).
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Wallets &amp; on-chain data
          </h2>
          <p>
            When you use Nest, we can see your public wallet address and any on-chain
            activity that is publicly available on Solana (such as vaults you create
            or withdrawals you perform). This information is inherently public and
            visible to anyone using a blockchain explorer.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Off-chain data
          </h2>
          <p>
            We do not require you to create an account or provide personal
            identifying information in order to use the app. Any names you assign to
            children or goals in the interface are stored locally in your browser or
            derived from on-chain data, and are not treated by us as verified
            personal information.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Analytics &amp; third parties
          </h2>
          <p>
            We may use privacy-respecting analytics to understand aggregate usage
            patterns (for example, total number of page views). These tools are not
            intended to identify you personally. We do not sell or rent any data to
            third parties.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Your responsibility
          </h2>
          <p>
            You are responsible for the security of your devices, wallets, and
            private keys. If you lose access to your wallet or sign a transaction
            you did not intend to sign, we cannot recover funds for you.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Changes
          </h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will
            update the “Last updated” date at the top of this page. Your continued
            use of the app after any change means you accept the updated terms.
          </p>
        </section>
      </div>
    </main>
  )
}

