# Hardware Validation — Momir-Basic

## Overview

Physical device validation is REQUIRED before publishing. This app uses Bluetooth to communicate with thermal receipt printers — this cannot be tested on simulators or emulators.

## Validation Requirements

### iOS Physical Validation
- Device: Real iPhone (iOS 14+ recommended)
- Printer: Compatible ESC/POS Bluetooth thermal printer
- What to test:
  1. Install production build via TestFlight
  2. Grant Bluetooth permission when prompted
  3. Discover and pair with thermal printer
  4. Run diagnostics print
  5. Print a card receipt
  6. Verify print output quality
  7. Test error handling (printer off, out of paper)

### Android Physical Validation
- Device: Real Android device (Android 10+ recommended)
- Printer: Compatible ESC/POS Bluetooth thermal printer
- What to test: Same as iOS

## Current Status

**[DECISION NEEDED: hardware validation environment]**

This task requires access to:
1. A real iPhone with Bluetooth capability
2. A real Android device with Bluetooth capability  
3. A compatible ESC/POS Bluetooth thermal printer

Without these, this task cannot be completed.

## Supported Printers

Known compatible printer types:
- ESC/POS Bluetooth thermal receipt printers
- Printers supporting standard ESC/POS command set

Note: Some thermal printers use proprietary protocols. The app uses `react-native-thermal-pos-printer` which supports common ESC/POS printers.

## Validation Evidence Required

For publish sign-off, the following evidence must be captured:
- [ ] iOS: Screenshot of successfully printed card receipt
- [ ] iOS: Build ID from TestFlight/EAS build used for testing
- [ ] Android: Screenshot of successfully printed card receipt
- [ ] Android: Build ID from EAS build used for testing
- [ ] Both: Notes on any compatibility issues found

## Blocker Classification

This is an **external hardware dependency** — it cannot be resolved by code changes alone. It requires:
- Access to physical hardware (iPhone + Android device)
- A compatible thermal printer
- Time to run the validation tests

**This task is BLOCKED pending hardware access.**
