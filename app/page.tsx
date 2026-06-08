'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, FileText, Link as LinkIcon, PenLine, Inbox, Mail, Check, ChevronDown, LayoutDashboard } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ThemeToggle } from '@/components/ThemeToggle'
import FormForgeLogo from '@/components/FormForgeLogo'
import { createClient } from '@/lib/supabase/client'

// ─── Accordion (no shadcn dependency) ─────────────────────────────────────────
function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg glass border-0 px-5 overflow-hidden">
          <button
            className="w-full text-left py-4 text-[14px] font-medium flex items-center justify-between gap-4 hover:no-underline"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span>{item.q}</span>
            <ChevronDown
              className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200"
              style={{ transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: open === i ? '200px' : '0', opacity: open === i ? 1 : 0 }}
          >
            <p className="text-[13px] text-muted-foreground leading-relaxed pb-4">{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Sparkles, title: 'AI Field Detection', desc: 'Claude reads your PDF and identifies every fillable field — name, email, signature, date, checkboxes — in seconds.' },
  { icon: FileText, title: 'Fillable PDF Export', desc: 'Every submission generates a perfectly filled PDF, ready to download, sign, or send.' },
  { icon: LinkIcon, title: 'Web Form Link', desc: 'Share a single link. Respondents fill it from any device — no PDF reader required.' },
  { icon: PenLine, title: 'E-Signature', desc: 'Built-in signature capture. Legally binding. Embedded into the final PDF automatically.' },
  { icon: Inbox, title: 'Submission Dashboard', desc: 'Track every response, search, filter, and export to CSV. Audit trail included.' },
  { icon: Mail, title: 'Email Notifications', desc: 'Get notified the moment a form is submitted. Auto-reply respondents with a confirmation.' },
]

const PLANS = [
  {
    name: 'Free',
    price: 0,
    yearly: 0,
    blurb: 'Try it out',
    features: ['3 forms', '10 submissions / month', 'FormForge branding'],
    cta: 'Start free',
  },
  {
    name: 'Solo',
    price: 29,
    yearly: 23,
    blurb: 'For freelancers',
    features: ['10 forms', '100 submissions / month', 'Remove branding', 'Custom redirect'],
    cta: 'Start Solo',
    popular: false,
  },
  {
    name: 'Professional',
    price: 79,
    yearly: 63,
    blurb: 'For small teams',
    features: ['50 forms', '500 submissions / month', 'Custom branding & logo', 'Integrations'],
    cta: 'Start Professional',
    popular: true,
  },
  {
    name: 'Team',
    price: 149,
    yearly: 119,
    blurb: 'For larger teams',
    features: ['Unlimited forms', 'Unlimited submissions', 'Team members', 'Priority support'],
    cta: 'Start Team',
  },
]

const FAQ = [
  { q: 'How accurate is the AI field detection?', a: 'Claude correctly identifies 95%+ of fields on standard business PDFs. You can edit any field afterward in the editor — change type, mark required, reorder, or delete.' },
  { q: 'Can my respondents fill forms on mobile?', a: 'Yes. Every form is fully responsive and works down to 375px wide. Signature capture, file upload, and all field types are touch-optimized.' },
  { q: 'What happens to my original PDF?', a: 'We store it securely in private storage so we can generate filled copies. Only you can access it. Delete the form and the PDF goes with it.' },
  { q: 'Do you support scanned PDFs?', a: 'Yes. If text extraction fails, we run OCR (OCR.space) page-by-page before sending to the AI.' },
  { q: 'Can I embed forms on my own site?', a: 'On Professional and Team plans you get an iframe embed snippet alongside the public link and QR code.' },
  { q: 'Is there an API?', a: 'API access is on the roadmap for Team plan customers. Contact us if you need it sooner.' },
]

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [yearly, setYearly] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/70 backdrop-blur-xl px-6">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between">
          <Link href="/"><FormForgeLogo size={22} /></Link>

          <div className="hidden md:flex items-center gap-7 text-[13px] text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle variant="nav" />
            {user ? (
              <Link href="/dashboard">
                <button className="flex items-center gap-2 text-[13px] h-9 px-4 rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <button className="text-[13px] text-muted-foreground hover:text-foreground transition-colors h-9 px-3">
                    Log in
                  </button>
                </Link>
                <Link href="/signup">
                  <button className="text-[13px] h-9 px-4 rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium">
                    Start free
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 bg-mesh">
        <div className="mx-auto max-w-[1200px] text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[12px] text-muted-foreground mb-8">
              <Sparkles className="h-3 w-3 text-primary" />
              AI-powered form generation
            </div>

            {/* Headline */}
            <h1 className="font-display text-[clamp(2.5rem,6vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] max-w-[900px] mx-auto">
              Turn any PDF into a{' '}
              <span className="text-gradient">fillable form</span>
              {' '}in 60 seconds
            </h1>

            <p className="mt-7 text-[17px] leading-relaxed text-muted-foreground max-w-[560px] mx-auto">
              Upload your PDF. AI detects every field. Share a link. Collect responses
              with signatures, validation, and a filled PDF for every submission.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex items-center justify-center gap-3">
              <Link href="/signup">
                <button className="group inline-flex items-center gap-2 px-6 h-12 rounded-md bg-primary text-primary-foreground font-medium text-[14px] shadow-glow hover:opacity-90 transition-all">
                  Start free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 h-12 rounded-md glass text-[14px] hover:bg-card transition-colors"
              >
                See how it works
              </a>
            </div>

            <p className="mt-6 text-[12px] text-muted-foreground">
              No credit card · 3 forms free forever
            </p>
          </motion.div>

          {/* Product mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-16 relative mx-auto max-w-[1080px]"
          >
            <div className="rounded-2xl glass-strong overflow-hidden shadow-elegant">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 h-9 px-4 border-b border-border/50">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <span className="ml-3 text-[11px] font-mono text-muted-foreground">
                  formforge.app/dashboard
                </span>
              </div>

              {/* Dashboard mockup */}
              <div className="grid grid-cols-12 min-h-[440px]">
                {/* Sidebar */}
                <div className="col-span-3 border-r border-border/50 p-3 space-y-1 hidden md:block">
                  <FormForgeLogo size={18} />
                  <div className="h-3" />
                  {[
                    { label: 'Forms', active: true },
                    { label: 'New form' },
                    { label: 'Submissions' },
                    { label: 'Billing' },
                    { label: 'Settings' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-2.5 h-8 rounded-md text-[12px] ${item.active
                        ? 'bg-primary/10 text-primary-glow'
                        : 'text-muted-foreground'
                        }`}
                    >
                      <div className="h-3 w-3 rounded bg-current opacity-50" />
                      {item.label}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="col-span-12 md:col-span-9 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="font-display text-lg font-semibold">Your forms</div>
                    <div className="px-3 h-8 rounded-md bg-primary text-primary-foreground text-[12px] flex items-center gap-1.5">
                      <span className="text-base leading-none">+</span> New form
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { title: 'Client Intake Form', subs: 47, pill: 'Live' },
                      { title: 'NDA Agreement v2', subs: 23, pill: 'Live' },
                      { title: 'Patient Registration', subs: 112, pill: 'Live' },
                      { title: 'Job Application', subs: 8, pill: 'Draft' },
                      { title: 'Event RSVP', subs: 0, pill: 'Draft' },
                    ].map((f, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border bg-card/40 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <FileText className="h-4 w-4 text-primary" />
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${f.pill === 'Live'
                              ? 'bg-success/10 text-success'
                              : 'bg-muted text-muted-foreground'
                              }`}
                          >
                            {f.pill}
                          </span>
                        </div>
                        <div className="text-[13px] font-medium">{f.title}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {f.subs} submissions
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Fade out bottom of mockup */}
            <div className="absolute -inset-x-12 -bottom-8 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 border-t border-border/40">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center mb-16">
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              How it works
            </p>
            <h2 className="font-display text-[clamp(2rem,3.5vw,2.75rem)] font-semibold tracking-tight">
              Three steps. Zero friction.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-border/60 rounded-xl overflow-hidden">
            {[
              {
                n: '01',
                title: 'Upload PDF',
                desc: 'Drag and drop any PDF — contracts, intake forms, applications. We handle scanned documents too.',
              },
              {
                n: '02',
                title: 'AI Detects Fields',
                desc: 'Claude reads your document and identifies every fillable field, complete with type and validation.',
              },
              {
                n: '03',
                title: 'Share & Collect',
                desc: 'Send a link, embed, or download a QR code. Each response generates a filled PDF automatically.',
              },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card p-8"
              >
                <div className="font-mono text-[12px] text-primary mb-4">{step.n}</div>
                <h3 className="font-display text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 border-t border-border/40">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center mb-16">
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Features
            </p>
            <h2 className="font-display text-[clamp(2rem,3.5vw,2.75rem)] font-semibold tracking-tight">
              Everything you need.<br />Nothing you don't.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                viewport={{ once: true }}
                className="rounded-xl glass p-6 hover:bg-card/80 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary-glow" />
                </div>
                <h3 className="font-display text-[17px] font-semibold mb-2">{f.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="py-24 px-6 border-t border-border/40">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-center text-[13px] text-muted-foreground mb-12">
            Used by 1,200+ lawyers, HR teams & clinics
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                quote: 'We replaced DocuSign and Typeform with FormForge. Saved $400/month and our intake forms actually look professional now.',
                name: 'Sarah Chen',
                role: 'Operations Lead, North Star Legal',
              },
              {
                quote: "Uploaded our 14-page patient intake. AI got every field right. Patients fill it on their phones before appointments — no more clipboards.",
                name: 'Dr. Marcus Webb',
                role: 'Pacific Family Health',
              },
              {
                quote: 'I send NDAs through FormForge. Counterparty signs, gets a filled PDF, I get notified. The whole loop takes under 2 minutes.',
                name: 'Priya Patel',
                role: 'Founder, Lumen Studios',
              },
            ].map((t, i) => (
              <div key={i} className="rounded-xl glass p-6">
                <p className="text-[14px] leading-relaxed text-foreground/90">&quot;{t.quote}&quot;</p>
                <div className="mt-5 pt-5 border-t border-border/50">
                  <p className="text-[13px] font-medium">{t.name}</p>
                  <p className="text-[12px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6 border-t border-border/40">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center mb-12">
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Pricing
            </p>
            <h2 className="font-display text-[clamp(2rem,3.5vw,2.75rem)] font-semibold tracking-tight mb-6">
              Pick a plan.<br />Upgrade when you grow.
            </h2>

            {/* Monthly / Yearly toggle */}
            <div className="inline-flex items-center gap-1 rounded-full glass p-1">
              <button
                onClick={() => setYearly(false)}
                className={`px-4 h-8 rounded-full text-[12px] transition-colors ${!yearly ? 'bg-foreground text-background' : 'text-muted-foreground'
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`px-4 h-8 rounded-full text-[12px] transition-colors ${yearly ? 'bg-foreground text-background' : 'text-muted-foreground'
                  }`}
              >
                Yearly{' '}
                <span className="ml-1 text-success">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl p-6 ${plan.popular
                  ? 'glass-strong shadow-elegant ring-1 ring-primary/40'
                  : 'glass'
                  }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium uppercase tracking-wider">
                    Popular
                  </span>
                )}

                <p className="font-display text-lg font-semibold">{plan.name}</p>
                <p className="text-[12px] text-muted-foreground mb-5">{plan.blurb}</p>

                <p className="font-display text-4xl font-semibold tracking-tight">
                  ${yearly ? plan.yearly : plan.price}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>

                <Link href="/signup">
                  <button
                    className={`mt-6 w-full h-10 rounded-md text-[13px] font-medium transition-colors ${plan.popular
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'bg-card hover:bg-accent border border-border'
                      }`}
                  >
                    {plan.cta}
                  </button>
                </Link>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6 border-t border-border/40">
        <div className="mx-auto max-w-[760px]">
          <div className="text-center mb-12">
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              FAQ
            </p>
            <h2 className="font-display text-[clamp(2rem,3.5vw,2.75rem)] font-semibold tracking-tight">
              Frequently asked
            </h2>
          </div>

          <Accordion items={FAQ} />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 border-t border-border/40">
        <div className="mx-auto max-w-[800px] text-center rounded-2xl glass-strong p-12 bg-mesh">
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-tight">
            Ready to forge your first form?
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            Free forever for your first 3 forms. No credit card required.
          </p>
          <Link href="/signup">
            <button className="mt-8 inline-flex items-center gap-2 px-6 h-12 rounded-md bg-primary text-primary-foreground font-medium text-[14px] shadow-glow hover:opacity-90 transition-all">
              Get started
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-border/40">
        <div className="mx-auto max-w-[1200px] flex flex-col md:flex-row items-center justify-between gap-4">
          <FormForgeLogo size={20} />
          <p className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} FormForge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
