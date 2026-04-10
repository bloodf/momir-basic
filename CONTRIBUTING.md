# Contributing to Momir Basic

Thanks for your interest in contributing.

## Development Setup

From the repository root:

```bash
bun install
bun start
```

Platform commands:

```bash
bun ios
bun android
bun start-web
```

For thermal printer work, use a custom dev build (`expo-dev-client`). Expo Go cannot load native printer modules.

## Before Opening a PR

Run all quality checks from the repository root:

```bash
bun run lint
bun test
bunx tsc --noEmit
```

Optional:

```bash
bunx playwright test
npx expo-doctor
```

## Contribution Scope

- `app/` for screens and navigation routes
- `components/` for reusable UI
- `services/` for Scryfall and printer domain logic
- `providers/` for persisted app state
- `types/` for shared models

Keep UI, domain logic, and persistence boundaries separate.

## i18n Rule

If you add any new user-facing string, update all locale files under `i18n/locales/`.

## Commit and PR Guidance

- Use clear, conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
- Keep PRs focused and reviewable
- Include:
  - problem statement
  - solution summary
  - test plan
  - screenshots for UI changes

## Community Standards

By participating, you agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Do not open public issues for security vulnerabilities. Follow [SECURITY.md](./SECURITY.md).
