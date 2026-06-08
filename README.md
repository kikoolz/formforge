# FormForge

Turn any PDF into a fillable web form in 60 seconds. Upload a PDF, AI detects every field, share a link, collect responses with e-signatures and a filled PDF for every submission.

## Features

- **AI Field Detection** — Automatically identifies form fields (text, email, signature, date, checkbox, etc.) from any PDF
- **OCR Fallback** — Scanned/image-based PDFs are processed via OCR.space API
- **Interactive PDF Viewer** — Drag & drop fields onto a live PDF preview
- **Fillable Web Forms** — Share a link, embed, or QR code; respondents fill from any device
- **E-Signature Capture** — Built-in signature field support
- **Submission Dashboard** — Track, search, filter, and export responses to CSV
- **Filled PDF Export** — Every submission generates a filled PDF automatically
- **Email Notifications** — Real-time submission alerts with optional auto-reply
- **Billing** — Stripe integration with Free / Solo / Professional / Team plans

## Tech Stack

| Layer        | Technology                                                              |
|-------------|-------------------------------------------------------------------------|
| Framework   | Next.js 16 (App Router, Turbopack)                                     |
| Language    | TypeScript                                                              |
| Database    | Supabase (Postgres)                                                     |
| Auth        | Supabase Auth (email + Google OAuth)                                    |
| Storage     | Supabase Storage (PDF files)                                            |
| AI          | OpenRouter (text models for field detection)                            |
| OCR         | OCR.space API                                                           |
| Payments    | Stripe                                                                  |
| Email       | Resend                                                                  |
| UI          | Tailwind CSS v4, shadcn/ui, Framer Motion                              |
| PDF         | pdfjs-dist (text extraction & rendering)                                |

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project
- OpenRouter API key
- OCR.space API key (free tier: 25k requests/month)
- Stripe account (test keys)
- Resend API key

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable                              | Description                        |
|---------------------------------------|------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`            | Supabase project URL               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | Supabase anon/public key           |
| `SUPABASE_SERVICE_ROLE_KEY`           | Supabase service role key          |
| `OPENROUTER_API_KEY`                  | OpenRouter API key                  |
| `OCR_SPACE_API_KEY`                   | OCR.space API key                   |
| `STRIPE_SECRET_KEY`                   | Stripe secret key                   |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  | Stripe publishable key             |
| `STRIPE_WEBHOOK_SECRET`               | Stripe webhook signing secret       |
| `STRIPE_SOLO_PRICE_ID`                | Stripe Price ID for Solo plan       |
| `STRIPE_PRO_PRICE_ID`                 | Stripe Price ID for Pro plan        |
| `STRIPE_TEAM_PRICE_ID`                | Stripe Price ID for Team plan       |
| `RESEND_API_KEY`                      | Resend API key                      |
| `NEXT_PUBLIC_APP_URL`                 | App URL (e.g. `http://localhost:3000`) |

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

```bash
npm run db:migrate
```

The schema is in `supabase/migrations/`.

## Architecture

```
app/
├── (auth)/           # Login / signup pages
├── (dashboard)/      # Dashboard, form editor, submissions
├── api/              # API routes (forms, fields, upload, billing, etc.)
├── f/                # Public form fill page
└── page.tsx          # Landing page

components/
├── dashboard/        # Sidebar, form list, etc.
├── forms/            # FormEditor, InteractivePdfViewer, field palette, etc.
├── ui/               # shadcn/ui primitives
└── ...

lib/
├── supabase/         # Server & client Supabase helpers
├── extract-pdf-text.ts        # Standard PDF text extraction (pdfjs-dist)
├── extract-pdf-text-ocr.ts    # OCR fallback wrapper
├── ocr-space.ts               # OCR.space API client
├── match-field-positions.ts   # Maps AI-detected fields to PDF coordinates
└── ...
```

## Key Flows

1. **Upload** → PDF stored in Supabase → text extracted (pdfjs) → if empty, OCR.space fallback → AI detects fields → fields saved to DB
2. **Edit** → Interactive PDF viewer with drag-and-drop field placement, type/property editor
3. **Fill** → Public form page at `/f/[slug]` → validations, file uploads, e-signature → submission stored → filled PDF generated
4. **Publish** → Toggle live/draft → share link, embed, or QR code

## Deployment

```bash
npm run build
```

Deploy to Vercel with `vercel --prod`. Set all environment variables in the Vercel dashboard.
