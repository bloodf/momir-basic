# Thermal Printing

## Overview

The printer subsystem adds real thermal printer discovery, registry storage, queue persistence, document rendering, and native transport support to the Expo app. It is built around `react-native-thermal-pos-printer`, `expo-sqlite`, and a shared receipt document model.

Main files:

- `services/printer/render/document.ts`
- `services/printer/queue/engine.ts`
- `services/printer/registry/service.ts`
- `services/printer/adapters/native.ts`
- `services/printer/adapters/fake.ts`
- `services/printer/storage/repositories.ts`

## Architecture

Conceptually, the flow is:

`PrintDocument -> PrintQueue -> PrinterRegistry -> TransportAdapters`

In this codebase that maps to:

1. **PrintDocument**
   - `CardReceiptDocument`
   - `DiagnosticsDocument`
   - File: `services/printer/render/document.ts`
   - Responsibility: turn app data into receipt-friendly ESC/POS content

2. **PrintQueue**
   - `QueueEngine`
   - File: `services/printer/queue/engine.ts`
   - Responsibility: claim jobs, dispatch them, retry safe failures, stop on uncertain writes

3. **PrinterRegistry**
   - `registryService`
   - File: `services/printer/registry/service.ts`
   - Responsibility: discover printers, upsert them into SQLite, save the preferred printer ID, filter unsupported transports on iOS

4. **TransportAdapters**
   - `NativeThermalPrinterAdapter`
   - `FakePrinterAdapter`
   - Files: `services/printer/adapters/native.ts`, `services/printer/adapters/fake.ts`
   - Responsibility: talk to the real native module, or provide deterministic web and test behavior

## Supported printers and transports

### iOS

- BLE only
- `registryService` filters out classic Bluetooth on iOS in `filterTransport()`
- Requires a custom dev build because Expo Go can't load `react-native-thermal-pos-printer`

### Android

- BLE
- Classic Bluetooth
- TCP is represented in the type layer with `PrinterTransport = 'ble' | 'classic' | 'tcp'`
- The native adapter currently maps native device types to `ble`, `classic`, or `tcp`

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
