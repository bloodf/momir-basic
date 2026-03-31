# Release Runbook — Momir-Basic

## Pre-Release Checklist (Complete Before Any Store Submission)

### Week Before Release
- [ ] Run full test suite: `cd expo && bun run test -- --runInBand`
- [ ] Run E2E tests: `cd expo && bunx playwright test e2e/printer-qa.spec.ts`
- [ ] Run typecheck: `cd expo && bunx tsc --noEmit`
- [ ] Run lint: `cd expo && bun run lint`
- [ ] Fill in all DECISION NEEDED values in release docs
- [ ] Confirm privacy policy is hosted and accessible
- [ ] Capture store screenshots

### Day of Release
- [ ] Run CI on release branch: `gh workflow run ci.yml --ref release/v1`
- [ ] Confirm CI passes
- [ ] Verify EAS credentials are valid
- [ ] Run staging OTA drill: `eas update --branch preview --message "pre-release smoke"`
- [ ] Verify staging update deployed

## Release Steps

### Step 1: Create Release Branch
```bash
git checkout main
git pull
git checkout -b release/v1.0.0
git push -u origin release/v1.0.0
```

### Step 2: Production Build iOS
```bash
cd expo
eas build --platform ios --profile production --non-interactive
```
Save the build ID from output.

### Step 3: Production Build Android
```bash
cd expo
eas build --platform android --profile production --non-interactive
```
Save the build ID from output.

### Step 4: Internal Testing (2-3 days)
- Deploy to TestFlight (automatic with EAS)
- Deploy to internal testing track on Google Play
- Run hardware validation
- Fix any issues found

### Step 5: Store Submission

#### App Store
```bash
cd expo
eas submit --platform ios --latest
```

#### Google Play
```bash
cd expo
eas submit --platform android --latest
```

### Step 6: Post-Release
- Monitor crash rates in Sentry
- Monitor store review status
- Respond to any reviewer questions within 24 hours
- Deploy OTA updates as needed for bug fixes

## Rollback Procedure

If a critical issue is found post-release:

### OTA Rollback (JS-only issues)
```bash
eas update --branch production --roll-back --message "Rolling back due to [reason]"
```

### Store Rejection / Major Issue
1. Fix the issue in code
2. Submit new build: `eas build --profile production --platform [ios|android]`
3. Re-submit: `eas submit --platform [ios|android] --latest`

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| iOS Developer | [DECISION NEEDED] | [DECISION NEEDED] |
| Android Developer | [DECISION NEEDED] | [DECISION NEEDED] |
| Backend/API Owner | N/A | Scryfall handles their API |

## Known Limitations at Launch

- Thermal printing requires physical Bluetooth printer — this is by design
- App Store/Play Store screenshots require manual capture
- EAS credentials must be set up by account owner before first build
