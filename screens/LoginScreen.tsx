import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  Alert,
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

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  Spacing,
  Typography,
  BorderRadius,
  GradientColors,
} from "@/constants/theme";

export default function LoginScreen() {
  const { theme } = useTheme();
  const { login, loginWithApple } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }
  }, []);

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
    await WebBrowser.openBrowserAsync("https://app.thephotocrm.com/reset-password");
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
        err instanceof Error ? err.message : "Apple Sign In failed. Please try again.";
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
          {Platform.OS === "ios" && isAppleAvailable ? (
            <View style={styles.appleButtonContainer}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
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
                  <ActivityIndicator size="small" color={theme.isDark ? "#000" : "#FFF"} />
                </View>
              ) : null}

              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <ThemedText style={[styles.dividerText, { color: theme.textSecondary }]}>
                  or
                </ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>
            </View>
          ) : null}

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
        </View>

        <View style={styles.footer}>
          <ThemedText
            style={[styles.footerText, { color: theme.textSecondary }]}
          >
            Don't have an account?{" "}
          </ThemedText>
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync("https://app.thephotocrm.com/signup")}
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
  appleButtonContainer: {
    marginBottom: Spacing.sm,
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
    marginTop: Spacing.lg,
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
