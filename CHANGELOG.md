# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Nuxt 3 application scaffold with TypeScript, Tailwind CSS, runtimeConfig, and a standalone PWA manifest (MVP-01).
- Supabase multi-tenant schema, RLS deny-by-default for order writes, and demo seed restaurant (MVP-02).
- Shared domain types plus browser (anon) and server (service role) Supabase clients with restaurant/menu helpers (MVP-03).
- Owner email/password auth, multi-tenant RLS, and session guards for `/admin` and `/kitchen` (MVP-04).
- Distinct guest, kitchen, and admin layouts with shared loading/empty states (MVP-05).
- English/Arabic i18n with guest language switcher, `dir="rtl"`, and localized dish names (MVP-06).
- Public QR menu at `/m/{slug}?table=` with session-pinned table, search/filters, photos, and sold-out marks (MVP-07).
- Guest cart with dish modifiers, notes, quantity edits, and a fixed bar to `/m/{slug}/cart` (MVP-08).
- Checkout with server-side 5% UAE VAT and pending `orders` / `order_items` creation (MVP-09).
- AED payments via Stripe PaymentIntent (Google Pay / card Express Checkout) and cash at the table (MVP-10).

## [0.1.0] - 2026-09-23

### Added

- Repository foundation: license, ignore rules, env example, and README.
- Security policy, contributing guide, code of conduct, and support docs.
- OpenSSF Scorecard, CodeQL, CI, and Dependabot workflows.
- Issue and pull request templates for MVP work.
- Repo Health and OpenSSF badges in the README.
- `.bestpractices.json` evidence for the OpenSSF Best Practices Passing badge.
