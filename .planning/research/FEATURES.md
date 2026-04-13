# Feature Landscape

**Domain:** MTG randomizer / casual companion app
**Researched:** 2026-04-13

## Table Stakes

Features users expect in an MTG utility app. Missing = app feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Random card by CMC (Momir mode) | Core value prop -- this IS a Momir randomizer | Already built | Must stay fastest |
| Card detail with oracle text, mana cost, type | Players need to read the card they just generated | Already built | Ensure face switching for double-faced cards |
| Life counter (multi-format) | Every MTG utility app has one; users expect 20/40/30 life presets | Already built | 7 game modes already; commander damage needs enhancement |
| Search with Scryfall syntax | Players want to find specific cards or explore | Already built | Advanced syntax parser already exists |
| Card history | Players want to recall what was generated last turn | Already built | Has search/filter already |
| Dice roller (D6-D20) | Every competitor (Lifetap, Lotus, AetherLife, Gauntlet) includes one; expected in any MTG utility | Low | Add D4, D6, D8, D10, D12, D20 -- Momir needs D6 for planar die |
| Coin flip | Ubiquitous in MTG utility apps (AetherLife, Lifetap, Lotus, Carbon) | Low | Simple random boolean with animation |
| Commander damage tracking | Commander is the most popular format; separate per-commander life loss is table stakes for any life counter | Medium | Current life counter lacks per-commander damage; Lifetap, Lotus, LifeElk all have it |
| Multi-player support (2-6 players) | Casual MTG is often multiplayer; competitive apps support up to 10 | Medium | Current life counter supports 2/4; needs 2-6 with player names |
| Poison / energy / experience counters | Standard tracker types; every premium life counter has them | Low | Current life counter already has poison, energy, experience |
| Offline / degraded mode | Players use apps at tables with bad WiFi; Scryfall must work when connectivity drops | High | Current network provider exists but no offline card cache; Lion's Eye charges for this |
| Haptic feedback | Confirms actions without looking; expected in modern utility apps | Low | expo-haptics already installed and used |

## Differentiators

Features that set this app apart from competitors. Not expected, but highly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Sub-second card generation** | THE fastest Momir randomizer -- tap to card under 1 second. No competitor prioritizes speed this aggressively | Medium | Pre-warm Scryfall cache for current CMC; prefetch next CMC; speculative fetch on CMC change |
| **One-handed swipe-to-reroll** | Swipe up on the card to reroll without reaching for a button; muscle memory speed. No MTG app does gesture-driven randomization | Medium | Use react-native-gesture-handler (already installed); PanResponder already in use on home screen |
| **Home screen widget** | Random card art on home screen; tap to open app and generate. Scry One and Crack A Card exist on iOS but NO Android MTG widget exists | High | Expo does not natively support widgets; requires native module or expo-widgets (if available in SDK 54) |
| **Expanded Momir variants** | Not just creatures -- artifacts, enchantments, instants, sorceries by CMC (like momir-vig.com). No native app offers this | Low | Scryfall API already supports type filtering; just needs UI for variant selection |
| **Planechase mode** | Random plane rolling with planar die (D6), phenomenon cards, plane transitions. Natural companion to casual play. Planechase Companion is separate app with 4.8 stars -- users want this combined | High | Need plane/phenomenon card database (103 planes, 11 phenomena); Scryfall has them; need planar die (D6 with special faces) |
| **Thermal printer integration** | Print card slips for paper token use. NO competitor has this -- genuinely unique feature | Already built | Continue maintaining; enhance with custom receipt layouts |
| **Tiered haptic feedback** | Light on CMC change, medium on card reveal, heavy on rare/mythic. Feels like "cracking a pack" -- emotional feedback loop | Low | expo-haptics already used; just needs trigger points and intensity mapping |
| **Share card image** | Generate card art + oracle text as shareable image. Social sharing drives word-of-mouth growth | Medium | react-native-view-shot already installed; need composable card image layout |
| **11-language i18n** | Already uniquely broad; most competitors support 2-6 languages. AetherLife has 7 | Already built | Maintain and expand; add RTL support if adding Arabic/Hebrew |
| **Game timer / turn tracker** | Timed turns for casual tournament play; Lifetap and Lotus have this but most Momir-specific apps don't | Low | Simple countdown timer with configurable duration |
| **Quick Actions / App Shortcuts** | Long-press app icon to "Random Creature CMC 3" or "Open Life Counter". No MTG app implements this | Medium | Android: intent filters; iOS: UIApplicationShortcutItem. Expo supports via app.json config |
| **Offline card pre-cache** | Background fetch of common CMC cards during idle; instant display on next use | High | Cache top N cards per CMC in SQLite (already used for printers); invalidate on Scryfall set updates |
| **Custom playmat background** | Upload image or choose card art as life counter background. AetherLife and Moxtopper offer this | Medium | Use card art from history or Scryfall; store in filesystem (expo-file-system already installed) |

## Anti-Features

Features to explicitly NOT build. These would dilute the app's identity or create unsustainable maintenance.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Deck builder | Different product category (Moxfield, Archidekt, Compendium dominate); scope explosion that distracts from randomizer speed | Link out to Scryfall decklist URLs if users want to save generated cards |
| Collection tracker | Requires backend, user accounts, massive database; different product entirely | Out of scope per PROJECT.md |
| Card pricing / market data | Adds API dependency (TCGPlayer, Cardmarket), requires auth, drifts from randomizer purpose | Link to Scryfall card page which has pricing links |
| Card scanner / camera recognition | Heavy ML dependency, privacy concerns, massive scope; Compendium and Lion's Eye already do this | Not our lane |
| Real-time multiplayer | Requires server infrastructure, matchmaking, auth; contradicts serverless architecture | Each player uses their own device |
| User accounts / authentication | Adds complexity, privacy obligations, server dependency; casual play doesn't need it | Keep settings local via AsyncStorage |
| Backend server | PROJECT.md explicitly scopes this out; serverless architecture is a strength (no downtime, no cost) | Scryfall API is the sole data source |
| Tournament / event integration | WotC's official companion app handles this; requires event organizer partnerships | Out of scope |
| AI-powered deck advice | Compendium's "Mox" feature; requires LLM integration, ongoing cost, scope creep | Not relevant to randomizer use case |
| Social features (friends, leaderboards) | Playgroup has this; requires accounts, servers, moderation overhead | Local-only stats (win/loss per session) are fine |

## Feature Dependencies

```
Sub-second card generation --> Offline card pre-cache (cache enables instant display)
Sub-second card generation --> One-handed swipe-to-reroll (gesture enables speed)
Home screen widget --> Quick Actions (both are OS-integration, share native module work)
Planechase mode --> Dice roller (planar die is a special D6)
Planechase mode --> Offline card pre-cache (planes need offline access at tables)
Commander damage tracking --> Multi-player support (commander damage is per-opponent)
Share card image --> Card detail screen (image generation from existing card view)
Expanded Momir variants --> Type picker UI (type picker already exists, just needs more types)
Custom playmat background --> Card history / Scryfall fetch (source of images)
Game timer --> Life counter (timer lives inside the life counter screen)
Tiered haptic feedback --> All interactions (cross-cutting enhancement)
```

## Competitive Gap Analysis

What the top competitors have that this app lacks (ordered by user impact):

| Gap | Who Has It | Impact | Effort |
|-----|-----------|--------|--------|
| Dice roller (D4-D20) | Lifetap, Lotus, AetherLife, Gauntlet | HIGH | Low |
| Coin flip | AetherLife, Lifetap, Lotus, Carbon | HIGH | Low |
| Commander damage tracking | Lifetap, Lotus, LifeElk, Playgroup | HIGH | Medium |
| 2-6+ player support | Lifetap (6), Lotus (10), Moxtopper (10) | MEDIUM | Medium |
| Game timer / turn tracker | Lifetap, Lotus | MEDIUM | Low |
| Planechase mode | Planechase Companion (separate app) | MEDIUM | High |
| Offline card database | Lion's Eye (paid feature) | MEDIUM | High |
| Home screen widget | Scry One, Crack A Card (iOS only) | MEDIUM | High |
| Game stats (win/loss) | Playgroup, Gauntlet | LOW | Medium |
| Card pricing | Lotus (TCGPlayer integration) | LOW (anti-feature) | Don't build |

## MVP Recommendation

The app already has a strong foundation. Prioritize closing the table-stakes gaps and then lean into speed differentiators:

### Priority 1: Close table-stakes gaps (makes the app feel complete)
1. **Dice roller** -- D4 through D20. Every competitor has one. Low effort, high impact.
2. **Coin flip** -- Simple animation, haptic on result. Same reasoning.
3. **Commander damage tracking** -- Per-commander life loss in the life counter. Critical for Commander players.

### Priority 2: Speed differentiators (makes the app THE BEST Momir randomizer)
4. **One-handed swipe-to-reroll** -- Gesture-driven randomization. No competitor does this. Medium effort, unique value.
5. **Tiered haptic feedback** -- Emotional "pack-cracking" feel on card reveal. Low effort, high delight.
6. **Expanded Momir variants** -- Artifacts, enchantments, instants by CMC. Low effort, differentiates from MTGMomir app.

### Priority 3: OS integration (visibility and convenience)
7. **Quick Actions / App Shortcuts** -- Long-press to "Random Creature CMC 3". Medium effort, high convenience.
8. **Home screen widget** -- Random card art. High effort but unique on Android. Research expo-widgets SDK 54 support first.
9. **Share card image** -- Social sharing for growth. Medium effort.

### Priority 4: Deepen casual play
10. **Planechase mode** -- Natural extension for casual players. High effort but fills a gap (currently requires separate app).
11. **Offline card pre-cache** -- Enables true instant display. High effort, critical for the speed vision.
12. **Game timer** -- Nice-to-have for timed casual play.

### Defer indefinitely
- Deck builder, collection tracker, card pricing, card scanner, social features, AI advice, tournament integration (see Anti-Features)

## Feature-Phase Mapping Suggestion

| Phase | Features | Rationale |
|-------|----------|-----------|
| Phase 1 (Quick Wins) | Dice roller, coin flip, commander damage, tiered haptics | Low-hanging fruit that closes table-stakes gaps |
| Phase 2 (Speed Core) | Swipe-to-reroll, expanded Momir variants, share card image | Double down on what makes this app special |
| Phase 3 (OS Integration) | Quick Actions, home screen widget, game timer | Platform integration for visibility and convenience |
| Phase 4 (Casual Expansion) | Planechase mode, offline pre-cache, custom playmat | Deep features for dedicated users |

## Sources

- [Lifetap Life Counter (Draftsim #1 ranked)](https://play.google.com/store/apps/details?id=com.lifetap&hl=en_US) -- MEDIUM confidence, feature list from store page
- [Lotus MTG Life Counter](https://lifecounter.app/) -- MEDIUM confidence, feature list from product site
- [Draftsim Life Counter Rankings](https://draftsim.com/best-mtg-life-counter-app/) -- MEDIUM confidence, editorial ranking
- [AetherLife MTG Life Counter](https://apps.apple.com/us/app/aetherlife-mtg-life-counter/id6745836468) -- MEDIUM confidence, App Store listing
- [Gauntlet MTG Tracker](https://apps.apple.com/us/app/gauntlet-mtg-tracker/id1466578932) -- LOW confidence, last updated 2023
- [Playgroup MTG](https://www.rolldice.games/blog/magic-the-gathering-life-counter-apps-reviewed/) -- MEDIUM confidence, review article
- [MTGMomir iOS App](https://mtgmomir.appstor.io/) -- MEDIUM confidence, App Store listing; 4.7 stars, not updated in 8 years
- [Momir Generator (momir-vig.com)](https://momir-vig.com/) -- MEDIUM confidence, web tool demonstrating expanded variants
- [Momir Basic Toolkit](https://momirbasictoolkit.netlify.app/) -- LOW confidence, web tool
- [Planechase Companion](https://apps.apple.com/us/app/planechase-companion/id6445894290) -- MEDIUM confidence, App Store listing
- [Planechase MTG Companion (Android)](https://planechase-mtg-companion.apps112.com/) -- MEDIUM confidence, feature list from store page
- [Lion's Eye MTG Scanner](https://apps.apple.com/us/app/mtg-card-scanner-lions-eye/id1546754798) -- MEDIUM confidence, App Store listing with offline DB feature
- [Scry One MTG Widgets](https://apps.apple.com/us/app/scry-one-mtg-widgets/id1549591592) -- MEDIUM confidence, iOS widget reference
- [Crack A Card](https://apps.apple.com/us/app/crack-a-card/id6444217928) -- LOW confidence, not updated since 2022
- [Current Reader gesture/haptic design](https://www.currentreader.app/docs/gestures) -- MEDIUM confidence, well-documented UX pattern reference
- [WotC Official Momir Basic Format](https://magic.wizards.com/en/formats/momir-basic) -- HIGH confidence, official format rules