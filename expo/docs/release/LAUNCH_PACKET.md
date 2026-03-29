# Launch Packet — Momir-Basic

## Status: NOT YET PUBLISH-READY

This launch packet is COMPLETE but the following blockers remain before publishing:

### Hard Blockers (must resolve before store submission)
1. **[DECISION NEEDED]**: Link EAS project — run `eas project:associate`
2. **[DECISION NEEDED]**: Configure iOS credentials — run `eas credentials --platform ios`
3. **[DECISION NEEDED]**: Configure Android credentials — run `eas credentials --platform android`
4. **[DECISION NEEDED]**: Add EXPO_TOKEN to GitHub Secrets
5. **[DECISION NEEDED]**: Legal entity name, support email, privacy policy URL, support URL
6. **[HARDWARE REQUIRED]**: Physical device Bluetooth printer validation (iOS + Android)

### Soft Requirements (improve but don't block)
- Screenshots for App Store / Play Store
- App Store promotional assets
- Supported printer list documentation

## Release Evidence Summary

### Completed Artifacts
| Artifact | Status | Location |
|----------|--------|----------|
| Release Policy | ✅ Complete | `expo/docs/release/RELEASE_POLICY.md` |
| Privacy Policy | ✅ Complete | `expo/docs/release/PRIVACY_POLICY.md` |
| Terms of Service | ✅ Complete | `expo/docs/release/TERMS.md` |
| Legal Inputs | ✅ Complete | `expo/docs/release/LEGAL_INPUTS.md` |
| Store Compliance | ✅ Complete | `expo/docs/release/STORE_COMPLIANCE.md` |
| Store Metadata | ✅ Complete | `expo/docs/release/STORE_METADATA.md` |
| Store Assets Manifest | ✅ Complete | `expo/docs/release/STORE_ASSETS_MANIFEST.md` |
| Build Rehearsal Docs | ✅ Complete | `expo/docs/release/BUILD_REHEARSAL.md` |
| CI/CD Workflows | ✅ Complete | `.github/workflows/ci.yml`, `release-build.yml` |
| Observability Docs | ✅ Complete | `expo/docs/release/OBSERVABILITY.md` |
| Environment Separation | ✅ Complete | `expo/docs/release/ENVIRONMENT.md` |
| OTA Rollback Docs | ✅ Complete | `expo/docs/release/ROLLBACK.md` |
| Credentials Runbook | ✅ Complete | `expo/docs/release/RELEASE_CREDENTIALS.md` |
| Hardware Validation Docs | ⚠️ Blocked | `expo/docs/release/HARDWARE_VALIDATION.md` |

### Verification Results
- TypeScript: PASS (`bunx tsc --noEmit`)
- Lint: PASS (`bun run lint` — 0 errors)
- Unit Tests: PASS (`bun run test -- --runInBand`)
- E2E Tests: PASS (9/9 passed, 1 skipped)
- CI Workflow: Valid YAML
- Release Build Workflow: Valid YAML

## Pre-Submission Checklist

### Account Setup
- [ ] Apple Developer Account active
- [ ] Google Play Developer Account active
- [ ] EAS project linked (`eas project:associate`)
- [ ] iOS credentials configured
- [ ] Android credentials configured
- [ ] EXPO_TOKEN in GitHub Secrets

### Legal/Compliance
- [ ] Legal entity name determined
- [ ] Support email configured
- [ ] Privacy policy URL hosted and accessible
- [ ] Support URL hosted
- [ ] Terms of Service hosted
- [ ] Export compliance confirmed

### Technical
- [ ] Production builds succeed for iOS
- [ ] Production builds succeed for Android
- [ ] Hardware validation complete (iOS + printer)
- [ ] Hardware validation complete (Android + printer)
- [ ] Screenshots captured for both stores
- [ ] Promotional assets prepared

### Store Submission
- [ ] App Store listing submitted
- [ ] Play Store listing submitted
- [ ] Privacy policy URL submitted
- [ ] Content ratings questionnaire completed
- [ ] Bluetooth usage disclosed in review notes

## DECISION NEEDED Values

Before publishing, fill in these values in the appropriate docs:

| Value | Document |
|-------|----------|
| Legal entity name | `LEGAL_INPUTS.md` |
| Support email | `LEGAL_INPUTS.md`, `STORE_METADATA.md` |
| Support URL | `STORE_METADATA.md` |
| Privacy policy URL | `STORE_METADATA.md`, `LEGAL_INPUTS.md` |
| Apple Team ID | `RELEASE_CREDENTIALS.md` |
| Google Play account | `RELEASE_CREDENTIALS.md` |
| Printer model used for validation | `HARDWARE_VALIDATION.md` |
