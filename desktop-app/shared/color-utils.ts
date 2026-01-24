/**
 * Color utility functions for ensuring accessible text colors on brand-colored backgrounds.
 * Uses WCAG 2.1 relative luminance calculations to determine optimal text color.
 */

/**
 * Converts a hex color string to RGB values
 */
export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace(/^#/, "");

  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  }

  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return { r, g, b };
  }

  return null;
}

/**
 * Converts an sRGB color channel value to linear RGB
 * Per WCAG 2.1 specification
 */
function sRGBtoLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/**
 * Calculates the relative luminance of a color per WCAG 2.1
 * Returns a value between 0 (black) and 1 (white)
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const r = sRGBtoLinear(rgb.r);
  const g = sRGBtoLinear(rgb.g);
  const b = sRGBtoLinear(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates the contrast ratio between two colors per WCAG 2.1
 * Returns a value between 1 (same color) and 21 (black vs white)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determines if a color is considered "light" based on its luminance.
 * Uses WCAG threshold of ~0.179 for determining light vs dark.
 */
export function isLightColor(hex: string): boolean {
  return getRelativeLuminance(hex) > 0.179;
}

export interface AccessibleTextColorOptions {
  lightColor?: string; // Color to use on dark backgrounds (default: '#FFFFFF')
  darkColor?: string; // Color to use on light backgrounds (default: '#000000')
  minRatio?: number; // Minimum contrast ratio to target (default: 4.5 for WCAG AA)
}

/**
 * Returns an accessible text color for a given background color.
 * Uses WCAG contrast ratio calculations to ensure legibility.
 *
 * @param backgroundColor - The background color in hex format (e.g., '#C0C0C0')
 * @param options - Optional configuration for light/dark text colors and minimum ratio
 * @returns The most accessible text color (either lightColor or darkColor)
 *
 * @example
 * // Silver background -> returns black text
 * getAccessibleTextColor('#C0C0C0') // '#000000'
 *
 * // Navy background -> returns white text
 * getAccessibleTextColor('#000080') // '#FFFFFF'
 */
export function getAccessibleTextColor(
  backgroundColor: string,
  options: AccessibleTextColorOptions = {},
): string {
  const {
    lightColor = "#FFFFFF",
    darkColor = "#000000",
    minRatio = 4.5,
  } = options;

  // Handle invalid or missing colors
  if (!backgroundColor || !hexToRgb(backgroundColor)) {
    return darkColor;
  }

  const contrastWithLight = getContrastRatio(backgroundColor, lightColor);
  const contrastWithDark = getContrastRatio(backgroundColor, darkColor);

  // Check if either meets the minimum ratio
  if (contrastWithLight >= minRatio) {
    return contrastWithDark >= minRatio && contrastWithDark > contrastWithLight
      ? darkColor
      : lightColor;
  }

  if (contrastWithDark >= minRatio) {
    return darkColor;
  }

  // Neither meets minimum ratio, return the one with better contrast
  return contrastWithDark > contrastWithLight ? darkColor : lightColor;
}

/**
 * Returns CSS-ready text color value based on background
 * Useful for inline styles and CSS-in-JS
 */
export function getButtonTextColor(brandColor: string): string {
  return getAccessibleTextColor(brandColor);
}

/**
 * Gets both the background and appropriate text color for a branded element
 */
export function getBrandedElementColors(brandColor: string): {
  backgroundColor: string;
  textColor: string;
} {
  return {
    backgroundColor: brandColor,
    textColor: getAccessibleTextColor(brandColor),
  };
}
