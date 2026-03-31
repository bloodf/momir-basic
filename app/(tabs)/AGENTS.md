# Tab Navigation Layout

**Parent:** [../../AGENTS.md](../../AGENTS.md)

**Generated:** 2026-03-31

## Overview

Bottom tab navigation with 5 main app sections: Cast randomizer (home), advanced search, game modes, history, and settings. Managed by Expo Router with nested layout.

## File

### `_layout.tsx`

Tab bar configuration:

```typescript
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: true,
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tabs.Screen name="(home)" options={{ title: 'Cast', icon: 'wand-magic' }} />
      <Tabs.Screen name="search" options={{ title: 'Search', icon: 'magnifying-glass' }} />
      <Tabs.Screen name="game" options={{ title: 'Game', icon: 'gamepad' }} />
      <Tabs.Screen name="history" options={{ title: 'History', icon: 'clock' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', icon: 'gear' }} />
    </Tabs>
  )
}
```

**Tabs:**

- **(home)** — Main card randomizer screen (cast by CMC and type)
- **search** — Advanced Scryfall search with quick filters
- **game** — Game mode selector (Standard, Commander, Brawl, etc.)
- **history** — Previously seen cards with filters
- **settings** — App settings, printer config, language, dev mode

## Design Patterns

- **Nested Routing**: Tab layout nests sub-screens
- **Bottom Tab Navigation**: Persistent navigation across app
- **Icon-based Tabs**: Visual affordance with Mana font icons

## Styling

- Tab bar styling (active/inactive colors)
- Icon selection from Mana symbol font
- Header visibility per-tab configurable
- Safe area insets (notches, home bar)
