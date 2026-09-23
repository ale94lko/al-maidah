# Security Policy

## Supported versions

Security fixes are applied to the default branch (`main`). Once tagged releases exist, the latest minor release line is supported.

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Older tags | No |

## Reporting a vulnerability

Do **not** open a public GitHub issue for security problems.

Report vulnerabilities privately through one of these channels:

1. [GitHub Security Advisories](https://github.com/ale94lko/al-maidah/security/advisories/new) (preferred)
2. Email the maintainer listed in the repository profile with the subject `SECURITY: al-maidah`

Please include:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept when possible
- Affected versions or commit SHAs if known

## Response expectations

- We aim to acknowledge reports within **14 days**.
- We aim to publish a fix or mitigation for confirmed, publicly disclosed vulnerabilities within **60 days**.
- We will credit reporters who want to be named, unless they prefer to stay anonymous.

## Scope notes

This repository currently holds product scaffolding and planning for Al-Maidah (Nuxt 3, Supabase, Stripe UAE). Once application code lands:

- Secrets must never be committed; use `.env` and platform secret stores.
- Guest-facing order writes must go through server routes with validation.
- Payment confirmation must rely on verified Stripe webhooks.
