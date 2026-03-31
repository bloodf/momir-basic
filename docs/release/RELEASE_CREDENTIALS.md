# Release Credentials — Momir-Basic

## iOS Credentials

### Apple Developer Program
- **Team ID**: [DECISION NEEDED: Your Apple Developer Team ID]
- **Account Owner**: [DECISION NEEDED: Who owns the Apple Developer account?]
- **Recovery**: [How to recover if the owner is unavailable]

### EAS iOS Credentials
Managed via EAS. Run:
```bash
cd expo && eas credentials --platform ios --non-interactive
```
This will show existing credentials or guide through creation.

### App Store Connect
- **App Name**: Momir-Basic
- **Bundle ID**: app.rork.khur2ml36fu56vvhu6tre
- **Account**: [DECISION NEEDED: Apple account email used for App Store Connect]

## Android Credentials

### Google Play Publisher
- **Publisher Account**: [DECISION NEEDED: Who owns the Google Play Publisher account?]
- **Package Name**: app.rork.khur2ml36fu56vvhu6tre
- **Recovery**: [How to recover if the owner is unavailable]

### EAS Android Credentials
Managed via EAS. Run:
```bash
cd expo && eas credentials --platform android --non-interactive
```

### Release Signing Key
- **Keystore**: EAS-managed by default. For manual management:
  - Location: [DECISION NEEDED: Where is the release keystore stored?]
  - Password: [DECISION NEEDED: Keystore password, store separately]
  - Alias: [DECISION NEEDED: Key alias]
  - Rotation policy: [When to rotate: compromised, lost machine, team member departure]

## EAS Build Credentials
- **EAS Project ID**: `khur2ml36fu56vvhu6tre` (from app.json slug)
- **Link command**: `cd expo && eas project:associate`
- **EXPO_TOKEN**: GitHub secret for CI — must be created in GitHub Settings → Secrets

## Credential Ownership Matrix

| Credential | Owner | Backup Owner | Storage |
|-----------|-------|-------------|---------|
| Apple Developer Account | [DECISION] | [DECISION] | 1Password |
| Google Play Account | [DECISION] | [DECISION] | 1Password |
| EAS Project | [DECISION] | [DECISION] | Expo servers |
| iOS Distribution Cert | EAS | [DECISION] | Apple Developer portal |
| Android Keystore | EAS | [DECISION] | Expo servers |
| GitHub EXPO_TOKEN | [DECISION] | [DECISION] | GitHub Secrets |
| Release Keystore (manual) | [DECISION] | [DECISION] | Secure vault |

## Setup Checklist

- [ ] Create Apple Developer account (if not existing)
- [ ] Create Google Play Publisher account (if not existing)
- [ ] Run `eas credentials --platform ios` to set up iOS credentials
- [ ] Run `eas credentials --platform android` to set up Android credentials
- [ ] Add `EXPO_TOKEN` to GitHub Secrets
- [ ] Verify credentials are valid: `cd expo && eas credentials --platform ios --non-interactive`
- [ ] Verify credentials are valid: `cd expo && eas credentials --platform android --non-interactive`
