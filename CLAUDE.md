# FormForge — Project Audit

## Overview

FormForge is a SaaS app that converts PDFs into interactive fillable web forms with AI-powered field detection. Upload a PDF, AI detects fields (OpenRouter), share a link, collect responses with e-signatures and auto-generated filled PDFs.

**Stack:** Next.js 16.2.6 (App Router, Turbopack) · React 19.2.4 · TypeScript · Supabase (auth, DB, storage) · Stripe · Resend · Tailwind CSS v4 · shadcn/ui · Framer Motion  
**Deployed:** https://formforge-kappa.vercel.app  
**Repo:** https://github.com/kikoolz/formforge  
**Supabase Project:** hoscxsmzphbcjggfxrsd

---

## Build Status

- `npm run build` ✓ — compiles successfully, TypeScript passes, static pages generated
- `npm run dev` ✓ — Turbopack dev server works
- Build shows one deprecation: middleware convention is deprecated, should migrate to `proxy` (see Next.js 16 docs)

---

## Directory Structure

```
app/
├── (auth)/login/page.tsx          # Login/signup with tabs, Google OAuth, email/password
├── (auth)/signup/page.tsx         # (same file as login)
├── (dashboard)/layout.tsx         # Wraps dashboard in <Toaster>
├── (dashboard)/dashboard/
│   ├── page.tsx                   # Dashboard home: sidebar, stats, form grid, search, CRUD
│   ├── billing/page.tsx           # Stripe pricing table, checkout redirect
│   ├── settings/page.tsx          # Account settings
│   ├── forms/
│   │   ├── new/page.tsx           # PDF upload + form type selection
│   │   └── [id]/
│   │       ├── edit/page.tsx      # Form editor (PlatoForms-style)
│   │       └── submissions/page.tsx  # Submission table with CSV export
├── f/[slug]/page.tsx              # Public form fill page (renders <PublicForm>)
├── api/
│   ├── auth/callback/route.ts     # GET — OAuth code exchange
│   ├── billing/
│   │   ├── create-checkout/route.ts   # POST — Stripe checkout session
│   │   └── portal/route.ts            # POST — Stripe billing portal
│   ├── email/welcome/route.ts     # POST — Resend welcome email
│   ├── forms/
│   │   ├── route.ts                    # GET — list user's forms
│   │   └── [id]/
│   │       ├── route.ts                # GET — single form + fields; PUT — update metadata
│   │       ├── fields/route.ts         # POST — create field
│   │       ├── fields/[fieldId]/route.ts  # PUT/DELETE — update/delete field
│   │       ├── publish/route.ts        # POST — toggle publish state
│   │       └── detect-fields/route.ts  # POST — re-run AI detection
│   ├── submissions/
│   │   ├── route.ts                    # POST — public form submission, generate filled PDF
│   │   └── [formId]/export/route.ts    # GET — CSV export
│   ├── upload/
│   │   ├── pdf/route.ts                # POST — upload PDF, create form, OCR + AI detect
│   │   └── avatar/route.ts             # POST — upload avatar to Supabase Storage
│   └── webhooks/stripe/route.ts        # POST — Stripe event handler

components/
├── dashboard/Sidebar.tsx          # Dashboard sidebar with user info, nav links, sign out
├── forms/
│   ├── FormEditor.tsx             # Full editor: top bar, left palette, center PDF, right panel
│   ├── InteractivePdfViewer.tsx   # PDF canvas renderer with field overlay (edit/fill mode)
│   ├── PdfUploader.tsx            # Drag-and-drop PDF upload widget
│   ├── PublicForm.tsx             # Public-facing form: progress bar, fields, signature, submit
│   └── SubmissionsTable.tsx       # Submissions list with search, filter, export
├── ui/                            # shadcn/ui primitives (button, input, tabs, dialog, etc.)
├── FormForgeLogo.tsx              # SVG logo component
└── ThemeToggle.tsx                # Dark/light mode toggle

lib/
├── supabase/
│   ├── client.ts                  # Browser Supabase client (createBrowserClient)
│   ├── server.ts                  # Server Supabase client (createServerClient)
│   └── admin.ts                   # Service-role admin client
├── extract-pdf-text.ts            # Standard PDF text extraction via pdfjs-dist
├── extract-pdf-text-ocr.ts        # OCR fallback wrapper (calls ocr-space.ts)
├── ocr-space.ts                   # OCR.space API client (multipart POST, returns parsed text)
├── match-field-positions.ts       # Maps AI-detected fields onto PDF x/y coordinates
├── pdf.ts                         # Filled PDF generation (pdf-lib — basic, needs improvement)
├── email.ts                       # Resend email helper
└── utils.ts                       # cn() utility

supabase/
├── config.toml                    # Local Supabase config
├── functions/parse-pdf/index.ts   # Edge function for AI detection (Deno OpenRouter)
└── migrations/
    ├── 001_initial_schema.sql     # Tables: users, forms, form_fields, submissions + RLS
    ├── 002_storage_buckets.sql    # avatars bucket
    ├── 003_storage_buckets_pdfs.sql  # pdfs bucket
    ├── 004_add_field_positions.sql  # page_x, page_y columns
    └── 005_add_form_type.sql      # form_type column (pdf_overlay | web_form)
```

---

## Database Schema (Supabase PostgreSQL)

**Tables:**
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id (UUID, FK auth.users), email, plan (enum), stripe IDs, submission/form counts+limits | Auto-created on signup via trigger |
| `forms` | id (UUID), user_id, title, original_pdf_url, status, is_published, public_slug, form_type, branding fields | RLS: owners CRUD, public read if published |
| `form_fields` | id, form_id, label, field_type (enum), required, options (jsonb), position, page, page_x, page_y | RLS: owners manage, public read if form published |
| `submissions` | id, form_id, respondent_email, data (jsonb), pdf_url, ip_address | RLS: owners view/delete, anyone insert if published |

**Enums:** `plan_type`, `form_status` (processing/ready/error), `field_type` (text/email/phone/date/number/textarea/checkbox/radio/select/signature/file)  
**Triggers:** `on_auth_user_created` (auto-create user profile), `update_updated_at` (on users, forms)

---

## Key Flows

### 1. Upload → AI Detection
1. User uploads PDF via `POST /api/upload/pdf`
2. PDF stored in Supabase Storage (`pdfs` bucket)
3. Text extracted via `pdfjs-dist` (standard path)
4. If empty → OCR.space API fallback (`lib/ocr-space.ts`)
5. Sanitize text (strip image refs, MIME types, etc.)
6. Call OpenRouter with 5 free text-only models (retry loop + model fallback)
7. Match detected fields to PDF coordinates
8. Save fields to `form_fields` table
9. Status updated to `ready`

### 2. Form Editor
1. Load form + fields from API
2. Render PDF via `InteractivePdfViewer` (pdfjs-dist canvas, DPR-aware)
3. Left palette: 11 field types (drag-to-add)
4. Center: PDF with field overlays (click to select, drag handles)
5. Right panel: Pages tab (thumbnails) / Properties tab (edit selected field)
6. Auto-save fields on change (debounced 1s)
7. "AI-Powered Recognition" button re-runs detection

### 3. Public Form Fill
1. Visitor opens `/f/[slug]`
2. If `form_type === 'pdf_overlay'`: renders PDF with field overlays in fill mode
3. If `form_type === 'web_form'`: renders fields as standard HTML inputs
4. Supports: text, email, phone, number, date, textarea, checkbox, radio, select, signature (canvas-based)
5. Progress bar, validation, confetti on submit
6. Submission stored, filled PDF generated via pdf-lib, email notification sent

### 4. Billing
1. Free: 3 forms, 10 submissions/mo
2. Solo ($29): 10 forms, 100 submissions/mo, remove branding
3. Professional ($79): 50 forms, 500 subs/mo, custom branding
4. Team ($149): unlimited
5. Stripe checkout + webhook syncs subscription to `users` table

---

## Environment Variables Required

| Variable | Set on Vercel? | Notes |
|----------|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ❌ | Must be set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ❌ | Must be set |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Admin operations |
| `OPENROUTER_API_KEY` | ❌ | AI field detection |
| `OCR_SPACE_API_KEY` | ❌ | OCR fallback for scanned PDFs |
| `STRIPE_SECRET_KEY` | ❌ | Test key OK for now |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ❌ | Stripe public key |
| `STRIPE_WEBHOOK_SECRET` | ❌ | Webhook verification |
| `STRIPE_SOLO_PRICE_ID` | ❌ | Stripe Price ID |
| `STRIPE_PRO_PRICE_ID` | ❌ | Stripe Price ID |
| `STRIPE_TEAM_PRICE_ID` | ❌ | Stripe Price ID |
| `RESEND_API_KEY` | ❌ | Transactional emails |
| `NEXT_PUBLIC_APP_URL` | ❌ | Set to `https://formforge-kappa.vercel.app` |

**Supabase Auth settings also need:** Site URL = `https://formforge-kappa.vercel.app`, Redirect URLs include `https://formforge-kappa.vercel.app/auth/callback`

---

## Known Issues & Gaps

### Critical
1. **Middleware deprecation** — Next.js 16 warns middleware convention is deprecated, needs migration to `proxy` (see docs in `node_modules/next/dist/docs/`)
2. **No env vars set on Vercel** — `NEXT_PUBLIC_SUPABASE_URL` missing causes build error; all vars need to be added
3. **Supabase Auth not configured for production** — Site URL still points to localhost, so auth redirects break

### High Priority
4. **`lib/pdf.ts` is basic** — draws answers as a list on page 1, no positioning by field coordinates. Needs rewrite to use `page_x/page_y` from `form_fields` to place text at correct positions
5. **No migration run on Supabase production DB** — schema needs to be applied (migrations 1-5)
6. **Stripe webhook secret** — still set to `whsec_your_webhook_secret` placeholder
7. **OCR.space API key** — set in `.env.local` but not on Vercel

### Medium Priority
8. **No proxy/middleware migration** — need to follow Next.js 16 instructions to replace `middleware.ts` with `proxy` convention
9. **Landing page (`/page.tsx`)** — FAQ says "We run Tesseract OCR" but we now use OCR.space; needs update
10. **`captcha` / spam protection** — no CAPTCHA or rate limiting on public form submissions endpoint
11. **Signup confirmation flow** — email confirmation works but user experience could be smoother (no resend option)

### Low Priority
12. **No `/terms` or `/privacy` pages** — login page links to `/terms` (404)
13. **`components.json`** has `"iconLibrary": "lucide"` (should be `"lucide-react"` for shadcn v4)
14. **`.DS_Store` files** committed to git in several directories
15. **`eng.traineddata`** file at root — leftover from old tesseract.js setup, can be deleted and added to `.gitignore`
16. **No loading skeletons** on dashboard/form pages during data fetch

---

## Key Config Values

- `components.json`: shadcn `radix-nova` style, RSC enabled, `@/` aliases
- `tailwind.config.ts`: dark mode `"class"`, custom tokens (`primary-glow`, `success`, `warning`, `sidebar-*`)
- `next.config.ts`: `serverExternalPackages: []` (empty after removing canvas/tesseract.js), `serverActions.bodySizeLimit: '10mb'`
- Supabase: project `hoscxsmzphbcjggfxrsd`, `pdfs` bucket is public, `avatars` bucket is public

---

## Completed Items

- [x] Full database schema with RLS, triggers, migrations
- [x] Auth: email/password + Google OAuth, session management, middleware protection
- [x] PDF upload with storage, text extraction (pdfjs-dist)
- [x] OCR fallback via OCR.space API
- [x] AI field detection via OpenRouter (5 free models, retry + fallback)
- [x] Text sanitization (strip image references from AI prompt)
- [x] Form editor: PlatoForms-style layout, field palette, PDF viewer, properties panel
- [x] Interactive PDF viewer: edit & fill modes, DPR-aware rendering
- [x] Public form fill page: all field types, signature capture, validation
- [x] Filled PDF generation (basic)
- [x] Submission tracking, CSV export
- [x] Stripe billing: checkout, portal, webhook sync
- [x] Email notifications (welcome + submission confirmation)
- [x] Dashboard: form list/grid, search, CRUD, stats
- [x] Landing page with pricing, features, FAQ
- [x] Dark/light mode
- [x] Plan limits enforcement
- [x] Avatar upload

## Not Yet Done / Needs Work

- [ ] Set all env vars on Vercel + configure Supabase Auth for production URL
- [ ] Run database migrations on Supabase production
- [ ] Replace `middleware.ts` with Next.js 16 `proxy` convention
- [ ] Rewrite `lib/pdf.ts` to position answers by field coordinates
- [ ] Add spam protection (CAPTCHA / rate limiting) on public submissions
- [ ] Create `/terms` and `/privacy` pages
- [ ] Add loading skeletons
- [ ] Clean up `.DS_Store` files and old `eng.traineddata`
- [ ] Update FAQ text to reference OCR.space instead of Tesseract
- [ ] Consider adding resend confirmation email option
