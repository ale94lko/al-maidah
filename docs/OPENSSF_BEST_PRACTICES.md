# OpenSSF Best Practices — Passing checklist

This project targets the
[OpenSSF Best Practices Passing badge](https://www.bestpractices.dev/)
(100% on the Passing tier).

## You must register the project (one-time, interactive)

There is no unauthenticated API to create a Best Practices entry. A maintainer must:

1. Open https://www.bestpractices.dev/en/projects/new?url=https%3A%2F%2Fgithub.com%2Fale94lko%2Fal-maidah
2. Log in with GitHub.
3. Submit the project (Metal series → Passing).
4. Click **Save (and continue)** so automation can read `.bestpractices.json`.
5. Confirm any yellow autofilled answers.
6. Replace `PROJECT_ID` in the README badge:

```markdown
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/PROJECT_ID/badge)](https://www.bestpractices.dev/projects/PROJECT_ID)
```

## Evidence already in the repository

| Criterion area | Evidence |
| --- | --- |
| Public HTTPS site / repo | https://github.com/ale94lko/al-maidah |
| Description | [README.md](../README.md) |
| How to obtain / install | [docs/INSTALL.md](INSTALL.md) |
| How to contribute | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| How to report bugs | [SUPPORT.md](../SUPPORT.md), GitHub Issues |
| Vulnerability reporting | [SECURITY.md](../SECURITY.md) |
| FLOSS license | [LICENSE](../LICENSE) (MIT) |
| Changelog / releases | [CHANGELOG.md](../CHANGELOG.md), GitHub Releases |
| Discussion | GitHub Issues and Pull Requests |
| English docs | All project docs are in English |
| Maintained | Active commits and open MVP issues |
| Automated tests | `npm test` + [CI](../.github/workflows/ci.yml) |
| SAST | [CodeQL](../.github/workflows/codeql.yml) |
| Dependency updates | [Dependabot](../.github/dependabot.yml) |
| Scorecard | [Scorecard workflow](../.github/workflows/scorecard.yml) |
| Proposed answers file | [`.bestpractices.json`](../.bestpractices.json) |

## OpenSSF Scorecard note

A perfect Scorecard aggregate (10/10) is not reachable on day one for a solo
repository: `Maintained` needs 90 days of age, `Contributors` needs multiple
organizations, and `Code-Review` needs approved pull requests from another
reviewer. The controls that *are* under our control (license, security policy,
SAST, CI, pinned Actions, Dependabot, token permissions) already score 10/10.
