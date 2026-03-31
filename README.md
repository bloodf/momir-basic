# Momir Basic

A Magic: The Gathering card randomizer app with thermal printer support. Inspired by the MTG Online Momir Basic format — tap a mana cost and get a random creature.

Built with React Native, Expo, and TypeScript. Supports 11 languages.

## Features

- **Random Card Generation** — Pick a card type and CMC, get a random card from Scryfall
- **Multiple Card Types** — Creatures, commanders, artifacts, equipment, enchantments, auras, instants, sorceries, lands
- **Multi-Card Mode** — Summon multiple random cards at once
- **Advanced Search** — Full Scryfall syntax with filters for colors, types, formats, rarity, CMC, sets, and artists
- **Card History** — Track previously summoned cards
- **Life Counter** — Built-in life counter for 2-8 players with commander damage tracking
- **Game Modes** — Standard, Commander, Brawl, Two-Headed Giant, Pauper, Custom
- **Thermal Printing** — Print card receipts or full card images via Bluetooth/BLE/TCP thermal printers
- **11 Languages** — English, Portuguese, Spanish, French, German, Italian, Japanese, Korean, Russian, Simplified Chinese, Traditional Chinese
- **Localized Cards** — Card names and text in your language (with English image fallback)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator or Android Emulator (or a physical device)

### Installation

```bash
# Clone the repo
git clone https://github.com/bloodf/momir-basic.git
cd momir-basic/expo

# Install dependencies
bun install
# or: npm install

# Start the development server
npx expo start
```

### Running on Device

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios

# Web
npx expo start --web
```

### Building with EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Preview build (APK for testing)
eas build --platform android --profile preview

# Production build (AAB for store)
eas build --platform android --profile production

# iOS production build
eas build --platform ios --profile production
```

## Project Structure

```
momir-basic/
├── expo/                       # Expo app
│   ├── app/                    # Expo Router screens
│   │   ├── (tabs)/             # Tab navigation
│   │   │   ├── (home)/         # Card randomizer (main screen)
│   │   │   ├── search/         # Advanced card search
│   │   │   ├── history/        # Card history
│   │   │   └── settings/       # App & printer settings
│   │   ├── card.tsx            # Card detail modal
│   │   ├── print-preview.tsx   # Print preview & printing
│   │   └── life-counter.tsx    # Life counter
│   ├── components/             # Reusable UI components
│   ├── constants/              # Colors, theme
│   ├── i18n/                   # Internationalization (11 languages)
│   ├── providers/              # React context providers
│   ├── services/               # API & business logic
│   │   ├── scryfall.ts         # Scryfall API integration
│   │   └── printer/            # Thermal printer services
│   └── types/                  # TypeScript type definitions
├── .github/workflows/          # CI/CD pipelines
└── LICENSE
```

## Thermal Printer Support

Momir Basic can print card receipts on ESC/POS thermal printers via [react-native-thermal-printer-driver](https://github.com/bloodf/expo-thermal-printer-driver).

**Supported connections:**
- Bluetooth Classic (Android)
- BLE (Android & iOS)
- TCP/LAN (Android & iOS)

**Print modes:**
- **Receipt** — Card name with mana cost, art crop, type line, oracle text, flavor text, power/toughness, QR code (each section configurable)
- **Full Card** — Prints the entire card face image

> Requires a custom development build. Thermal printing is not available in Expo Go.

## Tech Stack

- **Framework:** [Expo](https://expo.dev/) 54 + [React Native](https://reactnative.dev/) 0.81
- **Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/) v6
- **State:** [TanStack React Query](https://tanstack.com/query) + [Zustand](https://zustand-demo.pmnd.rs/)
- **Language:** [TypeScript](https://www.typescriptlang.org/) 5.9
- **API:** [Scryfall](https://scryfall.com/docs/api)
- **Printing:** [react-native-thermal-printer-driver](https://github.com/bloodf/expo-thermal-printer-driver)
- **Testing:** Jest + Playwright
- **CI/CD:** GitHub Actions + EAS Build

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| **CI** | Push/PR to main | Lint, typecheck, unit tests |
| **EAS Build** | Manual dispatch | Build iOS/Android via EAS |
| **EAS Update** | Push to main | Publish OTA update |
| **PR Preview** | PR to main | Publish preview update branch |

### Setup Secrets

To enable EAS workflows, add these secrets in your GitHub repo settings:

| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | Expo access token from [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) |

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## Acknowledgements

- Card data provided by [Scryfall](https://scryfall.com/) API
- Mana symbols from [Andrew Gioia's Mana font](https://mana.andrewgioia.com/)
- Inspired by the [Momir Basic](https://mtg.fandom.com/wiki/Momir_Basic) format from Magic: The Gathering Online

## License

[MIT](LICENSE)
