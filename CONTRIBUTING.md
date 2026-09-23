# Contributing to Al-Maidah

Thanks for helping improve Al-Maidah. This document explains how to propose changes.

## Ways to contribute

- Open an issue for bugs, security follow-ups (non-sensitive), or feature ideas.
- Comment on an existing MVP issue before starting large work.
- Open a pull request against `main`.

## Development setup

1. Fork and clone the repository.
2. Copy `.env.example` to `.env` and fill in local values when the app exists.
3. Install dependencies with `npm ci` (once `package.json` is present).
4. Run `npm run lint`, `npm test`, and `npm run build` before opening a PR.

Until the Nuxt app is scaffolded (see issue MVP-01), documentation and repository-health changes are welcome.

## Pull request process

1. Create a branch from `main`.
2. Keep changes focused on one concern.
3. Update docs when behavior or setup changes.
4. Ensure CI is green.
5. Request review. `CODEOWNERS` must approve before merge.
6. Use a clear commit message that explains why the change exists.

### Coding standards

- Prefer TypeScript, clear names, and small modules.
- Do not commit secrets, credentials, or production keys.
- Pin GitHub Actions to full commit SHAs.
- Match existing formatting (2-space indent, LF endings via `.editorconfig`).

## Issue labels

Use GitHub issue templates when possible. MVP work is tracked under parent issue #1.

## Code of conduct

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
