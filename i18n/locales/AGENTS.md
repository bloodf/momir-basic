# Internationalization Locales

**Parent:** [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-03-31

## Overview

11 language translation files following identical `Translations` interface structure. Each locale exports a complete translation object for all UI strings, card data, and error messages.

## Supported Locales

1. **en** — English
2. **pt** — Portuguese (Brasil)
3. **es** — Spanish
4. **fr** — French
5. **de** — German
6. **it** — Italian
7. **ja** — Japanese
8. **ko** — Korean
9. **ru** — Russian
10. **zhs** — Simplified Chinese
11. **zht** — Traditional Chinese

## Translation Structure

Each locale file (e.g., `en.ts`) exports:

```typescript
export const en: Translations = {
  // Navigation
  tabs: {
    home: 'Cast',
    search: 'Search',
    game: 'Game',
    history: 'History',
    settings: 'Settings',
  },

  // Cards & Game
  cardTypes: {
    creature: 'Creature',
    instant: 'Instant',
    sorcery: 'Sorcery',
    enchantment: 'Enchantment',
    artifact: 'Artifact',
    land: 'Land',
    planeswalker: 'Planeswalker',
    battle: 'Battle',
  },

  // UI Actions
  actions: {
    search: 'Search',
    cast: 'Cast',
    print: 'Print',
    connect: 'Connect',
    disconnect: 'Disconnect',
    scan: 'Scan',
  },

  // Settings
  settings: {
    language: 'Language',
    printer: 'Printer Setup',
    cardFetch: 'Card Fetch',
    developerMode: 'Developer Mode',
  },

  // Errors
  errors: {
    noNetwork: 'No internet connection',
    noCard: 'No cards found',
    printError: 'Failed to print',
    connectionFailed: 'Connection failed',
  },

  // Mana costs (for text rendering)
  mana: {
    generic: 'Generic',
    white: 'White',
    blue: 'Blue',
    black: 'Black',
    red: 'Red',
    green: 'Green',
    colorless: 'Colorless',
  },
}
```

## Translation Keys (Shared Across Locales)

All 11 locale files export identical key structures. Keys include:

- **Navigation**: Tab names, screen titles, back buttons
- **Card Data**: Type names, abilities, oracle text placeholders
- **Game Modes**: Standard, Commander, Brawl, Two-Headed Giant, Pauper, Custom
- **UI Buttons**: Cast, Search, Print, Connect, Disconnect, Settings
- **Printer**: Scan, Connect, Test, Disconnect, Reset
- **Errors**: Network, timeout, connection, permission, print errors
- **Settings**: Language, developer mode, card fetch options
- **Mana Symbols**: Generic, colored (WUBRG), X, phyrexian

## Design Patterns

- **Namespace Pattern**: Keys organized by feature/domain
- **Literal Pattern**: No interpolation variables (all literals)
- **Flat Structure**: Dot notation for nested keys (e.g., `tabs.home`)

## Maintenance

- Add new keys to **all 11 files** simultaneously
- Keep keys in alphabetical order per section
- Use English `en.ts` as source of truth
- Test all 11 languages before commit
