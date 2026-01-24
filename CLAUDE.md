# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

thePhotoCRM is a React Native mobile app (iOS/Android/Web) for photographers to manage their wedding photography business. Built with Expo SDK 54 and TypeScript.

## IMPORTANT: Deprecated Folders

**DO NOT USE the `desktop-app/` folder.** It is deprecated and dead code. Never read, reference, or modify anything in this folder.

The production backend is in a separate repository: https://github.com/thephotocrm/thephotocrm

When checking backend functionality, API routes, or server-side code, you must check the production repo above, NOT the local desktop-app folder.

## Commands

```bash
# Development
npm run dev          # Start Expo with Replit-specific config
npm run start        # Standard Expo start
npm run web          # Run web version
npm run ios          # Run iOS simulator
npm run android      # Run Android emulator

# Code Quality
npm run lint         # ESLint check
npm run check:format # Prettier check
npm run format       # Prettier fix
```

## Architecture

### Provider Hierarchy (App.tsx)
```
ErrorBoundary → ThemeProvider → AuthProvider → SafeAreaProvider → GestureHandlerRootView → KeyboardProvider → NavigationContainer
```

### Navigation Structure
- **RootNavigator**: Auth gate (Login vs MainTabs)
- **MainTabNavigator**: 5 bottom tabs (Home, Projects, Inbox, Notifications, Tools)
- Each tab has its own stack navigator for deep navigation
- Settings presented as modal from RootNavigator

### Data Layer
- **Remote**: REST API client in `services/api.ts` with multi-tenant support (x-photographer-id, x-user-role headers)
- **Local**: SQLite via expo-sqlite with repository pattern in `database/repositories/`
- Database initialized and seeded on app startup (native only, skipped on web)

### State Management
- **AuthContext**: Token storage (SecureStore native, localStorage web), user state, login/logout
- **ThemeContext**: Light/dark mode with AsyncStorage persistence

### Path Aliases
Use `@/` prefix for imports (configured in babel.config.js and tsconfig.json):
```typescript
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/theme";
```

## Key Conventions

### Styling
- Use design tokens from `constants/theme.ts`: Colors, Spacing, BorderRadius, Typography
- Primary brand color: #8B4565 (dusty rose)
- 8-point spacing grid (xs:4, sm:8, md:16, lg:24, xl:32, xxl:48)
- Use Feather icons from @expo/vector-icons

### Components
- Themed components (ThemedText, ThemedView) auto-adapt to light/dark mode
- Screen wrappers (ScreenScrollView, ScreenFlatList) handle safe area insets
- Cards use 12px border radius, white background, subtle shadow

### API Calls
Always pass tenant context for multi-tenant routing:
```typescript
const { token, user } = useAuth();
const tenant = createTenantContext(user);
await projectsApi.getAll(token, tenant);
```

### Animations
react-native-reanimated plugin must be last in babel.config.js plugins array.
