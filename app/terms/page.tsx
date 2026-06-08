import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          &larr; Back to home
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: June 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-zinc-400">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>By accessing or using FormForge, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Description of Service</h2>
            <p>FormForge provides an AI-powered platform that converts PDF documents into interactive fillable web forms. We store your PDFs, process form submissions, and generate filled PDFs on your behalf.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate information during registration.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. User Content</h2>
            <p>You retain all rights to the PDFs and data you upload. You represent that you have the necessary rights to use and process any content submitted through FormForge. You are solely responsible for ensuring your use complies with applicable laws.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Payment Terms</h2>
            <p>Paid plans are billed monthly or annually as selected. Subscriptions auto-renew unless canceled. Refunds are handled on a case-by-case basis. Downgrades take effect at the end of the current billing period.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Acceptable Use</h2>
            <p>You agree not to use FormForge for any unlawful purpose, to distribute malware, or to collect sensitive personal information without proper consent. We reserve the right to suspend accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Limitation of Liability</h2>
            <p>FormForge is provided &quot;as is&quot; without warranty of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability is limited to the amount you paid in the past 12 months.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">8. Termination</h2>
            <p>We may terminate or suspend your account at any time for violation of these terms. Upon termination, your data will be deleted within 30 days unless required by law to retain it.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">9. Changes to Terms</h2>
            <p>We may update these terms at any time. Material changes will be notified via email. Continued use after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">10. Contact</h2>
            <p>For questions about these terms, contact us at <span className="text-zinc-300">legal@formforge.app</span>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
