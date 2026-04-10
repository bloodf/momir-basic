<!-- Parent: ../AGENTS.md -->

# services/ — API and Domain Services

Generated: 2026-04-10

## Overview

`services/` contains API-facing logic and domain services used by screens and providers.

- `scryfall.ts` handles card search/fetch/localization against Scryfall.
- `printer/` contains the thermal printer subsystem (adapter, registry, rendering, storage).

## Current Structure

```text
services/
├── scryfall.ts
└── printer/
    ├── adapters/
    │   ├── factory.ts
    │   ├── fake.ts
    │   ├── native.ts
    │   └── port.ts
    ├── capability/
    ├── diagnostics/
    ├── registry/
    ├── render/
    └── storage/
```

## Key Contracts

### Scryfall

- Keep network logic in `services/scryfall.ts`.
- Parse/filter Scryfall data before passing it to UI.
- Preserve locale-aware lookup behavior.

### Printer

- Adapters are selected through `adapters/factory.ts`.
- `adapters/native.ts` wraps `react-native-thermal-printer-driver`.
- `adapters/fake.ts` supports non-native/test paths.
- Registry and storage boundaries live under `registry/` and `storage/`.
- Rendering contracts live under `render/`.

## Guardrails

- Do not import native printer modules directly from screens.
- Keep side effects in services; keep UI components declarative.
- Prefer immutable data transforms.
- Add tests alongside behavioral changes in this directory.

## Related Files

- `docs/ARCHITECTURE.md`
- `docs/PRINTER.md`
- `types/index.ts`
