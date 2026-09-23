# Al-Maidah

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

## How to build it

This repository starts empty on purpose. Each piece that can be implemented up to the MVP is an issue, in the order it should be built. Start with **MVP-01**.

Copy [`.env.example`](.env.example) to `.env` once the app exists. Do not commit secrets.

## License

[MIT](LICENSE).
