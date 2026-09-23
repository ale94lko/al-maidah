# Installation

## Prerequisites

- Node.js 22 LTS or newer
- npm 10 or newer
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for the local database)

Optional for later MVP issues:

- A hosted Supabase project
- A Stripe UAE account for AED payments
- A Vercel account for hosting

## Local setup

```bash
git clone https://github.com/ale94lko/al-maidah.git
cd al-maidah
cp .env.example .env
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database (Supabase)

The PostgreSQL schema and demo seed live under [`supabase/`](../supabase/).

```bash
supabase start
supabase db reset
```

`db reset` applies every file in `supabase/migrations/` and then `supabase/seed.sql` (wired in `supabase/config.toml`). No manual SQL steps are required.

**Hosted production:** the Supabase project is linked to [`ale94lko/al-maidah`](https://github.com/ale94lko/al-maidah) with **Deploy to production** enabled. Merging (or pushing) migration files into `main` applies only the new SQL under `supabase/migrations/` to the remote database. Preview branching requires Pro and is off on Free.

Optional manual fallback (GitHub → Actions → “Deploy Supabase migrations (manual)”): set repository secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`.

Demo restaurant slug: `demo` (tables 1–4, bilingual categories and dishes).

Public menu endpoint (server uses the service role; guests never receive `cost_price`):

```bash
curl "http://localhost:3000/api/menu/demo?table=621d0a8a93454e9d8e07bbcad5915f42eb189a3ba80a7f82d1de1d66d3e39dae"
```

### Stripe webhook (local)

Point the Stripe CLI at `POST /api/stripe/webhook` so `payment_intent.succeeded` can mark orders paid:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` in `.env`. The handler verifies the signature, is idempotent on retries, and never marks cash orders paid from Stripe.

Owner auth:

- Sign up: [http://localhost:3000/admin/signup](http://localhost:3000/admin/signup)
- Sign in: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

Sign-up creates the Auth user, restaurant, and `restaurant_owners` row. `/admin/**` and `/kitchen/**` require a session.

Useful scripts:

- `npm run dev` — start the Nuxt development server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm test` — scaffold and schema smoke tests
- `npm run lint` — TypeScript check via Nuxt

Fill `.env` using the variable names in [`.env.example`](../.env.example).
Never commit real secrets.

## Obtaining the software

- Source: https://github.com/ale94lko/al-maidah
- License: [MIT](../LICENSE)

## Feedback

- Bugs and enhancements: https://github.com/ale94lko/al-maidah/issues
- Contributions: [CONTRIBUTING.md](../CONTRIBUTING.md)
