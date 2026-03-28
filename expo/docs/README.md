# Rork Momir Basic Docs

This Expo app is a Magic: The Gathering browser, randomizer, and thermal receipt printer built with Rork AI. The main flow lets players cast random cards by type and mana value, inspect details, search the Scryfall catalog, save card history, and prepare receipt-style print output for supported thermal printers.

## What the app does

- Browse and cast random MTG cards from Scryfall
- Search cards with quick syntax shortcuts like `R:U`, `T:C`, `F:M`, `S:mh3`, and `A:artist`
- View full card details, printings, art, and history
- Generate receipt-style print previews for cards
- Store printer preferences and printer registry data for thermal printing

## Technology stack

- Expo SDK 54
- React Native 0.81
- Expo Router 6 for file-based routing
- React Query 5 for async state and persistence wrappers
- TypeScript
- AsyncStorage for app settings and history
- expo-sqlite for printer registry and print queue storage
- react-native-thermal-pos-printer for native printer transport

## Architecture at a glance

### Routing and screens

Routes live in `expo/app/`.

- `app/(tabs)/(home)/index.tsx`, main cast screen
- `app/(tabs)/search/index.tsx`, Scryfall search and autocomplete
- `app/(tabs)/history/index.tsx`, previously seen cards
- `app/(tabs)/game/index.tsx`, game mode entry points
- `app/(tabs)/settings/index.tsx`, user settings
- `app/(tabs)/settings/printer.tsx`, printer setup UI
- `app/card.tsx`, card detail modal
- `app/print-preview.tsx`, receipt preview modal
- `app/life-counter.tsx`, life counter screen

### Providers

- `providers/SettingsProvider.tsx`, app settings, printer preferences, registry handoff
- `providers/HistoryProvider.tsx`, persisted card history
- `app/_layout.tsx`, bootstraps `QueryClientProvider`, `I18nProvider`, `SettingsProvider`, and `HistoryProvider`

### Services

- `services/scryfall.ts`, all Scryfall API calls, advanced search parsing, localization lookup
- `services/printer/registry/service.ts`, discovery, preferred printer selection, registry merge
- `services/printer/queue/engine.ts`, retry and terminal queue state handling
- `services/printer/render/document.ts`, card receipt and diagnostics document builders
- `services/printer/adapters/*`, native and fake transport adapters
- `services/printer/storage/*`, SQLite bootstrapping, schema, repositories

### Types

Core models live in `types/index.ts`, including `Card`, `AppSettings`, `PrinterRecord`, `PrinterPreferences`, `PrintJob`, and queue state types.

## Development commands

From `expo/`:

```bash
bun i
bun run start
bun run start-web
bun run start -- --ios
```

Other useful commands:

```bash
bun run lint
bun run test -- --runInBand
```

## Important note about printing

Thermal printing depends on native modules and **does not work in Expo Go**. Use a custom dev build with `expo-dev-client`. See [PRINTER.md](./PRINTER.md) for details.

## Doc map

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [PRINTER.md](./PRINTER.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
