# Contributing (Detailed)

This document is the extended contributor guide for maintainers and frequent contributors.
For general contribution rules, start at the root [CONTRIBUTING.md](../CONTRIBUTING.md).

## Repository Root Convention

All commands in this project are run from the repository root unless explicitly documented otherwise.

## Testing Matrix

Core checks:

```bash
bun run lint
bun test
bunx tsc --noEmit
```

Optional checks:

```bash
bunx playwright test
npx expo-doctor
```

## Thermal Printing Development Notes

- Printing requires native modules, so use custom dev builds.
- Expo Go is not sufficient for printer flows.
- Runtime adapter surface:
  - `services/printer/adapters/native.ts`
  - `services/printer/adapters/fake.ts`
  - `services/printer/adapters/factory.ts`
- Registry, storage, and render layers are under `services/printer/`.

## Contributor Expectations

- Keep diffs focused and reversible.
- Prefer existing abstractions over adding new layers.
- Update docs when behavior or workflows change.
- Keep test fixtures and mocks aligned with active runtime dependencies.

## Related Docs

- [Architecture](./ARCHITECTURE.md)
- [Printer subsystem](./PRINTER.md)
- [Release runbooks](./release/RELEASE_RUNBOOK.md)
