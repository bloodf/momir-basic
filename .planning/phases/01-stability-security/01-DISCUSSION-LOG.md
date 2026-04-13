# Phase 1: Stability & Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 01-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 01-stability-security
**Areas discussed:** Error Logging Strategy, Crash Safety, Secret Removal, Reassure Baselines
**Mode:** Auto (--auto)

---

## Error Logging Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Lightweight structured logger (utils/logger.ts) | Wraps console.error/warn in dev, no-op in prod. Error categories follow printer subsystem pattern. | ✓ |
| Winston/Bunyan-style logger | Full-featured logging framework with transports | |
| console.error replacement only | Minimal: replace console.log with console.error, no categories | |

**Selected:** Lightweight structured logger (recommended default)
**Notes:** Follows the PrinterAdapterError + PrinterErrorCode pattern already proven in the codebase. No external dependency needed.

## Crash Safety

| Option | Description | Selected |
|--------|-------------|----------|
| try-catch with fallback defaults + clear corrupted key | Parse safely, return defaults, delete bad key to prevent crash loops | ✓ |
| try-catch with fallback defaults only | Return defaults but leave corrupted data in storage | |
| Zod schema validation on all storage reads | Full validation at storage boundary (deferred to Phase 4) | |

**Selected:** try-catch with fallback defaults + clear corrupted key (recommended default)
**Notes:** Clearing the corrupted key is critical — without it, the app re-crashes on every startup. Full Zod validation is Phase 4 scope.

## Secret Removal

| Option | Description | Selected |
|--------|-------------|----------|
| EAS env vars + pre-commit hook | Move keys to EAS secrets, reference via env var, block with hook | ✓ |
| EAS env vars only | Move keys to EAS secrets, no hook protection | |
| CI secret store (GitHub Secrets) | Store in GitHub Actions secrets, inject at build time | |

**Selected:** EAS env vars + pre-commit hook (recommended default)
**Notes:** Pre-commit hook implementation deferred to Phase 4 (Husky setup), but the pattern can be a simple git hook in Phase 1.

## Reassure Baselines

| Option | Description | Selected |
|--------|-------------|----------|
| Home screen cast flow only | Measure the core "tap to card" interaction — the metric that must never regress | ✓ |
| All tab screens | Baselines for all 5 tab screens | |
| Full E2E suite | Baselines for all user flows including printer, search, life counter | |

**Selected:** Home screen cast flow only (recommended default)
**Notes:** This is the core value metric. Additional flows can be added in Phase 5. Non-blocking in CI for Phase 1, blocking from Phase 2 onward.

## Claude's Discretion

- Logger implementation details (API design, transport, formatter)
- Exact Reassure test scenarios and threshold configuration
- Pre-commit hook implementation (Husky vs native git hooks — Phase 4)
- `.aab` file detection and removal verification

## Deferred Ideas

None — all decisions stayed within phase scope