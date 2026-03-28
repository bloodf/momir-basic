# Contributing

## Local setup

Requirements:

- Bun
- Xcode for iOS simulator work
- Android Studio for Android emulator work
- Expo dev client for native printer testing

Setup:

```bash
cd expo
bun i
```

Start the app:

```bash
bun run start
bun run start-web
bun run start -- --ios
```

For thermal printer work, use a custom dev build. Expo Go is not enough because `react-native-thermal-pos-printer` is a native dependency.

## Development build notes

- `app.json` contains Bluetooth permissions
- `eas.json` contains a `development` profile with `developmentClient: true`
- `expo-dev-client` is already installed

If you're working on printer features, prefer running through a dev client and keep the fake adapter path working for web and tests.

## Code style

This repo is TypeScript-first.

Conventions already used in the codebase:

- path aliases like `@/services/scryfall`
- function components with React hooks
- local screen state with `useState`, `useMemo`, `useCallback`, and `useRef`
- async boundaries wrapped with React Query `useQuery` and `useMutation`
- immutable updates for settings and history

When adding code:

- keep domain types in `types/index.ts` or a nearby service module
- keep screen code in `app/`, shared UI in `components/`, and side effects in `services/`
- don't wire screens directly to native printer modules, go through `services/printer/adapters/` and higher layers
- preserve the split between AsyncStorage settings and SQLite printer data

## Testing

Test setup uses:

- `jest-expo`
- `@testing-library/react-native`
- repo mocks under `expo/__mocks__/`

Current printer-focused tests live under:

- `expo/__tests__/printer/`

Important mocks already exist for:

- `react-native-thermal-pos-printer`
- `expo-sqlite`
- `expo-haptics`
- `expo-media-library`
- AsyncStorage context helpers used by providers

Run tests:

```bash
cd expo
bun run test -- --runInBand
```

Run lint:

```bash
cd expo
bun run lint
```

## Where to place new tests

- printer services: `expo/__tests__/printer/`
- future service tests: `expo/__tests__/services/`
- provider tests: `expo/__tests__/providers/`
- component tests: `expo/__tests__/components/`

Follow the existing printer tests if you need examples for fake adapters, queue assertions, or storage-backed flows.

## Pre-commit hooks and linting

There is currently **no Husky, lint-staged, or Lefthook setup** in this repo.

That means contributors should run checks manually before opening a PR:

```bash
cd expo
bun run lint
bun run test -- --runInBand
```

If you touch native printer code or config, also validate the dev build path locally.
