# Build Rehearsal — Momir-Basic

## Build Profiles

### Preview Profile (internal testing)
- `eas build --profile preview --platform ios`
- `eas build --profile preview --platform android`
- Output: APK for Android, ad-hoc/enterprise for iOS
- Channel: `preview`

### Production Profile (store submission)
- `eas build --profile production --platform ios`
- `eas build --profile production --platform android`
- Output: App Store / Play Store ready
- Channel: `production`

## Pre-Requisites Before Production Builds

The following must be completed before running production builds:

- [ ] `eas project:associate` run to link EAS project (replaces TODO in app.json)
- [ ] `eas credentials --platform ios` configured
- [ ] `eas credentials --platform android` configured
- [ ] `EXPO_TOKEN` added to GitHub Secrets

## Dry-Run Validation

### Step 1: Validate eas.json
```bash
cd expo
cat eas.json | jq .
```
Expected: Valid JSON with preview and production profiles.

### Step 2: Validate app.json
```bash
npx expo config --json > /tmp/expo-config.json
cat /tmp/expo-config.json | jq .
```
Expected: Valid JSON with all required fields.

### Step 3: Local TypeScript Validation
```bash
bun run lint
bunx tsc --noEmit
```
Expected: 0 errors.

### Step 4: EAS CLI Validation (without credentials)
```bash
eas config --platform ios
eas config --platform android
```
Expected: Shows configuration (will warn about unlinked project).

## Production Build Commands

Once credentials are configured:

### iOS Production Build
```bash
cd expo
eas build --platform ios --profile production --non-interactive
```
Expected output: Build ID and status URL

### Android Production Build
```bash
cd expo
eas build --platform android --profile production --non-interactive
```
Expected output: Build ID and status URL

## Build Artifact Retention

| Platform | Artifact | Retention |
|----------|----------|-----------|
| iOS | .ipa | EAS Build records + TestFlight |
| Android | .aab | EAS Build records + Google Play |

## Known Limitations

- **No EAS project linked yet**: The `eas project:associate` step must be run by the project owner
- **No credentials configured**: Actual builds require Apple/Google developer accounts
- **Build times**: iOS builds typically take 10-20 minutes; Android 5-10 minutes
