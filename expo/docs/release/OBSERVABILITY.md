# Observability — Momir-Basic

## Overview

Production crash and error monitoring via Sentry. Errors are captured with release version, device context, and stack traces for debugging.

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
