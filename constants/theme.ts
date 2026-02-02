import { Platform } from "react-native";

const primaryColor = "#1A1A1A";
const primaryLightColor = "#333333";
const primaryDarkColor = "#0A0A0A";
const accentColor = "#EC4899"; // Pink accent for CTA elements

export const GradientColors = {
  journey: ["#2563EB", "#9333EA", "#DB2777"],
  journeyReverse: ["#DB2777", "#9333EA", "#2563EB"],
  accent: ["#A855F7", "#EC4899", "#F97316"],
  accentSubtle: [
    "rgba(168,85,247,0.1)",
    "rgba(236,72,153,0.1)",
    "rgba(249,115,22,0.1)",
  ],
  primary: ["#2563EB", "#9333EA", "#DB2777"],
  // EasyPay-inspired gradients
  promoBanner: ["#FFE4EC", "#FFCCE0"],
  promoBannerDark: ["#3D2535", "#2D1D28"],
  darkAction: ["#1A1A1A", "#1A1A1A"],
  lightAction: ["#F5F5F5", "#EBEBEB"],
  // Avatar gradients
  avatarPink: ["#EC4899", "#DB2777"],
  avatarBlue: ["#3B82F6", "#2563EB"],
  avatarPurple: ["#8B5CF6", "#7C3AED"],
  avatarGreen: ["#10B981", "#059669"],
  avatarOrange: ["#F97316", "#EA580C"],
  avatarTeal: ["#14B8A6", "#0D9488"],
  // Blys-inspired gradients for Projects
  specialOffer: ["#FF4081", "#EC407A"],
  specialOfferDark: ["#C2185B", "#AD1457"],
  // Messaging gradients (from reference design)
  messageSent: ["#6366F1", "#8B5CF6"],
  messageSentDark: ["#4F46E5", "#7C3AED"],
};

// Messaging/Inbox colors (from reference design)
export const MessagingColors = {
  // Primary messaging accent (indigo/purple)
  primary: "#6366F1",
  primaryDark: "#4F46E5",
  // Unread badge
  unreadBadge: "#6366F1",
  unreadBadgeDark: "#818CF8",
  // Message bubbles
  sentBubble: "#6366F1",
  sentBubbleEnd: "#8B5CF6",
  receivedBubble: "#F3F4F6",
  receivedBubbleDark: "#374151",
  // Online status
  online: "#22C55E",
  onlineText: "#16A34A",
  // Timestamp
  timestamp: "#9CA3AF",
  // Search bar
  searchBg: "#F3F4F6",
  searchBgDark: "#1F2937",
  // New message button
  newMessageBg: "#6366F1",
};

// Calendar screen colors (from reference design)
export const CalendarColors = {
  // Primary accent (pink/magenta)
  primary: "#C92667",
  primaryLight: "#E84C89",
  primaryDark: "#A01F54",
  // Card backgrounds
  eventCardBg: "#FFE5ED",
  eventCardBgDark: "#3D2535",
  reminderCardBg: "#EDE9FE",
  reminderCardBgDark: "#2D2640",
  // Category colors
  categoryMeeting: "#FCD34D",
  categoryHangout: "#2DD4BF",
  categoryOuting: "#F472B6",
  categoryShooting: "#7C3AED",
  categoryConsultation: "#3B82F6",
  categoryOther: "#9CA3AF",
  // Teal accent
  teal: "#2DD4BF",
  tealLight: "#4DD0C9",
};

// Stat card colors for dashboard
export const StatColors = {
  inquiries: "#FF6B6B", // Red-ish for urgency
  projects: "#4ECDC4", // Teal
  events: "#45B7D1", // Blue
  payments: "#96CEB4", // Green for money
  awaiting: "#F59E0B", // Amber for waiting
};

// Blys-inspired colors for Projects screen
export const BlysColors = {
  // Primary purple brand color
  primary: "#7C3AED",
  primaryLight: "#A78BFA",
  primaryDark: "#5B21B6",
  // Tab colors
  tabActive: "#7C3AED",
  tabInactive: "#9CA3AF",
  tabUnderline: "#7C3AED",
  // Date badge colors by status
  dateBadgePending: "#F5F3FF", // Light purple
  dateBadgeConfirmed: "#ECFDF5", // Light green
  dateBadgeCompleted: "#F0F9FF", // Light blue
  // Status badge colors
  statusPending: "#F59E0B",
  statusPendingBg: "#FEF3C7",
  statusConfirmed: "#22C55E",
  statusConfirmedBg: "#DCFCE7",
  statusCompleted: "#3B82F6",
  statusCompletedBg: "#DBEAFE",
  // Special offer banner
  offerPink: "#FF4081",
  offerBackground: "#FFF0F5",
};

// EasyPay-inspired service icon colors
export const ServiceColors = {
  internet: "#4F46E5", // Indigo
  water: "#0891B2", // Cyan
  electricity: "#EF4444", // Red
  tvCable: "#EC4899", // Pink
  vehicle: "#F97316", // Orange
  rentBill: "#8B5CF6", // Purple
  invest: "#10B981", // Emerald
  more: "#6B7280", // Gray
};

export const Colors = {
  light: {
    primary: "#FFFFFF",
    primaryLight: "#E5E5E5",
    primaryDark: primaryDarkColor,
    accent: accentColor,
    text: "#F9FAFB",
    textSecondary: "#9CA3AF",
    textTertiary: "#6B7280",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B7280",
    tabIconSelected: "#FFFFFF",
    link: "#FFFFFF",
    success: "#22C55E",
    error: "#EF4444",
    warning: "#F59E0B",
    warningDark: "#D97706",
    info: "#3B82F6",
    backgroundRoot: "#2A2A2A",
    backgroundDefault: "#2A2A2A",
    backgroundSecondary: "#363636",
    backgroundTertiary: "#424242",
    backgroundCard: "#363636",
    border: "#3A3A3A",
    borderLight: "#333333",
    // EasyPay-inspired additions
    actionBarBg: "#1F1F1F",
    actionBarText: "#FFFFFF",
    serviceIconBg: "#363636",
    promoBannerBg: "#2D1D28",
    // Transaction/list item backgrounds
    listItemBg: "#363636",
    divider: "#3A3A3A",
  },
  dark: {
    primary: "#FFFFFF",
    primaryLight: "#E5E5E5",
    primaryDark: primaryDarkColor,
    accent: accentColor,
    text: "#F9FAFB",
    textSecondary: "#9CA3AF",
    textTertiary: "#6B7280",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B7280",
    tabIconSelected: "#FFFFFF",
    link: "#FFFFFF",
    success: "#22C55E",
    error: "#EF4444",
    warning: "#F59E0B",
    warningDark: "#D97706",
    info: "#3B82F6",
    backgroundRoot: "#0A0A0A",
    backgroundDefault: "#121212",
    backgroundSecondary: "#1A1A1A",
    backgroundTertiary: "#262626",
    backgroundCard: "#161616",
    border: "#2A2A2A",
    borderLight: "#222222",
    // EasyPay-inspired additions (dark mode variants)
    actionBarBg: "#1F1F1F",
    actionBarText: "#FFFFFF",
    serviceIconBg: "#1F1F1F",
    promoBannerBg: "#2D1D28",
    // Transaction/list item backgrounds
    listItemBg: "#161616",
    divider: "#1F1F1F",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  inputHeight: 48,
  buttonHeight: 52,
  // Screen-level padding
  screenHorizontal: 20,
  screenVertical: 16,
};

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
  // Specific component radii
  card: 16,
  actionBar: 28,
  promoBanner: 20,
  serviceIcon: 16,
  avatar: 9999,
  input: 12,
  chip: 20,
  button: 14,
};

export const Typography = {
  // Large display text
  display: {
    fontSize: 34,
    fontWeight: "700" as const,
    lineHeight: 41,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 28,
    fontWeight: "700" as const,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 22,
    fontWeight: "700" as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 16,
    fontWeight: "600" as const,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: "500" as const,
    lineHeight: 22,
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  button: {
    fontSize: 16,
    fontWeight: "600" as const,
    lineHeight: 22,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: "500" as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: "500" as const,
    lineHeight: 18,
    letterSpacing: 0,
  },
  // Balance/currency display
  currency: {
    fontSize: 26,
    fontWeight: "700" as const,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  // Small labels like service names
  tiny: {
    fontSize: 11,
    fontWeight: "400" as const,
    lineHeight: 14,
    letterSpacing: 0.1,
  },
};

// Centralized shadow tokens - EasyPay-inspired subtle shadows
export const Shadows = {
  // Very subtle elevation for cards
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  // Action bar shadow (prominent)
  actionBar: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  colored: (color: string, opacity = 0.25) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: opacity,
    shadowRadius: 16,
    elevation: 6,
  }),
  // Dark mode variants
  dark: {
    xs: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 1,
    },
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 5,
    },
    actionBar: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
