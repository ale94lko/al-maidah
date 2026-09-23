# Al-Maidah

Menú digital por código QR para restaurantes y cafeterías en Emiratos Árabes Unidos. El cliente escanea la mesa, arma el pedido y la cocina lo recibe en vivo. El dueño gestiona la carta y ve ingresos, costos y tiempos.

El nombre viene de *ma'idah* (المائدة): la mesa.

## Qué cubre el MVP

- **Cliente (móvil):** menú por QR (`/m/{slug}?table={n}`), carrito, notas y modificadores, checkout con VAT 5% y seguimiento del pedido.
- **Cocina (tablet, PWA):** comandero en tiempo real (pendiente, en preparación, listo) con alerta sonora.
- **Administración (PC y tablet):** carta, mesas y QR imprimibles, estadísticas de ingresos y ganancia.
- **Pagos en AED:** Google Pay, tarjeta y efectivo en mesa, con recibo que incluye el TRN.
- **Idiomas:** inglés y árabe (RTL).
- **Multi-tenant:** cada restaurante ve solo sus datos.

Queda fuera del MVP la impresión térmica, el modo sin conexión y pasarelas de pago a plazos.

## Stack previsto

| Capa | Elección |
| --- | --- |
| App | Nuxt 3, Vue 3, TypeScript |
| UI | Tailwind CSS |
| Datos y tiempo real | Supabase (PostgreSQL, Auth, Realtime, RLS) |
| Pagos | Stripe UAE (AED, Google Pay) |
| Hosting | Vercel |

## Vistas

| Ruta | Quién | Para qué |
| --- | --- | --- |
| `/m/{slug}` | Cliente | Carta y pedido de la mesa |
| `/m/{slug}/cart` | Cliente | Resumen, VAT y pago |
| `/m/{slug}/status/{orderId}` | Cliente | Estado en vivo |
| `/kitchen` | Cocina | Comandero |
| `/admin` | Dueño | Estadísticas |
| `/admin/menu` | Dueño | Carta |
| `/admin/tables` | Dueño | Mesas y QR |

## Cómo se construye

Este repositorio arranca vacío a propósito. Cada pieza implementable hasta el MVP está en un issue, en el orden en que conviene construirla. Empieza por el issue **MVP-01**.

Copia [`.env.example`](.env.example) a `.env` cuando exista la app. No subas secretos.

## Licencia

[MIT](LICENSE).
