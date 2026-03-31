<!-- Parent: ../AGENTS.md -->

# constants/ — App Constants

Generated: 2026-03-31

## Overview

The `constants/` directory contains centralized configuration values for the application: color theme (dark mode), card type definitions, and mana symbol mappings. Storing constants separately from component logic improves maintainability and enables theme switching.

## Architecture

**Constant organization:**
- Color theme for dark mode (primary design system)
- Card type configurations (9 types with Scryfall queries)
- Mana symbol mappings (20+ symbols to unicode characters)
- Single source of truth for styling and business logic

## Core Files

### colors.ts

**Purpose:** Dark theme color palette used throughout the app.

**Color structure:**
```typescript
export const COLORS = {
  // Backgrounds
  background: '#0A0E27'          // Dark blue, main background
  backgroundAlt: '#1A1F3A'       // Slightly lighter alternate
  backgroundCard: '#151A2E'      // Card/modal background
  surfaceLight: '#2A2F45'        // Light surface for elevation

  // Text
  textPrimary: '#FFFFFF'         // Primary text (white)
  textSecondary: '#A0A0B0'       // Secondary text (gray)
  textDisabled: '#606070'        // Disabled text (darker gray)

  // Mana colors (MTG standard)
  white: '#FFFAEB'               // White mana (bright yellow)
  blue: '#0E7CC1'                // Blue mana
  black: '#150B00'               // Black mana
  red: '#D32400'                 // Red mana
  green: '#00733E'               // Green mana

  // Borders & dividers
  borderDefault: '#333344'       // Default border color
  borderFocus: '#5A5A7A'         // Focused element border
  divider: '#2A2F45'             // Divider line color

  // Status colors
  success: '#4CAF50'             // Success/green
  error: '#F44336'               // Error/red
  warning: '#FF9800'             // Warning/orange
  info: '#2196F3'                // Info/blue

  // MTG set rarity
  rarityCommon: '#8B8B8B'        // Common (gray)
  rarityUncommon: '#A8AAAD'      // Uncommon (silver)
  rarityRare: '#FFD700'          // Rare (gold)
  rarityMythic: '#FF6B35'        // Mythic (orange)
}
```

**Usage:**
```typescript
import { COLORS } from '@/constants/colors'

export function CardGridItem({ card }: Props) {
  return (
    <View style={{ backgroundColor: COLORS.backgroundCard }}>
      <Text style={{ color: COLORS.textPrimary }}>{card.name}</Text>
    </View>
  )
}
```

**Theme strategy:**
- Single dark theme (no light mode currently)
- Colors chosen for WCAG AA contrast (COLORS.textPrimary on any background ≥ 4.5:1)
- Mana colors match official MTG color palette
- Rarity colors match set symbols (common: gray, uncommon: silver, rare: gold, mythic: orange/red)

### cardTypes.ts

**Purpose:** Card type definitions and Scryfall query configurations.

**Card type structure:**
```typescript
interface CardTypeConfig {
  id: CardType                   // 'creature', 'artifact', etc.
  label: string                  // Display label
  description: string            // User-friendly description
  scryfallQuery: (cmc: number) => string  // Query builder function
  icon?: string                  // Icon name (if using icons)
  emoji?: string                 // Emoji representation
}
```

**Supported card types (9):**

1. **creature**
   - Query: `t:creature mv={cmc}`
   - Description: "Summon creatures"
   - Emoji: "🧛"

2. **commander**
   - Query: `t:creature t:legendary is:commander mv={cmc}`
   - Description: "Legendary creatures (EDH)"
   - Emoji: "👑"

3. **artifact**
   - Query: `t:artifact mv={cmc}`
   - Description: "Artifacts"
   - Emoji: "🔧"

4. **equipment**
   - Query: `t:equipment mv={cmc}`
   - Description: "Equipment (artifact subtype)"
   - Emoji: "⚔️"

5. **enchantment**
   - Query: `t:enchantment mv={cmc}`
   - Description: "Enchantments"
   - Emoji: "✨"

6. **aura**
   - Query: `t:aura mv={cmc}`
   - Description: "Auras (enchantment subtype)"
   - Emoji: "🌀"

7. **instants**
   - Query: `t:instant`
   - Description: "Instant spells"
   - Emoji: "⚡"
   - Note: Ignores CMC (instants fetched at any cost)

8. **sorceries**
   - Query: `t:sorcery`
   - Description: "Sorcery spells"
   - Emoji: "🔮"
   - Note: Ignores CMC

9. **lands**
   - Query: `t:land -t:basic`
   - Description: "Non-basic lands"
   - Emoji: "🏞️"
   - Note: Ignores CMC

**Configuration usage:**
```typescript
import { CARD_TYPES } from '@/constants/cardTypes'

// In search filters
<FlatList
  data={CARD_TYPES}
  renderItem={({ item }) => (
    <TouchableOpacity>
      <Text>{item.emoji} {item.label}</Text>
    </TouchableOpacity>
  )}
/>

// In Scryfall query builder
const query = CARD_TYPES
  .find(t => t.id === 'creature')
  ?.scryfallQuery(3)  // CMC 3 creatures
// Result: "t:creature mv=3"
```

**CMC (converted mana cost) handling:**
- Types with CMC: creature, commander, artifact, equipment, enchantment, aura
- Types ignoring CMC: instants, sorceries, lands (fetched at any cost)
- Momir Basic rules: fetch card of specified type at specified CMC

### manaSymbols.ts

**Purpose:** Mana symbol mappings from Scryfall notation to unicode characters for rendering.

**Mana symbol structure:**
```typescript
interface ManaSymbolConfig {
  code: string                   // Scryfall code: 'W', 'U', 'B', 'R', 'G'
  unicode: string                // Unicode character from Mana font
  name: string                   // Display name
  color: string                  // Color from colors.ts
}
```

**Supported symbols (20+):**

**Basic mana (5):**
- W (white): "{W}" → unicode 'W'
- U (blue): "{U}" → unicode 'U'
- B (black): "{B}" → unicode 'B'
- R (red): "{R}" → unicode 'R'
- G (green): "{G}" → unicode 'G'

**Generic & colorless:**
- Generic (gray): "{1}", "{2}", etc. → numeric unicode
- X (variable): "{X}" → unicode 'X'
- Z (variable, recent): "{Z}" → unicode 'Z'
- Colorless: "{C}" → unicode 'C'

**Hybrid (11):**
- {W/U}, {W/B}, {U/R}, {U/B}, {B/R}, {B/G}, {R/W}, {R/G}, {G/W}, {G/U}, {2/W}, {2/U}, {2/B}, {2/R}, {2/G}
- Each maps to unicode character from Mana font
- Example: "{W/U}" → unicode '𝄐' (composite symbol)

**Special:**
- {E} (energy): universe energy counter
- {T} (tap): tap symbol (print-only)
- {Q} (untap): untap symbol (print-only)
- {S} (snow): snow mana

**Usage:**
```typescript
import { MANA_SYMBOLS } from '@/constants/manaSymbols'

// Render mana symbol in card
export function ManaSymbol({ code }: Props) {
  const symbol = MANA_SYMBOLS.find(s => s.code === code)
  return (
    <Text style={{
      fontFamily: 'Mana',
      color: symbol.color,
      fontSize: 18
    }}>
      {symbol.unicode}
    </Text>
  )
}

// Parse mana cost string
export function parseManaString(cost: string): string[] {
  // "{W}{U}{2}" → ['W', 'U', '2']
  const matches = cost.match(/{([^}]+)}/g) || []
  return matches.map(m => m.slice(1, -1))
}
```

**Font: Mana.ttf**
- Loaded in app/_layout.tsx via expo-font
- Custom font mapping Scryfall symbol codes to unicode
- Supports all MTG mana symbols and special symbols
- Used in ManaCost.tsx, ManaSymbol.tsx, OracleText.tsx components

## Constants Organization

**Directory layout:**
```
constants/
├── colors.ts          # Dark theme palette
├── cardTypes.ts       # 9 card types & Scryfall queries
└── manaSymbols.ts     # 20+ mana symbols & unicode mappings
```

**Import pattern:**
```typescript
// Use named imports
import { COLORS } from '@/constants/colors'
import { CARD_TYPES } from '@/constants/cardTypes'
import { MANA_SYMBOLS } from '@/constants/manaSymbols'
```

## Agent Responsibilities

- **executor:** Constants implementation, value management
- **designer:** Color palette design, visual consistency
- **quality-reviewer:** Constant naming, magic number elimination, DRY principle

## Related Modules

- `components/ManaCost.tsx` — Uses MANA_SYMBOLS for rendering
- `components/ManaSymbol.tsx` — Maps symbol codes via MANA_SYMBOLS
- `services/scryfall.ts` — Uses CARD_TYPES for query building
- `providers/SettingsProvider.tsx` — Could use COLORS for theme switching
- All components — Use COLORS for styling
