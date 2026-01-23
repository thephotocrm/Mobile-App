// Dynamic config that extends app.json and adds environment-specific values
module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      // Google OAuth Client IDs
      // Web client ID (used for Expo Go and web)
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      // iOS-specific client ID
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      // Android-specific client ID
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      eas: {
        // Use env var if set, otherwise keep the value from app.json
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || config.extra?.eas?.projectId,
      },
    },
  };
};
