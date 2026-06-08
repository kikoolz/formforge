import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          &larr; Back to home
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: June 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-zinc-400">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Information We Collect</h2>
            <p>We collect information you provide when creating an account (name, email, password) and when using the service (PDFs, form data, submission responses). We also collect basic usage data such as page views and error logs.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. How We Use Your Information</h2>
            <p>We use your information to operate and improve FormForge, process form submissions, send notifications, and provide customer support. We do not sell your personal information or use your uploaded PDFs for training AI models.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Data Storage</h2>
            <p>Your data is stored securely on Supabase (PostgreSQL) and Vercel infrastructure. PDFs are stored in Supabase Storage with encryption at rest. We retain your data for as long as your account is active, plus 30 days after deletion.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Third-Party Services</h2>
            <p>FormForge uses the following third-party services: Stripe (payment processing), Resend (email delivery), OpenRouter (AI field detection), and OCR.space (OCR processing). Each service has its own privacy policy governing data handling.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Cookies</h2>
            <p>We use essential cookies for authentication and session management. No tracking cookies or third-party analytics cookies are used.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Data Security</h2>
            <p>We implement industry-standard security measures including encryption in transit (TLS), encryption at rest, and regular security audits. However, no method of transmission is 100% secure.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data at any time. You can export your data from the dashboard settings. To request complete deletion, contact us.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">8. Children&apos;s Privacy</h2>
            <p>FormForge is not intended for users under 13. We do not knowingly collect data from children. If you believe a child has provided us with data, contact us immediately.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">9. Contact</h2>
            <p>For privacy-related inquiries, contact us at <span className="text-zinc-300">legal@formforge.app</span>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
