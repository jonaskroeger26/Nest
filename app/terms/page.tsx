export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Use</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: March 2026
          </p>
        </header>

        <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            By using Nest, you agree to these Terms of Use. If you do not agree,
            you must not use the app.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            No financial, investment, or tax advice
          </h2>
          <p>
            Nothing in the Nest app or related materials constitutes financial,
            investment, legal, or tax advice. You are solely responsible for your
            own decisions. You should consult independent professional advisors
            before making any financial or legal decisions.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Non-custodial interface
          </h2>
          <p>
            Nest is a non-custodial user interface that helps you interact with
            smart contracts on Solana. We do not control, own, or custody your
            assets. All transactions are executed by your wallet directly on the
            blockchain. We cannot reverse, cancel, or modify transactions.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Smart contract and protocol risk
          </h2>
          <p>
            Using Nest involves interacting with third-party protocols (for
            example, Solana, Marinade Finance, RPC providers) and smart contracts,
            which may contain bugs, vulnerabilities, or be subject to exploits or
            changes. You acknowledge that:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Smart contracts may behave in unexpected ways.</li>
            <li>Yields, APY, and price data can change at any time.</li>
            <li>
              You may lose some or all of the funds you deposit, including due to
              bugs, hacks, market volatility, or protocol changes.
            </li>
          </ul>
          <p>
            You use Nest <span className="font-semibold text-foreground">at your own risk</span>.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            No guarantees
          </h2>
          <p>
            Nest is provided &quot;as is&quot; and &quot;as available&quot;
            without any warranties of any kind, express or implied. We do not
            guarantee:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              That the app, Solana, or any integrated protocol will be available,
              secure, or error-free.
            </li>
            <li>Any particular yield, APY, or performance.</li>
            <li>
              That time-locks, unlock dates, or withdrawals will behave exactly as
              you expect in all future circumstances.
            </li>
          </ul>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Limitation of liability
          </h2>
          <p>
            To the fullest extent permitted by law, the developers and contributors
            to Nest will not be liable for any direct, indirect, incidental,
            special, consequential, or exemplary damages, including loss of funds,
            profits, data, or goodwill, arising out of or in connection with your
            use of the app, even if advised of the possibility of such damages.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Your responsibilities
          </h2>
          <p>
            You are solely responsible for:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Maintaining control and security of your wallets and keys.</li>
            <li>Understanding how Solana, smart contracts, and staking work.</li>
            <li>Complying with all applicable laws and regulations.</li>
          </ul>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Eligibility &amp; jurisdiction
          </h2>
          <p>
            You may use Nest only if it is legal to do so in your jurisdiction. It
            is your responsibility to determine whether your use of the app is
            compliant with local laws and any restrictions that apply to you.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-4">
            Changes to these terms
          </h2>
          <p>
            We may update these Terms of Use from time to time. When we do, we will
            update the “Last updated” date at the top of this page. Your continued
            use of the app after any change means you accept the updated terms.
          </p>
        </section>
      </div>
    </main>
  )
}

