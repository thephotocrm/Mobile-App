import { useState, useCallback } from "react";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

export interface AppleAuthCredential {
  identityToken: string;
  firstName?: string;
  lastName?: string;
}

export function useAppleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  // Check if Apple Sign In is available (iOS 13+ only)
  useState(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setIsAvailable);
    }
  });

  const signIn = useCallback(async (): Promise<AppleAuthCredential> => {
    if (Platform.OS !== "ios") {
      throw new Error("Apple Sign In is only available on iOS");
    }

    setIsLoading(true);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }

      // Apple only provides name on first sign-in, extract if available
      const firstName = credential.fullName?.givenName ?? undefined;
      const lastName = credential.fullName?.familyName ?? undefined;

      return {
        identityToken: credential.identityToken,
        firstName,
        lastName,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    signIn,
    isLoading,
    isAvailable: Platform.OS === "ios" && isAvailable,
  };
}
