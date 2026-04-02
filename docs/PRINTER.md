# Thermal Printing

## Overview

The printer subsystem adds real thermal printer discovery, registry storage, document rendering, and native transport support to the Expo app. It is built around `react-native-thermal-pos-printer`, `expo-sqlite`, and a shared receipt document model.

Main files:

- `services/printer/render/document.ts`
- `services/printer/registry/service.ts`
- `services/printer/adapters/native.ts`
- `services/printer/adapters/fake.ts`
- `services/printer/storage/repositories.ts`

## Architecture

Conceptually, the flow is:

`PrintDocument -> PrinterRegistry -> TransportAdapters`

In this codebase that maps to:

1. **PrintDocument**
   - `CardReceiptDocument`
   - `DiagnosticsDocument`
   - File: `services/printer/render/document.ts`
   - Responsibility: turn app data into receipt-friendly ESC/POS content

2. **PrinterRegistry**
   - `registryService`
   - File: `services/printer/registry/service.ts`
   - Responsibility: discover printers, upsert them into SQLite, save the preferred printer ID, filter unsupported transports on iOS

3. **TransportAdapters**
   - `NativeThermalPrinterAdapter`
   - `FakePrinterAdapter`
   - Files: `services/printer/adapters/native.ts`, `services/printer/adapters/fake.ts`
   - Responsibility: talk to the real native module, execute direct prints, or provide deterministic web and test behavior

## Supported printers and transports

> **Support Contract**: This app supports a **certified support matrix** only. Printers and transport combinations outside the certified matrix are **best-effort / non-goal** for v1 hardening. Universal compatibility claims are **blocked** until hardware proof is provided.

### Support Matrix Summary

| Platform | BLE | Classic Bluetooth | TCP |
|----------|-----|-------------------|-----|
| Android  | ✅  | ✅ (certified)     | ✅  |
| iOS      | ✅  | ❌ / MFi only      | ✅  |

**iOS Classic Bluetooth**: Filtered by default. **MFi / External Accessory hardware is required** before iOS Classic can be enabled. Classic-only printers without MFi chip are **not supported**.

### Android

- **Transports**: BLE, Classic Bluetooth, TCP
- All transports require the printer to be on the **certified support matrix** (see `HARDWARE_VALIDATION.md`)
- Off-matrix printers: best-effort only; no guaranteed compatibility

### iOS

- **Transports**: BLE, TCP
- **Classic Bluetooth**: BLOCKED — requires MFi certification hardware. Non-MFi Classic printers are **not supported** and will not appear in scan results.
- `registryService` filters out Classic Bluetooth on iOS in `filterTransport()`
- Requires a custom dev build because Expo Go can't load `react-native-thermal-pos-printer`

### Adding New Printers to the Matrix

New printer models require **certification evidence** before being added to the supported matrix:
1. Physical validation on certified device hardware
2. Firmware version documented
3. Paper width verified (58mm / 80mm)
4. Platform OS version recorded
5. Build type (development / production) noted
6. Sign-off from product leadership

Until certified, printers are **off-matrix** and treated as best-effort.

## Storage model

SQLite stores two main tables through `services/printer/storage/`:

- `printers`, stable registry records with capabilities and last-seen metadata
- `print_jobs`, immutable payloads plus mutable queue state like attempts, last error, and retry timing

The settings layer stores only user preferences such as:

- `preferredPrinterId`
- `paperWidth`
- `printArt`
- `autoPrint`

That split keeps printer identity in SQLite, not in AsyncStorage blobs.

## How to add a printer

User flow:

1. Open **Settings**
2. Open **Printer**
3. Tap **Scan**
4. Pick a device
5. Save it as the preferred printer

Current status note: the domain and service layers are in place, but `app/(tabs)/settings/printer.tsx` still contains mock scan/connect UI from the older implementation. The long term source of truth is `registryService`, not the legacy `{ name, address, type }` settings shape.

## Queue behavior

`QueueEngine` uses bounded retries for safe failures:

- automatic backoff schedule: 15s, 60s, 300s
- max automatic retries: 3
- safe failures become `retry_wait`
- uncertain printer writes become `failed_manual`
- completed jobs become `completed`

This is intentional. If the app can't tell whether bytes were partially written, it stops auto-retrying to avoid duplicate receipts.

## Print document behavior

`CardReceiptDocument` renders:

- card name
- mana cost
- type line
- oracle text
- flavor text
- power/toughness
- optional art placeholder or image
- optional QR code back to Scryfall
- set code footer

`DiagnosticsDocument` renders:

- app name
- platform
- transport
- paper width
- capability summary
- timestamp

## Custom dev build requirement

Printing requires a native build.

- `expo-dev-client` is installed
- `app.json` includes Bluetooth permissions for iOS and Android
- `eas.json` defines a `development` profile
- `services/printer/adapters/factory.ts` falls back to `FakePrinterAdapter` on web, in tests, or when the native module is missing

Typical setup:

```bash
cd expo
bun i
bun run start --dev-client
```

## Troubleshooting

### Printer doesn't appear

- Confirm you're using a custom dev build, not Expo Go
- On iOS, check that the printer supports BLE
- On Android, check Bluetooth permissions in system settings
- Re-scan and verify the printer is powered on and discoverable

### Wrong transport on iOS

- Classic Bluetooth devices are filtered out on iOS by design
- Use a BLE-capable printer for iPhone and iPad testing

### Print jobs stop retrying

- Check whether the job hit `failed_manual`
- That state means the app saw an uncertain write or exceeded retry limits
- Manual user retry is safer than blind duplicate printing

### Testing without hardware

- The app uses `FakePrinterAdapter` for web and tests
- Jest mocks also cover `react-native-thermal-pos-printer` and `expo-sqlite`
