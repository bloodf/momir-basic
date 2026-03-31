<!-- Parent: ../AGENTS.md -->

# components/ — Reusable React Native Components

Generated: 2026-03-31

## Overview

The `components/` directory contains 14 reusable React Native components used across screens. Components are organized by domain: card display, mana symbols, oracle text rendering, search UI, and utility components.

## Architecture

**Design principles:**
- Single responsibility per component
- Reusable across multiple screens (search, history, card detail, print preview)
- Type-safe with TypeScript interfaces
- Support for both display and print rendering modes
- Mana symbol rendering via custom font (Mana.ttf)

## Core Component Groups

### Mana & Cost Rendering

**ManaCost.tsx**
- Renders mana cost (top-right of card) as array of mana symbols
- Integrates ManaSymbol component for each symbol
- Handles converted mana cost (cmc) display
- Used in card grids, list views, print preview

**ManaSymbol.tsx**
- Single mana symbol renderer using Mana font custom font
- Maps symbol codes (W, U, B, R, G, X, hybrid) to Mana unicode characters
- Handles color styling (white, blue, black, red, green)
- Renders generic mana (colorless)
- Font: Mana.ttf (loaded in app/_layout.tsx)

**PrintManaCost.tsx**
- Mana cost rendering optimized for thermal printer output
- Converts symbols to ditherable glyphs for 2-bit monochrome printing
- Adjusts spacing and size for small thermal paper widths

### Oracle Text Rendering

**OracleText.tsx**
- Renders card oracle text (rules text) with inline mana symbols
- Parses oracle text for mana symbol codes and renders them inline
- Handles line breaks and text formatting
- Used in card detail screen and search results

**PrintOracleText.tsx**
- Oracle text renderer for thermal printer output
- Wraps text for narrow thermal paper width (32-58 characters)
- Removes color formatting and italics (monochrome constraint)
- Handles ability numbering and line breaks

### Card Display Components

**CardGridItem.tsx**
- Grid card display (used in search results, home featured cards)
- Shows card image, name, set symbol, mana cost
- Touch feedback and press animation
- Responsive to grid width (2-3 columns on tablet)

**CardListItem.tsx**
- List row card display (used in history, search list view)
- Horizontal layout: image (small), name, type, mana cost
- Swipe actions (remove from history)
- Divider between rows

### Set Symbol & Type Rendering

**SetSymbol.tsx**
- Renders MTG set symbol for card's set and rarity
- Maps set codes (WAR, M19, etc.) to set symbol unicode
- Color-coded by rarity (common: gray, uncommon: silver, rare: gold, mythic: orange)
- Used in CardGridItem, CardListItem

**TypePicker.tsx**
- Card type selector for advanced search filters
- Checkbox list of 9 card types (creature, sorcery, instant, etc.)
- Multi-select with clear all / select all buttons
- Used in SearchFilters modal

### Search & Filter UI

**SearchFilters.tsx**
- Advanced card search filter modal
- Fields: card type (TypePicker), mana cost range, color, keyword search
- Filter by funny/memorabilia/alchemy exclusion
- Apply and reset buttons
- Integrates with SearchProvider for filter state

### Utility Components

**DitheredImage.tsx**
- Image dithering component for thermal printer output
- Integrates Floyd-Steinberg dithering algorithm from utils/dither.ts
- Converts color image to 2-bit monochrome dithered output
- Shows preview and dithering progress
- Used in print-preview screen

**Toast.tsx**
- In-app toast notification system (React Context)
- Toast types: success, warning, error, info
- Context provider and useToast hook
- Auto-dismiss or manual close
- Position: top or bottom

**Skeleton.tsx**
- Loading state placeholder component
- Shimmer animation while data loads
- Used in CardGridItem and CardListItem during data fetch
- Matches actual component dimensions for smooth transition

**HistorySheet.tsx**
- Bottom sheet component for card history
- Shows recent cards grouped by date
- Quick add to search or print
- Used in home screen

## Component Dependencies

- **React Native:** View, Text, Image, ScrollView, FlatList, Modal, PressableOpacity
- **Expo:** Expo Router, Expo Constants
- **React Query:** useQuery for card API calls
- **Gesture Handler:** Swipe gestures for CardListItem
- **I18n:** Translations for component labels
- **Custom font:** Mana.ttf for symbol rendering

## Type Definitions

All components use TypeScript interfaces from `types/index.ts`:
- `Card` — Internal card representation
- `ScryfallCard` — API response from Scryfall
- `PrinterPreferences` — Print settings (theme, quality)

## Print Rendering Strategy

**Display mode (default):**
- Color mana symbols (W: white, U: blue, B: black, R: red, G: green)
- Formatted oracle text with inline symbols
- Full-color card images

**Print mode:**
- Monochrome dithered mana symbols via PrintManaCost, PrintOracleText
- Text wrapping for thermal paper width (32-58 chars)
- Dithered image via DitheredImage component
- No color formatting

## Agent Responsibilities

- **executor:** Component implementation, styling, layout logic
- **designer:** Component visual design, animations, interaction patterns
- **test-engineer:** Component snapshot tests, interaction tests, accessibility tests
- **quality-reviewer:** Component API design, reusability, naming consistency

## Related Modules

- `utils/dither.ts` — Floyd-Steinberg dithering algorithm
- `assets/fonts/mana.ttf` — Mana symbol font
- `services/scryfall.ts` — Card data fetching
- `i18n/` — Component label translations
- `types/index.ts` — TypeScript interfaces
