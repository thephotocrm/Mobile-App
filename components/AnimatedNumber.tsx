import React, { useEffect } from "react";
import { TextStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useDerivedValue,
  runOnJS,
} from "react-native-reanimated";
import { ThemedText } from "./ThemedText";

// Create animated text component
const AnimatedThemedText = Animated.createAnimatedComponent(ThemedText);

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  formatOptions?: Intl.NumberFormatOptions;
}

export function AnimatedNumber({
  value,
  duration = 1200,
  prefix = "",
  suffix = "",
  style,
  formatOptions = {},
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = React.useState("0");

  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...formatOptions,
  });

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration]);

  // Update display value on UI thread via derived value
  useDerivedValue(() => {
    const formatted = formatter.format(animatedValue.value);
    runOnJS(setDisplayValue)(formatted);
  }, [animatedValue]);

  return (
    <ThemedText style={style}>
      {prefix}
      {displayValue}
      {suffix}
    </ThemedText>
  );
}

// Simplified version for currency that parses string values
interface AnimatedCurrencyProps {
  value: string; // e.g., "$12,676.03"
  duration?: number;
  style?: StyleProp<TextStyle>;
}

export function AnimatedCurrency({
  value,
  duration = 1500,
  style,
}: AnimatedCurrencyProps) {
  // Parse the currency string to get the numeric value
  const numericValue = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = React.useState("$0.00");

  useEffect(() => {
    // Start from 0 and animate to final value
    animatedValue.value = 0;
    animatedValue.value = withTiming(numericValue, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [numericValue, duration]);

  useDerivedValue(() => {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(animatedValue.value);
    runOnJS(setDisplayValue)(formatted);
  }, [animatedValue]);

  return <ThemedText style={style}>{displayValue}</ThemedText>;
}
