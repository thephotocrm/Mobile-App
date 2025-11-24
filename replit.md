# Overview

thePhotoCrm is a React Native mobile application built with Expo for iOS, Android, and web platforms. The app serves as a photographer-focused CRM for managing wedding photography businesses on-the-go. Key features include project management, client messaging, booking calendar, and business tools.

The application uses a tab-based navigation system with stack navigators for each major feature area (Projects, Inbox, Bookings, Tools, etc.). The UI implements a theme system supporting both light and dark modes with a branded color scheme centered around #8B4565 (primary purple/burgundy).

# User Preferences

Preferred communication style: Simple, everyday language.

Design preference: 10px horizontal edge-to-edge padding for maximum content width on mobile screens.

# System Architecture

## Frontend Architecture

**Framework & Platform:**
- React Native 0.81.5 with React 19.1.0
- Expo SDK 54 for cross-platform development (iOS, Android, Web)
- TypeScript for type safety
- Expo Router's new architecture enabled for improved performance

**Navigation Pattern:**
- Bottom tab navigation with 5 main tabs (Home, Projects, Inbox, Notifications, Tools)
- Nested stack navigators within each tab for hierarchical screen flows
- Transparent/blurred headers on iOS using native blur effects
- Custom header components with app branding

**State Management:**
- Currently using local component state with React hooks
- No global state management library implemented yet (Redux, Zustand, etc. may be added later)

**UI/UX Design:**
- Custom theme system with light/dark mode support
- Reusable component library (Avatar, Badge, Button, Card, etc.)
- Platform-specific blur effects (expo-blur for iOS, solid backgrounds for Android)
- Safe area and keyboard handling for better mobile UX
- Gesture support via react-native-gesture-handler
- Smooth animations using react-native-reanimated

**Component Architecture:**
- Screen components handle routing and data fetching
- Reusable UI components in `/components` directory
- Themed components (ThemedText, ThemedView) for consistent styling
- Custom hooks for common functionality (useTheme, useScreenInsets)

## Authentication & Security

**Planned Authentication Flow:**
- Email/password authentication
- Google OAuth SSO integration (using expo-web-browser)
- Biometric authentication (Face ID/Touch ID) for quick re-login
- Secure token storage (will use SecureStore when implemented)
- Auto-login with saved tokens

**Current State:**
- Mock LoginScreen component exists but auth is not yet implemented
- No backend API integration present in codebase

## Styling & Theming

**Design System:**
- Centralized theme constants in `/constants/theme.ts`
- Color palette with primary (#8B4565), success, error, warning, info colors
- Spacing scale (xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px)
- Typography system with predefined text styles (h1-h4, body, bodySmall)
- Border radius constants (sm: 4px, md: 8px, lg: 12px, xl: 16px)

**Responsive Design:**
- Safe area insets handling for notched devices
- Bottom tab bar height considerations in scrollable content
- Keyboard-aware scroll views for form inputs

## Data Architecture

**Offline-First SQLite Database:**
- Implemented local SQLite database using expo-sqlite for iOS/Android
- Web platform (Platform.OS === 'web') uses mock data for preview
- Database initialized on app startup with WAL mode and foreign key constraints
- Automatic database seeding with sample data for development/testing

**Database Schema:**
- **users** table: id, email, name, created_at, updated_at
- **clients** table: id, user_id, name, email, phone, created_at, updated_at
- **projects** table: id, user_id, client_id, title, description, event_date, stage (lead/booked/active/completed), created_at, updated_at
- **conversations** table: id, user_id, client_id, last_message_at, unread_count, created_at, updated_at
- **messages** table: id, conversation_id, sender_type (client/photographer), text, created_at
- **bookings** table: id, user_id, client_id, event_title, event_date, start_time, end_time, location, notes, created_at, updated_at
- **notifications** table: id, user_id, type, title, message, read, created_at

**Repository Pattern:**
- Clean data access abstraction with repository classes
- ProjectRepository: getAll(), getAllByStage(), search(), getById()
- ClientRepository: getAll(), getById(), create()
- ConversationRepository: getAllWithLastMessage(), searchWithLastMessage(), getById()
  - Optimized with SQL JOIN to fetch last message in single query (eliminates N+1 queries)
- MessageRepository: getByConversation(), create()
- BookingRepository: getAll(), search(), getById()

**Data Fetching Pattern:**
- All list screens use useFocusEffect for automatic refetch when screen gains focus
- Dependencies (searchQuery, selectedStage) included in useFocusEffect callback
- Single fetch per trigger (no duplicate queries)
- Proper loading states during database operations

**Future Backend Integration:**
- Repository pattern designed for future backend sync capability
- Planned SyncService layer to sync local SQLite data with backend API
- REST API endpoints will complement local storage for cloud backup/sync
- Authentication will enable multi-device data synchronization

# External Dependencies

## Core Framework Dependencies

**Expo & React Native:**
- `expo` (v54.0.23) - Expo SDK platform
- `react-native` (v0.81.5) - Cross-platform mobile framework
- `react` (v19.1.0) - React library
- `react-dom` (v19.1.0) - For web platform support
- `react-native-web` (v0.21.0) - Web platform implementation

## Navigation & Routing

- `@react-navigation/native` (v7.1.8) - Core navigation library
- `@react-navigation/native-stack` (v7.3.16) - Stack navigator
- `@react-navigation/bottom-tabs` (v7.4.0) - Tab navigator
- `@react-navigation/elements` (v2.6.3) - Navigation UI components
- `react-native-screens` (v4.16.0) - Native screen optimization
- `react-native-safe-area-context` (v5.6.0) - Safe area handling

## UI & Interaction

- `react-native-gesture-handler` (v2.28.0) - Touch gesture system
- `react-native-reanimated` (v4.1.1) - Animation library
- `react-native-keyboard-controller` (v1.18.5) - Keyboard management
- `@expo/vector-icons` (v15.0.2) - Icon library (includes Feather icons)
- `expo-blur` (v15.0.7) - iOS blur effects
- `expo-glass-effect` (v0.1.6) - Glass morphism effects
- `expo-haptics` (v15.0.7) - Haptic feedback
- `expo-image` (v3.0.10) - Optimized image component

## Expo Modules

- `expo-constants` (v18.0.9) - App constants and config
- `expo-font` (v14.0.9) - Custom font loading
- `expo-linking` (v8.0.8) - Deep linking
- `expo-splash-screen` (v31.0.10) - Splash screen management
- `expo-status-bar` (v3.0.8) - Status bar control
- `expo-symbols` (v1.0.7) - SF Symbols (iOS)
- `expo-system-ui` (v6.0.8) - System UI control
- `expo-web-browser` (v15.0.9) - In-app browser (for OAuth)
- `expo-sqlite` (v15.0.9) - Local SQLite database for offline storage

## Development Tools

- `typescript` (v5.9.2) - Type checking
- `eslint` (v9.25.0) + `eslint-config-expo` - Code linting
- `prettier` (v3.6.2) - Code formatting
- `babel-plugin-module-resolver` (v5.0.2) - Path aliasing (@/ imports)

## Future Backend Integration

**Expected API Backend:**
- REST API referenced in attached documentation (MOBILE_API_DOCUMENTATION_1763586587047.md)
- Endpoints for projects, messages, bookings, notifications
- Authentication endpoints for email/password and OAuth
- No database or API client currently implemented in codebase

**Potential Additions:**
- HTTP client (fetch or axios)
- State management (Redux Toolkit, Zustand, or React Query)
- Local storage (AsyncStorage or SecureStore for tokens)
- Real-time messaging (WebSockets or Firebase)