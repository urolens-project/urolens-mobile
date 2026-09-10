# Codebase Review — Quick Check

Date: 2026-08-19

## Scope

React Native / Expo app (Expo Router, WatermelonDB) for a medtech specimen/queue workflow.
67 `.ts`/`.tsx` files under `src/` and `app/`.

`node_modules` was not installed and `pnpm install --frozen-lockfile` failed due to an
`overrides` mismatch against `pnpm-lock.yaml`. Installing would have required
`--no-frozen-lockfile`, which rewrites the lockfile — skipped per instruction, so `tsc`
and `eslint` were not run. This review is a manual read-through, not a full static-analysis pass.

## Findings

### 1. Security — plaintext access token logged on login
**File:** `src/features/auth/hooks/useAuth.ts:24`

```ts
console.log('🟢 Login success:', JSON.stringify(data));
```

`data` is the full `TokenResponse`, including the raw JWT `access_token`. This gets written
to device logs (and potentially crash/log aggregation tools) in plaintext. The surrounding
`login()` function has several other debug `console.log` calls (🔵🟢🔴 emoji-prefixed) that
look like leftover dev instrumentation, including one that logs the raw error object
(`console.log('🔴 Login error:', JSON.stringify(err))`, line 30).

### 2. Security — dev login bypass gated only by env var
**File:** `src/features/auth/api/authApi.ts:7-9`

```ts
// DEV MOCK: use username "medtech" / any password to bypass backend
if (process.env.EXPO_PUBLIC_APP_ENV === 'development' && username === 'medtech') {
  return mockTokenResponse;
}
```

Any password succeeds for username `medtech` when `EXPO_PUBLIC_APP_ENV === 'development'`.
`EXPO_PUBLIC_*` variables are compiled directly into the JS bundle at build time, so if this
env var is ever left unset/misconfigured on a preview, staging, or (worst case) production
build, the app ships with a full authentication bypass baked in. Worth confirming the build
pipeline can't produce that misconfiguration, or removing this code path from non-dev builds
entirely (e.g. via a build-time flag/dead-code-elimination rather than a runtime check).

### 3. Bug — production code unconditionally wipes local sync state on every launch
**File:** `app/_layout.tsx:14-16`

```ts
// TEMP — clear sync timestamp so next launch triggers a full sync + local DB reset
import AsyncStorage from '@react-native-async-storage/async-storage';
AsyncStorage.removeItem('urolens_last_sync_at');
```

This runs at module load, unconditionally, in every build — unlike the `DevSettings` "Reset
Auth → Login" menu item right below it, which is correctly gated behind `if (__DEV__)`. Per
`src/db/sync/syncManager.ts`, a missing `lastSyncedAt` triggers `database.unsafeResetDatabase()`
before pulling from the server. So as written, **every cold start wipes the local WatermelonDB
and forces a full resync**, defeating the offline-first design and adding unnecessary load/latency
on every launch (and making the app briefly non-functional offline right after opening). Looks
like leftover debug code from testing the full-sync path that was never removed or wrapped in
`__DEV__`.

## Additional areas reviewed (routes, camera, notifications, migrations)

- **`app/_layout.tsx`** — auth bootstrap (reads `tokenStorage`, restores `useAuthStore`) is
  handled cleanly with mount-guard/cancellation (`isCurrent` flag) to avoid state updates after
  unmount. Main issue is Finding #3 above.
- **`app/(medtech)/_layout.tsx`** — route guard (`redirect` to login if not authenticated or
  wrong role) and sync triggers (on mount, on app-foreground, on network reconnect) all look
  correct and are properly cleaned up in the `useEffect` return.
- **`src/lib/camera/imageUtils.ts`** — good privacy practice: strips EXIF via
  `ImageManipulator` re-encode before upload, validates minimum resolution (640×480) client-side
  to mirror the backend check. No issues found.
- **`src/lib/notifications/notificationHandler.ts`** — push token registration and
  notification-tap routing look correct; failures (no APNs on simulator, push-token POST failure)
  are treated as non-fatal, which is appropriate since push is a non-critical enhancement here.
- **`src/db/migrations/index.ts`** — WatermelonDB schema migrations to v2/v3 are consistent with
  the model changes seen elsewhere (specimen rejection fields, manual override numeric fields).
  The v3 backfill uses `CAST(... AS REAL)` on `original_ai_value`/`corrected_value` — if any
  pre-existing row has a non-numeric string in those columns, the cast would silently coerce to
  `0`/`NULL` rather than fail; low risk if those columns were always numeric-as-string, but worth
  a sanity check against production data before shipping this migration.

## Things that looked solid

- **`src/lib/auth/tokenStorage.ts`** — correctly uses `expo-secure-store` (not AsyncStorage)
  for the access token, user id, role, and username. Clean `saveToken`/`getToken`/`clearAll` API.
- **`src/db/sync/conflictResolver.ts`** — sync conflict rules (server-wins on `status`,
  client-wins on unsynced `manual_overrides` drafts, server-wins default) are clearly
  documented and the implementation matches the documented rules (Mobile Developer Guide §9.3).
- No hardcoded secrets found in `src/` (only match was the intentional mock fixture
  `src/mocks/fixtures/auth.ts`, which is clearly a mock token).
- No `TODO`/`FIXME`/`XXX`/`HACK` markers left in `src/`.

## Not yet checked

- Full `tsc --noEmit` / `eslint` pass (blocked on dependency install decision above).
- `src/features/*` screen components (queue, result-confirmation, specimen-rejection,
  manual-override, image-retake) beyond what was pulled in indirectly — not individually read.
- `src/db/sync/pullChanges.ts` / `pushChanges.ts` internals, `src/db/models/`.
- Test suite under `tests/` was not reviewed or run.
