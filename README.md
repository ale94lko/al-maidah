# Al-Maidah

[![CI](https://github.com/ale94lko/al-maidah/actions/workflows/ci.yml/badge.svg)](https://github.com/ale94lko/al-maidah/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/ale94lko/al-maidah/badge)](https://scorecard.dev/viewer/?uri=github.com/ale94lko/al-maidah)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/14770/badge)](https://www.bestpractices.dev/projects/14770)
[![Repo Health](https://raw.githubusercontent.com/ale94lko/al-maidah/output/badge.svg)](https://github.com/ale94lko/repo-health-score)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

QR digital menu for restaurants and cafés in the United Arab Emirates. A guest scans the table, builds an order, and the kitchen receives it live. The owner manages the menu and sees revenue, costs, and timing.

The name comes from *ma'idah* (المائدة): the table.

## What the MVP covers

- **Guest (mobile):** QR menu (`/m/{slug}?table={n}`), cart, notes and modifiers, checkout with 5% VAT, and order tracking.
- **Kitchen (tablet, PWA):** live ticket board (pending, preparing, ready) with a sound alert.
- **Admin (desktop and tablet):** menu, tables and printable QR codes, revenue and profit stats.
- **Payments in AED:** Google Pay, card, and cash at the table, with a receipt that includes the TRN.
- **Languages:** English and Arabic (RTL).
- **Multi-tenant:** each restaurant sees only its own data.

Thermal printing, offline mode, and buy-now-pay-later gateways are out of the MVP.

## Planned stack

| Layer | Choice |
| --- | --- |
| App | Nuxt 3, Vue 3, TypeScript |
| UI | Tailwind CSS |
| Data and realtime | Supabase (PostgreSQL, Auth, Realtime, RLS) |
| Payments | Stripe UAE (AED, Google Pay) |
| Hosting | Vercel |

## Views

| Route | Who | Purpose |
| --- | --- | --- |
| `/m/{slug}` | Guest | Menu and table order |
| `/m/{slug}/cart` | Guest | Summary, VAT, and payment |
| `/m/{slug}/status/{orderId}` | Guest | Live status |
| `/kitchen` | Kitchen | Ticket board |
| `/admin` | Owner | Statistics |
| `/admin/menu` | Owner | Menu |
| `/admin/tables` | Owner | Tables and QR codes |

## How to obtain and install

See [docs/INSTALL.md](docs/INSTALL.md).

```bash
cp .env.example .env
npm ci
npm run dev
```

Do not commit secrets.

## How to build it

Each MVP piece is tracked as an issue, in implementation order. Domain types and Supabase clients close **MVP-03**.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

- Bugs and features: [GitHub Issues](https://github.com/ale94lko/al-maidah/issues/new/choose)
- Support: [SUPPORT.md](SUPPORT.md)
- Security reports: [SECURITY.md](SECURITY.md)

## Security and repository health

- OpenSSF Scorecard workflow publishes results used by the badge above.
- CodeQL runs on pushes and pull requests.
- Dependabot keeps GitHub Actions (and npm, once present) updated.
- [Repo Health Score](.github/workflows/repo-health.yml) publishes the community health badge via [ale94lko/repo-health-score](https://github.com/ale94lko/repo-health-score).
- OpenSSF Best Practices: [docs/OPENSSF_BEST_PRACTICES.md](docs/OPENSSF_BEST_PRACTICES.md).

## License

[MIT](LICENSE).
