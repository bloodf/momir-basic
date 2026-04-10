# Rollback Operations — Momir-Basic

## When to Rollback

Rollback an EAS Update when:
- A deployed update causes crashes or broken functionality
- A critical bug is discovered that cannot be fixed quickly
- User feedback indicates severe issues

## Rollback Procedure

### Step 1: Identify the Problem
1. Check Sentry/crash monitoring for error patterns
2. Determine if the issue started after a specific EAS Update

### Step 2: Rollback to Previous Update

EAS Update supports automatic rollback. Use:
```bash
# Rollback the production channel to the previously deployed update
eas update --branch production --roll-back --message "Rolling back due to [reason]"
```

For manual rollback to a specific update:
```bash
# List recent updates
eas update:list --branch production

# Rollback to a specific update ID
eas update --branch production --update-id <update-id> --message "Rolling back to [update-id]"
```

### Step 3: Verify Rollback
1. Check that the app receives the previous update
2. Verify crash rates are returning to normal
3. Monitor for continued issues

### Step 4: Investigate and Fix
1. Create a fix for the issue
2. Test on preview channel first
3. Deploy fix to production when resolved

## Native Build Rollback

If the issue requires a native build (not just OTA):
1. Do NOT attempt to rollback a native build via EAS Update
2. Submit a new build with the fix
3. Use `eas submit` to push to the store
4. Note: App Store/Play Store review times apply

## Rollback Decision Tree

```
Issue detected after EAS Update?
├── YES → Is it a JS-only change issue?
│   ├── YES → Run `eas update --branch <channel> --roll-back`
│   └── NO → Does it require native changes?
│       ├── YES → Need new native build + store submission
│       └── NO → Rollback + fix + redeploy
└── NO → Native build issue → Need new native build
```

## Testing the Rollback Path

Before launch, test the rollback path:
```bash
# 1. Deploy a test update
eas update --branch preview --message "Testing rollback"

# 2. Verify it deployed
# (check via app or `eas update:list --branch preview`)

# 3. Rollback immediately
eas update --branch preview --roll-back --message "Rollback test"

# 4. Verify rollback succeeded
```

## Rollback Ownership

| Action | Owner | Required Access |
|--------|-------|---------------|
| EAS Update rollback | Developer on-call | EAS account |
| Store rollback | App Store admin | App Store Connect + Google Play |
| Native build rollback | Developer on-call | GitHub + EAS |
