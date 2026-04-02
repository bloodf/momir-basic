<!-- Parent: ../AGENTS.md -->

# app/ — Expo Router Screens

Generated: 2026-03-31

## Overview

The `app/` directory contains the Expo Router navigation structure and all top-level screens. The routing hierarchy uses file-based routing with support for modals, tabs, and native intent handling.

## Architecture

**Root layout (_layout.tsx):**
- Initializes global providers: QueryClientProvider, GestureHandlerRootView, I18nProvider, SettingsProvider, HistoryProvider, NetworkProvider, ToastProvider
- Loads Mana symbol font (custom TTF for mana rendering)
- Implements PrinterAutoConnect component for background printer reconnection
- Renders Stack navigation with modal presentations for card, print-preview, and life-counter

**Navigation structure:**
- `(tabs)` — Main tab navigation (home, search, history, settings, game)
- `card` — Card detail modal (presentation: 'modal')
- `print-preview` — Print preview modal (presentation: 'modal')
- `life-counter` — Life counter full-screen modal (presentation: 'fullScreenModal', slide_from_bottom animation)
- `+not-found` — 404 fallback
- `+native-intent` — Native deep linking handler

## Key Files

### _layout.tsx
- Root layout component combining all global providers
- PrinterAutoConnect component: attempts reconnection to preferred printer on startup via ThermalPrinterDriver native module
- Font loading (Mana symbol font)
- Stack navigator configuration with modal presentations

### card.tsx
- Card detail modal screen
- Displays full card information from Scryfall API
- Print button to navigate to print-preview
- Add to history functionality via HistoryProvider

### print-preview.tsx
- Print preview modal with two render modes: receipt (thermal printer) and full card (image)
- Integrates with printer service for capability detection
- Shows dithered image preview for thermal printer output
- Handles direct print execution and error states

### life-counter.tsx
- Full-screen life counter for 2-8 players
- Tracks life totals, maintains history per session
- Reset and back buttons
- Optimized for landscape orientation

### modal.tsx
- Generic modal screen for action sheets and dialogs
- Used by tab screens for context-specific modals

### +not-found.tsx
- 404 fallback screen
- Handles undefined routes

### +native-intent.tsx
- Native deep linking handler
- Routes intent URLs from Android/iOS native code
- Parses card identifiers and navigates to card screen

## Subdirectories

### (tabs)/ — Tab Navigation

Main navigation container with persistent tab bar.

**_layout.tsx:**
- BottomTabNavigator configuration
- Tab icons and labels
- Tab options for home, search, history, settings, game

#### (tabs)/(home)/
- `_layout.tsx` — Stack layout for home tab
- `index.tsx` — Home screen (featured cards, recent history, quick actions)

#### (tabs)/search/
- `_layout.tsx` — Stack layout for search tab
- `index.tsx` — Card search screen with filters, grid/list view toggle, infinite scroll

#### (tabs)/history/
- `_layout.tsx` — Stack layout for history tab
- `index.tsx` — Card history list (date grouped, swipe to remove, pagination)

#### (tabs)/settings/
- `_layout.tsx` — Stack layout for settings tab
- `index.tsx` — Main settings screen (app preferences, data management, about)
- `printer.tsx` — Printer setup and configuration screen (device pairing, test print, capabilities)

#### (tabs)/game/
- `_layout.tsx` — Stack layout for game tab
- `index.tsx` — Game home screen (player setup, format selection, quick start)

## Agent Responsibilities

- **executor:** Screen implementation, navigation logic, modal presentations
- **designer:** Layout design, screen hierarchy, navigation UX
- **build-fixer:** Routing configuration, module resolution for Expo Router
- **test-engineer:** Navigation flow tests, modal state tests, deep linking tests

## Related Modules

- `providers/` — Global context providers (Settings, History, Network)
- `i18n/` — Internationalization for screen labels and messages
- `components/` — Reusable components used across screens
- `services/scryfall.ts` — Card API integration
- `services/printer/` — Printer service for print-preview functionality
- `types/` — TypeScript interfaces for navigation params and screen props
