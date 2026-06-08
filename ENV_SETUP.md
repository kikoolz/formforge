# Environment Variables Setup

## Vercel — Add all of these under Settings → Environment Variables

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `OPENROUTER_API_KEY` | openrouter.ai → Keys |
| `OCR_SPACE_API_KEY` | ocr.space → API → your key |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API Keys → Secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API Keys → Publishable |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → your endpoint → Signing secret |
| `STRIPE_SOLO_PRICE_ID` | Stripe → Products → Solo plan → Price ID |
| `STRIPE_PRO_PRICE_ID` | Stripe → Products → Pro plan → Price ID |
| `STRIPE_TEAM_PRICE_ID` | Stripe → Products → Team plan → Price ID |
| `RESEND_API_KEY` | resend.com → API Keys |
| `NEXT_PUBLIC_APP_URL` | `https://formforge-kappa.vercel.app` |

## Supabase Auth — Dashboard → Authentication → URL Configuration

- **Site URL:** `https://formforge-kappa.vercel.app`
- **Redirect URLs:** `https://formforge-kappa.vercel.app/auth/callback`

## Supabase Database — Run migrations

```bash
npx supabase link --project-ref hoscxsmzphbcjggfxrsd
npx supabase db push
```
