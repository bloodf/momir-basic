<!-- Parent: ../AGENTS.md -->

# i18n/ — Internationalization System

Generated: 2026-03-31

## Overview

The `i18n/` directory implements internationalization (i18n) for the Momir Basic app. The system provides translated strings for UI labels, messages, and card-related text in 11 languages. Device locale is automatically detected and used as the default language.

## Architecture

**I18n pattern:**
- React Context API for translations
- Device locale detection via react-native-localize
- Language fallback chain: device locale → English
- Lazy-loaded language modules (11 language files)
- Type-safe translation keys via Translations interface

**Supported languages (11):**
1. English (en)
2. Portuguese (pt)
3. Spanish (es)
4. French (fr)
5. German (de)
6. Italian (it)
7. Japanese (ja)
8. Korean (ko)
9. Russian (ru)
10. Simplified Chinese (zhs)
11. Traditional Chinese (zht)

## Core Files

### index.ts

**Purpose:** I18nProvider context and useI18n hook.

**Context interface:**
```typescript
interface I18nContext {
  locale: string                  // e.g., 'en', 'pt', 'es'
  translations: Translations      // Current language strings
  setLocale(locale: string): void // Switch language
  t(key: string, defaultValue?: string): string  // Get translated string
}

interface Translations {
  // App navigation
  home: string
  search: string
  history: string
  settings: string
  game: string

  // Search & filter
  searchCards: string
  filters: string
  cardType: string
  manaCost: string
  color: string
  clearAll: string
  apply: string

  // Card display
  type: string
  set: string
  printedIn: string
  power: string
  toughness: string
  loyalty: string

  // Printer & print
  printerSettings: string
  connectPrinter: string
  testPrint: string
  printPreview: string
  print: string
  printing: string
  printSuccess: string
  printFailed: string
  paperWidth: string
  printQuality: string

  // History & recent
  recentCards: string
  viewHistory: string
  clearHistory: string
  noHistory: string

  // Game
  lifeCounter: string
  players: string
  reset: string
  startGame: string

  // Settings & app
  appSettings: string
  language: string
  theme: string
  darkMode: string
  lightMode: string
  about: string
  version: string

  // Errors & status
  noResults: string
  loading: string
  error: string
  offline: string
  printerNotFound: string
  connectionFailed: string

  // Messages & toasts
  cardAdded: string
  cardRemoved: string
  settingsSaved: string
  printerConnected: string
  printerDisconnected: string
}
```

**Key functions:**

- `I18nProvider` — Context provider component
- `useI18n()` — Hook to access locale and translation function
- Device locale detection: uses react-native-localize getNativeLocales()
- Auto-switch on SettingsProvider language change

**Initialization:**
```typescript
// Device locale detection
const locales = getNativeLocales()
const deviceLocale = locales[0]?.languageTag  // 'pt-BR', 'en-US', etc.
const simplified = deviceLocale?.split('-')[0]  // 'pt', 'en'
const locale = supported.includes(simplified) ? simplified : 'en'
```

### types.ts

**Purpose:** TypeScript interface definitions for translations.

**Interfaces:**

- `Translations` — Complete set of translation keys and values (all 11 languages must implement)
- `LocaleCode` — Type union: 'en' | 'pt' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'ru' | 'zhs' | 'zht'
- `LanguageConfig` — Language metadata (name, nativeName, direction)

**Validation:**
- Each language file must implement Translations interface
- Missing keys detected at type-check time
- Build fails if any language missing translation key

## Locale Files

### locales/ — Language Translation Files

All 11 language files follow identical structure (~300 lines each):

**File naming:**
- en.ts (English)
- pt.ts (Portuguese)
- es.ts (Spanish)
- fr.ts (French)
- de.ts (German)
- it.ts (Italian)
- ja.ts (Japanese)
- ko.ts (Korean)
- ru.ts (Russian)
- zhs.ts (Simplified Chinese)
- zht.ts (Traditional Chinese)

**File structure:**
```typescript
import { Translations } from '../types'

export const pt: Translations = {
  home: 'Início',
  search: 'Buscar',
  history: 'Histórico',
  settings: 'Configurações',
  game: 'Jogo',
  // ... 200+ more keys
}
```

**Translation coverage:**
- Screen labels (tabs, buttons, titles)
- Card-related strings (type, set, power/toughness)
- Printer & print strings (connection, settings, errors)
- Settings strings (theme, language, about)
- Error & status messages
- Toast notifications
- Placeholder text

**Guidelines for translators:**
- Maintain consistency with MTG terminology
- Keep translations concise (fit UI constraints)
- Preserve placeholder format: {variable}
- Use language-appropriate punctuation and capitalization

## Usage in Components

**Access translations:**
```typescript
import { useI18n } from '@/i18n'

export function SearchHeader() {
  const { t } = useI18n()
  return <Text>{t('searchCards')}</Text>  // "Search Cards" or localized equivalent
}
```

**Switch language:**
```typescript
const { setLocale } = useI18n()
<Pressable onPress={() => setLocale('pt')}>
  <Text>Português</Text>
</Pressable>
```

**From SettingsProvider integration:**
```typescript
// Auto-switch when user changes language in settings
useEffect(() => {
  setLocale(settings.language)
}, [settings.language, setLocale])
```

## Card Text Localization

**Scryfall API integration:**
- Scryfall provides printed_name and printed_text in multiple languages
- scryfall.ts detects current locale and requests localized text from API
- Falls back to English if localization unavailable

**Oracle text:**
- Mana symbols in oracle text use same codes across all languages
- Example: "{W}{U}" renders identically in all languages
- Non-English oracle text fetched via Scryfall /en/ and /de/ endpoints

## Platform-Specific Handling

**RTL languages:**
- Future support planned (currently all languages LTR)
- Arabic/Hebrew would require RTL Text Engine and StyleSheet.rtl()

**Date & number formatting:**
- History dates: locale-aware via toLocaleDateString()
- Print timestamps: ISO format for consistency
- Mana costs: numeric (no localization needed)

## Testing

**Mock translations:**
- Default English in tests
- Mock useI18n hook for component isolation
- Test translations match Translations interface

## Agent Responsibilities

- **executor:** I18n implementation, locale switching, provider setup
- **translator:** Maintain language files, ensure coverage completeness
- **test-engineer:** I18n hook tests, locale switching tests, fallback tests
- **quality-reviewer:** Translation consistency, API integration, type safety

## Related Modules

- `app/_layout.tsx` — I18nProvider wrapped around all screens
- `providers/SettingsProvider.tsx` — Stores user language preference
- `services/scryfall.ts` — Fetches localized card text from API
- `components/` — All components use useI18n() for labels
