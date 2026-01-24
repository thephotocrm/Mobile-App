import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, GradientColors } from "@/constants/theme";

WebBrowser.maybeCompleteAuthSession();

// Google Icon SVG Component
function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

// Get Google Client ID from app config
const googleClientId = Constants.expoConfig?.extra?.googleClientId || "";
const googleIosClientId = Constants.expoConfig?.extra?.googleIosClientId || "";
const googleAndroidClientId = Constants.expoConfig?.extra?.googleAndroidClientId || "";

// Check if Google auth is properly configured
const isGoogleConfigured = !!(googleClientId || googleIosClientId || googleAndroidClientId);

export default function LoginScreen() {
  const { theme } = useTheme();
  const { login, loginWithApple, loginWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  // Google Auth setup
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
  });

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }
  }, []);

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleToken(id_token);
    } else if (response?.type === "error") {
      setError("Google Sign In failed. Please try again.");
      setGoogleLoading(false);
    } else if (response?.type === "dismiss") {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleToken = async (idToken: string) => {
    try {
      await loginWithGoogle({ idToken });
      if (__DEV__) {
        console.log("[LoginScreen] Google Sign In completed successfully!");
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Google Sign In failed. Please try again.";
      if (__DEV__) {
        console.log("[LoginScreen] Google Sign In failed:", message);
      }
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (__DEV__) {
      console.log("[LoginScreen] Google Sign In button pressed");
    }

    setError(null);
    setGoogleLoading(true);

    try {
      await promptAsync();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Google Sign In failed. Please try again.";
      if (__DEV__) {
        console.log("[LoginScreen] Google Sign In error:", message);
      }
      setError(message);
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (__DEV__) {
      console.log("[LoginScreen] Sign In button pressed");
    }

    if (!email.trim()) {
      if (__DEV__) {
        console.log("[LoginScreen] Validation failed: empty email");
      }
      setError("Please enter your email");
      return;
    }
    if (!password) {
      if (__DEV__) {
        console.log("[LoginScreen] Validation failed: empty password");
      }
      setError("Please enter your password");
      return;
    }

    if (__DEV__) {
      console.log("[LoginScreen] Starting login for:", email.trim());
    }
    setError(null);
    setLoading(true);

    try {
      if (__DEV__) {
        console.log("[LoginScreen] Calling login()...");
      }
      await login(email.trim(), password);
      if (__DEV__) {
        console.log("[LoginScreen] Login completed successfully!");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      if (__DEV__) {
        console.log("[LoginScreen] Login failed with error:", message);
      }
      setError(message);
    } finally {
      setLoading(false);
      if (__DEV__) {
        console.log("[LoginScreen] Login process finished");
      }
    }
  };

  const handleForgotPassword = async () => {
    await WebBrowser.openBrowserAsync(
      "https://app.thephotocrm.com/reset-password",
    );
  };

  const handleAppleSignIn = async () => {
    if (__DEV__) {
      console.log("[LoginScreen] Apple Sign In button pressed");
    }

    setError(null);
    setAppleLoading(true);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (__DEV__) {
        console.log("[LoginScreen] Apple credential received");
      }

      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }

      // Apple only provides name on first sign-in
      const firstName = credential.fullName?.givenName ?? undefined;
      const lastName = credential.fullName?.familyName ?? undefined;

      await loginWithApple({
        identityToken: credential.identityToken,
        firstName,
        lastName,
      });

      if (__DEV__) {
        console.log("[LoginScreen] Apple Sign In completed successfully!");
      }
    } catch (err: unknown) {
      // User cancelled - don't show error
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "ERR_REQUEST_CANCELED"
      ) {
        if (__DEV__) {
          console.log("[LoginScreen] Apple Sign In cancelled by user");
        }
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : "Apple Sign In failed. Please try again.";
      if (__DEV__) {
        console.log("[LoginScreen] Apple Sign In failed:", message);
      }
      setError(message);
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerContainer}>
          <ThemedText style={styles.title}>Welcome back</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Sign in to manage your photography business
          </ThemedText>
        </View>

        <View style={styles.formContainer}>
          {error ? (
            <View
              style={[
                styles.errorContainer,
                { backgroundColor: theme.error + "15" },
              ]}
            >
              <Feather name="alert-circle" size={16} color={theme.error} />
              <ThemedText style={[styles.errorText, { color: theme.error }]}>
                {error}
              </ThemedText>
              <Pressable
                onPress={() => setError(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={16} color={theme.error} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Email
            </ThemedText>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: theme.border,
                },
              ]}
            >
              <Feather name="mail" size={20} color={theme.textSecondary} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                style={[styles.textInput, { color: theme.text }]}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Password
            </ThemedText>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: theme.border,
                },
              ]}
            >
              <Feather name="lock" size={20} color={theme.textSecondary} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                style={[styles.textInput, { color: theme.text }]}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleForgotPassword}
            style={styles.forgotPassword}
          >
            <ThemedText
              style={[styles.forgotPasswordText, { color: theme.primary }]}
            >
              Forgot password?
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={GradientColors.journey as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {loading ? (
                <View style={styles.loadingContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <ThemedText style={styles.loginButtonText}>
                    Signing in...
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.loginButtonText}>Sign In</ThemedText>
              )}
            </LinearGradient>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View
              style={[styles.dividerLine, { backgroundColor: theme.border }]}
            />
            <ThemedText
              style={[styles.dividerText, { color: theme.textSecondary }]}
            >
              or continue with
            </ThemedText>
            <View
              style={[styles.dividerLine, { backgroundColor: theme.border }]}
            />
          </View>

          {/* Social Sign In Buttons */}
          <View style={styles.socialButtonsContainer}>
            {/* Google Sign In - only show if configured */}
            {isGoogleConfigured ? (
              <Pressable
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: theme.backgroundCard,
                    borderColor: theme.border,
                  },
                ]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading || !request}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <>
                    <View style={styles.googleIconContainer}>
                      <GoogleIcon />
                    </View>
                    <ThemedText style={styles.socialButtonText}>
                      Continue with Google
                    </ThemedText>
                  </>
                )}
              </Pressable>
            ) : null}

            {/* Apple Sign In - iOS only */}
            {Platform.OS === "ios" && isAppleAvailable ? (
              <View style={styles.appleButtonContainer}>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                  }
                  buttonStyle={
                    theme.isDark
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={BorderRadius.sm}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
                {appleLoading ? (
                  <View style={styles.appleLoadingOverlay}>
                    <ActivityIndicator
                      size="small"
                      color={theme.isDark ? "#000" : "#FFF"}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText
            style={[styles.footerText, { color: theme.textSecondary }]}
          >
            {"Don't have an account? "}
          </ThemedText>
          <Pressable
            onPress={() =>
              WebBrowser.openBrowserAsync("https://app.thephotocrm.com/signup")
            }
          >
            <ThemedText style={[styles.signUpText, { color: theme.primary }]}>
              Sign up
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  formContainer: {
    gap: Spacing.md,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 52,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  forgotPassword: {
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  gradientButton: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: 14,
  },
  signUpText: {
    fontSize: 14,
    fontWeight: "600",
  },
  socialButtonsContainer: {
    gap: Spacing.sm,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  googleIconContainer: {
    width: 20,
    height: 20,
  },
  appleButtonContainer: {
    position: "relative",
  },
  appleButton: {
    width: "100%",
    height: 52,
  },
  appleLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(128, 128, 128, 0.3)",
    borderRadius: BorderRadius.sm,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
});
