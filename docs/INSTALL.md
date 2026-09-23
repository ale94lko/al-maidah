# Installation

Al-Maidah is not yet an installable application. The Nuxt 3 app is tracked in
[MVP-01](https://github.com/ale94lko/al-maidah/issues/2).

## Prerequisites (planned)

- Node.js 22 LTS or newer
- npm 10 or newer
- A Supabase project
- A Stripe UAE account for AED payments
- A Vercel account for hosting (optional for local development)

## Local setup (once the app exists)

```bash
git clone https://github.com/ale94lko/al-maidah.git
cd al-maidah
cp .env.example .env
npm ci
npm run dev
```

Fill `.env` using the variable names in [`.env.example`](../.env.example).
Never commit real secrets.

## Obtaining the software

- Source: https://github.com/ale94lko/al-maidah
- License: [MIT](../LICENSE)

## Feedback

- Bugs and enhancements: https://github.com/ale94lko/al-maidah/issues
- Contributions: [CONTRIBUTING.md](../CONTRIBUTING.md)
