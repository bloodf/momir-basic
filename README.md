# Momir Basic

Momir Basic is an open-source Expo app for Magic: The Gathering players.  
Cast random cards by mana value, search Scryfall, track history, use life counter tools, and print to supported thermal printers.

## Highlights

- Random card casting inspired by Momir Basic format
- Advanced Scryfall search with filters and shortcuts
- Multi-language support (11 locales)
- Built-in history, print preview, and game helper tools
- Thermal printer support via native adapter layer
- CI/CD with EAS Build, EAS Update, and Play Store submission automation

## Tech Stack

- Expo SDK 54 / React Native 0.81
- Expo Router 6
- TypeScript
- TanStack React Query + Zustand
- Expo SQLite + AsyncStorage
- `react-native-thermal-printer-driver`
- Jest + Playwright

## Quick Start

### Prerequisites

- Node.js 18+ and Bun
- Xcode (for iOS simulator/dev builds)
- Android Studio (for Android emulator/dev builds)
- EAS account (for cloud builds/submissions)

### Install and run

```bash
git clone https://github.com/bloodf/momir-basic.git
cd momir-basic
bun install
bun start
```

### Run platforms

```bash
bun ios
bun android
bun run start:web
```

## Common Commands

```bash
bun run lint
bun test
bun test:ci
bunx playwright test
npx expo-doctor
```

## Build and Release

### Manual builds

```bash
# Android preview APK
npx eas-cli build --platform android --profile preview

# Android production AAB
npx eas-cli build --platform android --profile production

# iOS production build
npx eas-cli build --platform ios --profile production
```

### CI/CD automation

On pushes to `main`, the Android workflow can:

1. Publish an OTA update to the production branch
2. Build an Android production AAB
3. Auto-submit to Play Console production track

Required repository secrets:

- `EXPO_TOKEN`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` (JSON content)

See workflow files in `.github/workflows/`.

## Repository Layout

```text
app/                    Expo Router screens
components/             Shared UI components
services/               Scryfall and printer service layers
providers/              Settings/history providers
i18n/                   Locales and translation hooks
types/                  Shared TypeScript models
__tests__/              Unit and integration tests
e2e/                    Playwright tests
docs/                   Architecture, printer, release, support docs
```

## Open Source Project Docs

- [Contributing Guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./SECURITY.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Thermal Printer System](./docs/PRINTER.md)
- [Support](./docs/support.md)

## Roadmap and Known Constraints

- Thermal printer compatibility follows a certified transport/device matrix process
- Expo Go is not sufficient for native printer flows (use dev client builds)
- Store release policy and runbooks live under `docs/release/`

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).

## Acknowledgements

- Card data from [Scryfall](https://scryfall.com/docs/api)
- Inspired by the Momir Basic format in MTG Online
