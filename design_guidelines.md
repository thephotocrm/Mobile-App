# thePhotoCrm Mobile App - Design Guidelines

## Application Overview
A **photographer-only** iOS/Android mobile app for managing wedding photography business on-the-go. Focus on essential tasks: responding to clients, managing projects, and staying on schedule. Clients access their portal via mobile web (no app download required).

## Authentication Architecture

**Required:** Email/password + Google OAuth SSO
- Face ID (iOS) / Fingerprint (Android) biometric login
- Secure token storage in device keychain
- Biometric prompt after first successful login
- Fallback to password if biometric fails
- "Enable Face ID/Touch ID" toggle in Settings

**Login Flow:**
1. Check SecureStore for saved token on app launch
2. If token exists + Face ID enabled → Show biometric prompt
3. If token exists + Face ID disabled → Auto-login
4. If no token → Show login screen with email/password fields, Google OAuth button, "Sign up" and "Forgot Password" links

## Navigation Architecture

**Bottom Tab Navigation (4 tabs):**
1. **Projects** (Home icon) - Projects dashboard with pipeline view
2. **Inbox** (Message icon + unread badge) - Messaging center
3. **Bookings** (Calendar icon) - Upcoming appointments
4. **More** (Menu icon) - Profile, settings, logout

**Stack Navigators per Tab:**
- Projects Stack: List → Detail → Add Note → Contact Detail
- Inbox Stack: Conversations → Thread → Send Message
- Bookings Stack: Calendar → Booking Detail → Reschedule
- More Stack: Profile → Settings → Edit Availability → Toggle Face ID

## Screen Specifications

### Projects List Screen
- Transparent header with search bar
- Horizontal scrolling stage filter chips
- Vertical scrolling project cards
- Each card: Client avatar (initials), project title, client name, stage badge, event date, chevron
- Bottom inset: tabBarHeight + 32px

### Inbox Screen
- Conversation cards with client avatar, name, last message preview, timestamp
- Unread count badge on cards with new messages
- Swipe actions: archive, star
- Pull to refresh
- Bottom inset: tabBarHeight + 32px

### Bookings Calendar Screen
- Monthly calendar view at top with today indicator and booking dots
- Scrollable list of upcoming appointments below
- Booking cards with colored left border, event title, client name, date/time with icons
- Bottom inset: tabBarHeight + 32px

### Project Detail Screen
- Hero section: client info, event date, status badge
- Quick action buttons: Call, Text, Send Magic Link
- Project notes section
- Non-transparent header with back button

### More/Profile Screen
- User avatar and business name at top
- Business info display sections
- Settings list items: Availability, Notifications, Face ID toggle
- Logout button at bottom (with confirmation alert)

## Visual Design System

### Color Palette
- **Primary Brand:** #8B4565 (dusty rose)
- **Primary Light:** #A65678
- **Primary Dark:** #6D3650
- **Backgrounds:** #FFFFFF (main), #F9FAFB (secondary), #F7F7F7 (cards)
- **Text:** #111827 (primary), #6B7280 (secondary)
- **Borders:** #E5E7EB
- **Success:** #22C55E | **Error:** #EF4444 | **Warning:** #F59E0B | **Info:** #3B82F6

### Typography
- **Font:** System default (SF Pro on iOS, Roboto on Android)
- **Headers:** h1 (32px/700), h2 (24px/600), h3 (20px/600), h4 (18px/600)
- **Body:** 16px/400, Small (14px/400)
- **Buttons:** 16px/600
- **Labels:** 14px/500
- **Captions:** 12px/400

### Spacing (8-point grid)
- xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px | xxl: 48px

### Component Styling

**Cards:**
- Background: #FFFFFF
- Border radius: 12px
- Padding: 16px
- Shadow: 0px 2px rgba(0,0,0,0.1), radius 8px, elevation 3 (Android)

**Primary Buttons:**
- Background: #8B4565
- Border radius: 8px
- Padding: 12px vertical, 24px horizontal
- Text: #FFFFFF, 16px/600
- Pressed state: darker background

**Secondary Buttons:**
- Background: transparent
- Border: 1px solid #8B4565
- Border radius: 8px
- Padding: 12px vertical, 24px horizontal
- Text: #8B4565

**Inputs:**
- Background: #F9FAFB
- Border: 1px solid #E5E7EB
- Border radius: 8px
- Padding: 12px vertical, 16px horizontal
- Font size: 16px

**Badges:**
- Border radius: 4px
- Padding: 4px 8px
- Font: 12px/500
- Color coded by status

### Icons
- Use Feather icons from @expo/vector-icons
- Standard size: 20px for inline, 24px for buttons, 64px for modals
- Never use emojis

### Interaction Design
- All touchable elements have visual feedback (opacity change or background color)
- Pull to refresh on list screens
- Swipe gestures for secondary actions (archive, delete)
- Modal overlays for confirmations and Face ID prompts
- Loading states for async operations

## Accessibility Requirements
- Minimum touch target: 44x44px
- Color contrast ratio ≥ 4.5:1 for text
- Support for system font scaling
- VoiceOver (iOS) and TalkBack (Android) labels on interactive elements
- Meaningful placeholder text in inputs

## Critical Assets
- App logo (displayed on login screen)
- Client avatar placeholders (use initials on colored backgrounds)
- Empty state illustrations for: No projects, No messages, No bookings