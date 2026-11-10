# UroLens Mobile

MedTech mobile client app for UroLens — a React Native + Expo application that lets medical technologists capture urine specimen images, run AI-assisted analysis, and manage specimen queues and reports with offline-first support.

## Tech Stack

- **Framework**: [Expo](https://expo.dev) (React Native 0.83, React 19) with [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation
- **Language**: TypeScript
- **Local database / offline-first sync**: [WatermelonDB](https://watermelondb.dev)
- **State management**: [Zustand](https://zustand-demo.pmnd.rs)
- **HTTP client**: [Axios](https://axios-http.com)
- **Navigation**: React Navigation (via Expo Router)
- **Camera / media**: `expo-camera`, `expo-image-picker`, `expo-image-manipulator`
- **Auth storage**: `expo-secure-store`
- **Notifications**: `expo-notifications`
- **Testing**: Jest + `jest-expo` + React Native Testing Library
- **Linting / formatting**: ESLint, Prettier, Husky + lint-staged, Commitlint
- **Build / distribution**: EAS Build (Expo Application Services)

## Setup / Installation

### Prerequisites

- Node.js (LTS)
- [pnpm](https://pnpm.io) `9.15.4`
- Expo CLI (installed automatically via `pnpm`/`npx`)
- Android Studio (for Android builds/emulator) and/or Xcode (for iOS builds/simulator, macOS only)

### Steps

1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
2. Copy the example environment file and fill in the values (see [Environment Variables](#environment-variables)):
   ```bash
   cp .env.example .env
   ```
3. Start the Expo development server:
   ```bash
   pnpm start
   ```
4. Run on a platform:
   ```bash
   pnpm android          # Android emulator/device
   pnpm android:device   # Android, connected device
   pnpm ios               # iOS simulator
   pnpm ios:device        # iOS, connected device
   ```

### Other useful scripts

| Script | Purpose |
| --- | --- |
| `pnpm test` | Run the Jest test suite |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm type-check` | TypeScript type checking |
| `pnpm lint` | Lint `src` and `app` |
| `pnpm format` | Format the codebase with Prettier |
| `pnpm generate:types` | Generate API types from the local backend's OpenAPI schema |
| `pnpm build:preview` | Trigger an EAS preview build |

## Environment Variables

Defined in `.env` (see `.env.example` for defaults):

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_SYNC_INTERVAL_MS`
- `EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES`
- `EXPO_PUBLIC_USE_AUTH_MOCK`

## Deployed Version

UroLens Mobile is distributed as an Android APK rather than a hosted web URL. The latest build is available here:

- **APK (Google Drive)**: https://drive.google.com/drive/folders/1Wf2qx0P62bX2h8S5iR7qGDpvZL7d9j1u

Staging and production builds point to the deployed backend API at `https://urolens-api.azurewebsites.net/api/v1`.
