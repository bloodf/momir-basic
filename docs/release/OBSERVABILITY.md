# Observability — Momir-Basic

## Overview

Production crash and error monitoring via Sentry. Errors are captured with release version, device context, and stack traces for debugging.

## Printer Session Diagnostics

The app emits structured events for the full printer lifecycle, captured via platform-native logging for hardware certification evidence.

### Event Taxonomy

All `PrinterSession` events are emitted as structured JSON with this metadata:

```json
{
  "ts": "2026-03-29T10:00:00.000Z",
  "platform": "android|ios",
  "appVersion": "1.0.0",
  "buildId": "1",
  "domain": "PrinterSession",
  "event": "<EVENT_TYPE>",
  "payload": { ... }
}
```

| Event | Trigger |
|-------|---------|
| `PRINTER_PERMISSION_REQUESTED` | App requests Android Bluetooth permissions |
| `PRINTER_PERMISSION_GRANTED` | All required permissions granted |
| `PRINTER_PERMISSION_DENIED` | Permission denied or permanently rejected |
| `PRINTER_DISCOVERY_STARTED` | Printer discovery scan initiated |
| `PRINTER_DISCOVERY_RESULT` | Individual device found during scan |
| `PRINTER_DISCOVERY_COMPLETED` | Discovery scan finished with device count |
| `PRINTER_CONNECT_STARTED` | Connection attempt initiated |
| `PRINTER_CONNECT_SUCCESS` | Connection established |
| `PRINTER_CONNECT_FAILED` | Connection failed with error code |
| `PRINTER_DISCONNECTED` | Printer disconnected |
| `PRINT_JOB_QUEUED` | Print job added to queue |
| `PRINT_JOB_DISPATCHED` | Job picked up for printing |
| `PRINT_JOB_COMPLETED` | Job printed successfully |
| `PRINT_JOB_FAILED` | Job failed with error |
| `PRINT_JOB_SENT_UNKNOWN` | Job sent but delivery unconfirmed |
| `PRINTER_NATIVE_ERROR` | Native module error with explicit error code |

### Android Logcat Capture

```bash
# Capture PrinterSession events for a specific app
adb logcat --pid=$(adb shell pidof host.exp.exponent) -s PrinterSession:* *:S

# Capture all printer-related output (includes native thermal-printer module)
adb logcat -s PrinterSession:* ReactNative:* JS:* *:S | grep -i "printer\|thermal\|bluetooth\|ble\|classic\|tcp"

# Save to file for certification evidence
adb logcat -v time --pid=$(adb shell pidof host.exp.exponent) -s PrinterSession:* > printer-session-$(date +%Y%m%d-%H%M%S).log
```

### iOS Device Log Capture

```bash
# Using Console.app (open on macOS with device connected)
# Filter by subsystem: com.rork.momir-basic.PrinterSession

# Using log command-line tool
log stream --predicate 'subsystem == "com.rork.momir-basic.PrinterSession"' --level debug

# Save to file for certification evidence
log show --predicate 'subsystem == "com.rork.momir-basic.PrinterSession"' --level debug --output printer-session-$(date +%Y%m%d-%H%M%S).log
```

### Evidence Collection for Certification

```bash
#!/bin/bash
# collect-printer-evidence.sh
# Run on device/emulator before hardware certification tests

ANDROID_PKG="host.exp.exponent"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "Collecting printer session logs..."
adb logcat -v time -s PrinterSession:* > "printer-evidence-${TIMESTAMP}.log"
echo "Evidence saved to printer-evidence-${TIMESTAMP}.log"
```

### Release-Critical Printer Errors

The following printer errors should block release:

| Error Code | Severity | Action |
|------------|----------|--------|
| `NATIVE_UNAVAILABLE` | P0 | Native module not linked — investigate build |
| `TCP_TIMEOUT` | P1 | Network printer unreachable — check connectivity |
| `CONNECTION_REJECTED` | P1 | Pairing/auth failed — investigate Bluetooth |
| `SEND_FAILED` | P1 | Printer not responding — check power/paper |

## Installation

```bash
npx expo install @sentry/react-native
```

## Configuration

### 1. Initialize Sentry in `app/_layout.tsx` or entry point:

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: '[DECISION NEEDED: Your Sentry DSN from sentry.io]',
  environment: process.env.NODE_ENV,
  release: 'momir-basic@' + Constants.expoConfig?.version,
  dist: String(Constants.expoConfig?.android?.versionCode ?? 1),
  tracesSampleRate: 1.0,
});
```

### 2. Wrap root component:

```typescript
export default Sentry.wrap(App);
```

## Sourcemap Upload

Sourcemaps are required for readable stack traces in production. Add to `eas.json` build hooks or run manually:

```bash
# After production build
eas build --profile production --platform ios --local
eas build --profile production --platform android --local

# Upload sourcemaps (run after build)
eas run --platform ios
# OR manually:
npx sentry-cli releases files <VERSION> upload-sourcemaps ./dist/assets
```

### Automated via EAS Build Hook (recommended)

Add to `eas.json` build profile:

```json
"production": {
  "build": "./build.sh",
  "postBuild": "npx @sentry/react-native/cli submit-sourcemaps --revision <COMMIT_SHA>"
}
```

## Release Tagging

Sentry uses `release` to group errors. Format: `momir-basic@VERSION` (e.g., `momir-basic@1.0.0`).

Since `cli.appVersionSource: "remote"` is set in `app.json`, EAS controls `ios.buildNumber` and `android.versionCode`. Set `release` in Sentry.init to the `version` from `app.json` (the user-facing semantic version).

## Launch-Blocking Errors

The following errors should block a release or trigger immediate investigation:

| Error Type | Severity | Action |
|------------|----------|--------|
| App crash on launch (JS bundle fails to load) | P0 | Revert deploy immediately |
| Authentication/authorization failures | P0 | Investigate before expand rollout |
| Native module crashes (BLE, camera, printing) | P1 | Hotfix via EAS Update if JS-only fix; new build if native |
| API failures returning 5xx from Scryfall | P1 | Check if offline mode works; investigate backend |
| Unhandled promise rejections in critical paths | P1 | Fix in next release |
| Render crashes (TypeError in component) | P2 | Fix in next release |

## What NOT to Monitor

- Console.log statements (debug only)
- Network latency (use UptimeRobot or similar)
- User behavior/analytics (use a separate analytics service)

## Offline Behavior

When offline, Sentry queues errors locally and submits when connectivity is restored. No data is lost.

## Privacy

Sentry error reports may include:
- Device model and OS version
- App version and build number
- Stack trace (code context)
- User ID if `setUser()` is called

Do NOT call `Sentry.setUser()` with identifiable information unless you have appropriate consent.
