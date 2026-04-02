# Store Compliance — Momir-Basic

## App Store (iOS)

### Content Rating
- **Rating**: [DECISION NEEDED: likely "4+" for mild fantasy violence related to card art]
- **In-App Purchases**: None
- **Apple Sign-In**: Not used

### Required Disclosures
- **Bluetooth**: This app uses Bluetooth to connect to thermal POS printers. User-initiated pairing required.
- **Third-party SDKs**: [List any third-party SDKs with links]

## Google Play (Android)

### Content Rating
- [DECISION NEEDED: complete Play Store content questionnaire]

### Data Safety
- **Collects data**: YES — local device data (card history, print queue)
- **Data is encrypted**: NO — data stored locally via AsyncStorage/SQLite without encryption at rest
- **Can be deleted**: YES — user can clear app data
- **Shares data**: NO

### Permissions Justification
- **Bluetooth**: Required for thermal printer connectivity. User-initiated pairing.
- **Location (ACCESS_FINE_LOCATION)**: Required on Android for Bluetooth device scanning (Bluetooth MAC addresses are considered location data on Android 10+). User-initiated pairing.

## Hardware Limitations Disclosure
This app supports thermal receipt printers. Printing requires a compatible ESC/POS Bluetooth printer. The app does not guarantee compatibility with all printer models.

## External Blockers

The following items CANNOT be resolved from code and require external input:

| Item | Blocker Type |
|------|--------------|
| Legal entity name for content rating | External — legal decision |
| Content rating questionnaire completion | External — store submission |
| Support email configuration | External — must be configured |
| Privacy policy URL hosting | External — must be hosted |
| Support URL hosting | External — must be hosted |
| Bluetooth usage disclosure text for review notes | External — legal/marketing |
