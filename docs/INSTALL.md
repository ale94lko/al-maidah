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

Demo restaurant slug: `demo` (tables 1–4, bilingual categories and dishes).

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
