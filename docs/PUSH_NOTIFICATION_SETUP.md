# Push Notification Setup for iOS (TestFlight/Production)

## Problem
Push notifications don't appear on lock screen in TestFlight builds.

## Root Cause
APNS (Apple Push Notification Service) credentials are not configured in EAS Build.

---

## Step 1: Generate APNS Key in Apple Developer Portal

1. Go to [Apple Developer](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Go to **Keys** in the left sidebar
4. Click the **+** button to create a new key
5. Give it a name (e.g., "thePhotoCRM Push Key")
6. Check **Apple Push Notifications service (APNs)**
7. Click **Continue**, then **Register**
8. **Download the `.p8` file** (you can only download it once!)
9. Note down:
   - **Key ID** (shown on the key details page)
   - **Team ID** (found in top right of developer portal or in Membership section)

---

## Step 2: Add APNS Key to EAS

### Option A: Interactive (Recommended)
```bash
eas credentials
```
Then select:
1. iOS
2. production
3. Push Notifications: Manage your Apple Push Notifications Key
4. Upload your `.p8` key file
5. Enter your Key ID and Team ID when prompted

### Option B: Using EAS Secrets
```bash
eas secret:create --scope project --name EXPO_PUSH_APNS_KEY_P8 --type file --value ./AuthKey_XXXXX.p8
eas secret:create --scope project --name EXPO_PUSH_APNS_KEY_ID --value "YOUR_KEY_ID"
eas secret:create --scope project --name EXPO_PUSH_APNS_TEAM_ID --value "YOUR_TEAM_ID"
```

---

## Step 3: Verify Backend Configuration

Your backend push notification service must:

1. **Use production APNS environment** for TestFlight/App Store builds
   - Sandbox = development builds only
   - Production = TestFlight and App Store

2. **Send via Expo Push API** (if using Expo's push service):
   ```
   POST https://exp.host/--/api/v2/push/send
   ```

3. **Or send directly to APNS** with the same credentials

---

## Step 4: Rebuild and Test

1. Create a new build:
   ```bash
   eas build --platform ios --profile production
   ```

2. Submit to TestFlight:
   ```bash
   eas submit --platform ios
   ```

3. Install on device from TestFlight

4. Grant notification permissions when prompted

5. Trigger a test notification from your backend

6. Lock phone and verify notification appears on lock screen

---

## Current App Configuration (Already Correct)

These files are already properly configured:

- **app.json**: `UIBackgroundModes: ["remote-notification"]` ✓
- **expo-notifications plugin**: Configured with icon and color ✓
- **NotificationContext.tsx**: Token registration working ✓
- **notifications.ts**: Permission handling correct ✓

---

## Troubleshooting

### Notifications work in foreground but not on lock screen
- APNS credentials not configured (most likely)
- Using sandbox instead of production APNS

### No notifications at all
- Check if push token is being registered to backend
- Verify backend is actually sending notifications
- Check notification permissions in iOS Settings

### Token registration failing
- Check network connectivity
- Verify user is authenticated before registering token

---

## Useful Commands

```bash
# Check current credentials
eas credentials

# View EAS secrets
eas secret:list

# Check Expo account
npx expo whoami

# View build logs
eas build:list
```

---

## References

- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [EAS Credentials Documentation](https://docs.expo.dev/app-signing/app-credentials/)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
