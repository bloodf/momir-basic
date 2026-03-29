# Momir-Basic — MTG Card Generator App

## Features

- **Mana Cost Selector** — Large swipeable mana orb (0–20) on the home screen to pick your converted mana cost
- **Card Type Picker** — Tap to choose from Creature, Commander, Artifact, Equipment, Enchantment, Aura, 5 Random Instants, 5 Random Sorceries, or 5 Random Lands
- **Cast Button** — Fetches a random matching card from Scryfall's real API
- **Card Display** — Shows full card art, name, mana cost with colored mana icons, type line, oracle text with inline mana symbols, power/toughness, set & rarity
- **Reroll & Save** — Reroll for another random card or save to your history
- **Card History** — Searchable, filterable list of all fetched cards with thumbnails; tap to view full details
- **Game Session Mode** — Track turns, players (1–4), cards generated per turn, and view session summaries with mana curve stats
- **Bluetooth Printer Support** — Full printer UI with scan, connect, and print functionality (ready for development builds; simulated in preview)
- **Print Layout** — Cards formatted for 58mm/80mm thermal printers with dithered art, QR code linking to Scryfall, and ESC/POS commands
- **Settings** — Printer config (paper width, auto-print, print art), card fetch filters (exclude digital-only, Un-sets), display preferences
- **Offline Support** — Cards cached locally; works without internet using previously fetched cards

## Design

- **Dark MTG-inspired theme** — Deep blue-black background (#0a0a14) with gold accents (#f0c040), inspired by Magic card frames
- **Mana symbol icons** — Colored circular icons for each mana type (White/cream, Blue, Black, Red, Green, Colorless) rendered inline in text and as large selector elements
- **Card display** — Rich card detail view with high-res art crop, styled like a physical Magic card
- **Smooth animations** — Number transitions on the mana orb, card slide-up reveals, loading spinner with mana orb rotation, haptic feedback on buttons
- **Bottom tab bar** — Gold-accented tab icons on the dark background for Home, History, Game, and Settings

## Screens

- **Home** — Central mana orb selector, card type dropdown, large "CAST" button, printer/WiFi status indicators
- **Card Detail** — Full card art and info with Print, Save, and Reroll buttons; swipe to dismiss
- **History** — Scrollable list of previously fetched cards with search bar and filters (type, CMC, color)
- **Game Session** — Turn counter, player tracking, cards-per-turn log, session summary with stats
- **Settings** — Printer setup, card fetch preferences, display options, about section
- **Printer Setup** — Bluetooth scanner, device list, connection manager, test print button
- **Type Picker** — Bottom sheet modal for selecting card type

## App Icon

- Dark blue-black background with a glowing golden mana orb in the center, surrounded by the five MTG mana color symbols (white, blue, black, red, green) arranged in a circle, with a subtle magical glow effect
