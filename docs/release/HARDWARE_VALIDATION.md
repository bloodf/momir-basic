# Hardware Validation — Momir-Basic

## Overview

Physical device validation is REQUIRED before publishing. This app uses Bluetooth to communicate with thermal receipt printers — this cannot be tested on simulators or emulators.

## ⚠️ Support Contract — v1 Hardening

**This document defines the certified support matrix. Off-matrix printers are best-effort / non-goal.**

### Platform Transport Support

| Platform | BLE | Classic Bluetooth | TCP |
|----------|-----|-------------------|-----|
| Android  | ✅  | ✅ (certified)     | ✅  |
| iOS      | ✅  | ❌ / MFi only      | ✅  |

**iOS Classic Bluetooth is gated behind MFi / External Accessory hardware.** Non-MFi Classic printers are NOT supported and will not appear in scan results.

---

## Certification Matrix — v1 Sign-Off Required

| Printer Model | Firmware Version | Paper Width | Platform | OS Version | Build Type | Status |
|--------------|------------------|-------------|----------|------------|------------|--------|
| [DECISION NEEDED: printer model] | [DECISION NEEDED: firmware] | [DECISION NEEDED: 58mm/80mm] | Android | [DECISION NEEDED: OS version] | development | PENDING |
| [DECISION NEEDED: printer model] | [DECISION NEEDED: firmware] | [DECISION NEEDED: 58mm/80mm] | iOS | [DECISION NEEDED: OS version] | development | PENDING |

**No printers are certified until hardware inventory is populated and physical validation is complete.**

---

## Certification Hardware Inventory

### Printers

| Printer Model | Quantity | Owner/Source | Notes |
|--------------|----------|-------------|-------|
| [DECISION NEEDED: printer model] | 1 | [DECISION NEEDED: owner or procurement source] | Primary test printer |
| [DECISION NEEDED: backup printer model] | 1 | [DECISION NEEDED: owner or procurement source] | Backup / fallback |

### Android Test Devices

| Device Model | OS Version | Owner/Source | Notes |
|--------------|------------|-------------|-------|
| [DECISION NEEDED: Android device model] | [DECISION NEEDED: Android version] | [DECISION NEEDED: owner/source] | Primary Android test device |

### iOS Test Devices

| Device Model | OS Version | Owner/Source | Notes |
|--------------|------------|-------------|-------|
| [DECISION NEEDED: iPhone model] | [DECISION NEEDED: iOS version] | [DECISION NEEDED: owner/source] | Primary iOS test device |
| [DECISION NEEDED: iPad model] | [DECISION NEEDED: iPadOS version] | [DECISION NEEDED: owner/source] | iPad validation (if supported) |

**Note**: iOS Classic Bluetooth validation requires **MFi-certified External Accessory hardware**. If MFi hardware is unavailable, iOS Classic remains BLOCKED.

---

## Blocked Requirements

The following are **BLOCKED** and require hardware proof before release sign-off:

| Requirement | Blocker | Evidence Required |
|-------------|---------|------------------|
| Universal ESC/POS compatibility | No hardware proof for all printer models | Certification matrix populated with physical validation evidence |
| Non-MFi iOS Classic Bluetooth | iOS filters Classic by default; no MFi hardware confirmed | MFi External Accessory hardware obtained and tested |

If product leadership requires universal compatibility or non-MFi iOS Classic:
1. Hardware must be procured and physically validated
2. Results added to certification inventory above
3. Sign-off blocked until evidence is provided

---

## Validation Requirements

### iOS Physical Validation
- Device: Real iPhone (iOS 14+ recommended)
- Printer: Compatible ESC/POS Bluetooth thermal printer on certification matrix
- What to test:
  1. Install production build via TestFlight
  2. Grant Bluetooth permission when prompted
  3. Discover and pair with thermal printer (verify printer appears on matrix)
  4. Run diagnostics print
  5. Print a card receipt
  6. Verify print output quality
  7. Test error handling (printer off, out of paper)

### Android Physical Validation
- Device: Real Android device (Android 10+ recommended)
- Printer: Compatible ESC/POS Bluetooth thermal printer on certification matrix
- What to test: Same as iOS

### Validation Evidence Required

For publish sign-off, the following evidence must be captured:
- [ ] iOS: Screenshot of successfully printed card receipt
- [ ] iOS: Build ID from TestFlight/EAS build used for testing
- [ ] iOS: Printer model + firmware confirmed against certification matrix
- [ ] Android: Screenshot of successfully printed card receipt
- [ ] Android: Build ID from EAS build used for testing
- [ ] Android: Printer model + firmware confirmed against certification matrix
- [ ] Both: Notes on any compatibility issues found
- [ ] Both: Hardware inventory populated with owner/source for all devices

## Current Status

**[DECISION NEEDED: certification hardware inventory]**

This task requires:
1. A real iPhone with Bluetooth capability
2. A real Android device with Bluetooth capability
3. A compatible ESC/POS Bluetooth thermal printer (on certification matrix)
4. For iOS Classic: MFi/External Accessory certified hardware

**This task is BLOCKED pending hardware access.**

---

## Blocker Classification

This is an **external hardware dependency** — it cannot be resolved by code changes alone. It requires:
- Access to physical hardware (iPhone + Android device)
- A compatible thermal printer on the certification matrix
- For iOS Classic: MFi-certified hardware (no exceptions)
- Time to run the validation tests

**Hardware must be sourced and added to the certification inventory before validation can begin.**
