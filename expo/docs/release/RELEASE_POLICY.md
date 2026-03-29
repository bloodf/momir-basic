# Release Policy

This document outlines the versioning and OTA (Over-The-Air) update policy for the Momir-Basic Expo application.

## Versioning Policy

The app uses a dual versioning system managed by EAS:

| Field | Manager | Purpose | When to Increment |
|-------|---------|---------|-------------------|
| `version` (app.json) | Human | User-facing semantic version | Feature milestones only |
| `ios.buildNumber` | EAS Build | iOS build identifier | Every production build |
| `android.versionCode` | EAS Build | Android build identifier | Every production build |

### Remote Version Control

EAS controls build versioning via `cli.appVersionSource: "remote"` in `app.json`. This means:

- `version` in `app.json` remains at `1.0.0` until a major user-facing release
- EAS auto-increments `ios.buildNumber` and `android.versionCode` per platform build
- Never manually edit `ios.buildNumber` or `android.versionCode`

## OTA vs Native Build Rules

### EAS Update (OTA) — Safe For

- JavaScript code changes
- UI/theme modifications
- New screen routes
- Business logic changes
- API endpoint changes
- `app.json` changes outside `ios`/`android` blocks

### Full Native Rebuild Required

Trigger a new EAS Build (not just EAS Update) when:

- `app.json` `ios` block changes
- `app.json` `android` block changes
- Native module additions/removal
- Permission changes
- Bluetooth configuration changes
- `ios.buildNumber` or `android.versionCode` modifications
- Custom dev client builds

**Rule: Never OTA a production native binary change.**

## Branch/Channel Mapping

| Git Branch | EAS Update Channel | Purpose |
|------------|-------------------|---------|
| `main` | `preview` | Internal dogfooding, CI builds |
| `release/*` or tag | `production` | Public rollout, requires manual promotion |

### Channel Promotion

```bash
# Rollback on a channel
eas update --branch <channel> --roll-back

# Deploy to production (manual promotion required)
eas update --branch production --message "Release v1.x.0"
```

## Runtime Policy

### Runtime Version Format

`YYMM.RR` (e.g., `2503.01` = March 2025, release 01)

- **YYMM**: Year and month of the native build
- **RR**: Release counter within that month (01, 02, ...)

### When to Increment Runtime

The runtime version **must increment** when:

- Native configuration changes
- Permission changes
- `app.json` `ios` or `android` fields change
- A new native module is added
- Any change requiring a new native binary

### How to Set Runtime

Runtime is set in `eas.json` under each profile's `runtimeVersion` property, or configured in `app.json` under `expo.runtimeVersion`.

## Quick Reference

```bash
# Build for internal testing (preview channel)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Build for store submission (production channel)
eas build --profile production --platform ios
eas build --profile production --platform android

# Deploy OTA update to preview channel
eas update --branch preview --message "Describe changes"

# Deploy OTA update to production channel
eas update --branch production --message "Describe changes"
```
