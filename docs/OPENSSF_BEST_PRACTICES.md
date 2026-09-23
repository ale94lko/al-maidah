# OpenSSF Best Practices — Passing checklist

This project has earned the
[OpenSSF Best Practices Passing badge](https://www.bestpractices.dev/projects/14770)
(100% on the Passing tier).

[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/14770/badge)](https://www.bestpractices.dev/projects/14770)

## Evidence in the repository

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
| Automated tests | `npm test` + [CI](../.github/workflows/ci.yml) |
| SAST | [CodeQL](../.github/workflows/codeql.yml) |
| Dependency updates | [Dependabot](../.github/dependabot.yml) |
| Scorecard | [Scorecard workflow](../.github/workflows/scorecard.yml) |
| Proposed answers file | [`.bestpractices.json`](../.bestpractices.json) |

## OpenSSF Scorecard note

A perfect Scorecard aggregate (10/10) is not reachable on day one for a solo
repository: `Maintained` needs 90 days of age, `Contributors` needs multiple
organizations, and `Code-Review` needs approved pull requests from another
reviewer. License, security policy, SAST, CI, pinned Actions, Dependabot, and
token permissions already score 10/10. The Best Practices entry closes the
`CII-Best-Practices` Scorecard check.
