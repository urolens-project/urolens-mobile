# MVP Refactor Plan — urolens-mobile

Prepared for the MVP validation demo to stakeholders. Grounded in a codebase audit of branch `feat-epic-7_mobile` (2026-09-03).

## Top risk findings

1. **No error boundary anywhere** — any render throw crashes the whole app mid-demo.
2. **`app/_layout.tsx:13-15`** — a `// TEMP` `AsyncStorage.removeItem('urolens_last_sync_at')` runs unconditionally on module load, every launch, every build (including production). Forces a full WatermelonDB resync every time the app opens, and risks wiping unsynced confirmed/corrected results before they push.
3. **RN 0.83 + React 19 + Hermes instability** — three independent hand-rolled workarounds for the same `Event`-class issue (`index.js` monkeypatch, `babel.config.js` custom visitor, `polyfills.js`). Bleeding-edge combination; biggest unknown-unknown crash risk for demo day.
4. **PII/token leakage in logs** — `useAuth.ts:22-33` logs full login payloads/errors with emoji tags (`console.log('🟢 Login success:', JSON.stringify(data))`).
5. **Two diverging implementations of the same feature** — `useConfirmResult.ts` vs `useResultConfirmation.ts`, both live, used by two different result-confirmation/override screens with different behavior.
6. **Env/secrets hygiene** — local `.env` holds a real Supabase **service-role** key (bypasses RLS) and a hardcoded LAN IP (`192.168.113.215`) as the API base URL. `.env` also has `EXPO_PUBLIC_APP_ENV=production` set for local dev.
7. **Unjustified Android permissions** — `RECORD_AUDIO`, `RECEIVE_BOOT_COMPLETED` on a camera-only urinalysis app.
8. **CI gaps** — lint isn't run in CI; CI doesn't trigger on the current branch pattern (`feat-epic-7_mobile`); test coverage gate only covers 6 files — screens/navigation/sync layer are untested.
9. **Asset bloat** — notification icon is a byte-for-byte duplicate of the full app icon (384KB, uncompressed).
10. Minor: `type.ts` vs `types.ts` naming inconsistency (image-retake feature); sparse `React.memo` usage app-wide.

What's already healthy and doesn't need rework: feature-based folder structure (`src/features/*`), path aliases (tsconfig/metro/jest all in sync), WatermelonDB wiring, Expo SDK 55 pinning, `.env` correctly gitignored (the exposure is a working-tree hygiene issue, not a git leak).

## Technique coverage

| Technique | Where it lives in this plan |
|---|---|
| Stability & crash-proofing | Platform & Foundation ticket (global error boundary, Hermes audit); Image Capture, Supervisor Review (per-flow guarding) |
| Dead code & debug cleanup | Platform & Foundation (auth/sync logs); Image Capture (capture log) |
| Config & environment hygiene | Platform & Foundation (key rotation, hardcoded IP) |
| Code organization / naming | Platform & Foundation (`type.ts` → `types.ts`) |
| Build & deployment readiness | Platform & Foundation (CI lint gate, branch triggers); Image Capture (permissions) |
| UI/UX polish for perception | Push Notifications (icon asset) |
| Performance quick wins | Platform & Foundation (QueueItemCard memo); Smart Diagnosis (AIFindingsPanel memo) |
| Minimal test coverage on critical paths | Result Confirmation, Push Notifications |

## Ticket breakdown

### 0. Platform & Foundation — Code review/refactor (cross-cutting, no single epic owns these)

| Sub-task | Finding | Branch |
|---|---|---|
| Global error boundary | No error boundary anywhere in the app | `fix/global-error-boundary` |
| Document/regression-test Hermes Event workarounds | 3 independent patches for RN0.83+React19 instability | `docs/hermes-event-workarounds` |
| Remove auth debug logs | `useAuth.ts` logs full login payloads/tokens | `fix/remove-auth-debug-logs` |
| Remove sync-layer debug logs | 6 console.* calls across `db/sync/*` | `chore/remove-sync-debug-logs` |
| Rotate exposed Supabase key, remove hardcoded LAN IP | Service-role key + hardcoded `192.168.x.x` API URL | `fix/env-hygiene-rotate-keys` |
| Normalize `type.ts` → `types.ts` | Naming inconsistency in image-retake feature | `chore/normalize-type-file-naming` |
| Add lint to CI, fix branch triggers | Lint never runs in CI; current branch pattern isn't triggered | `chore/ci-lint-and-triggers` |
| Memoize QueueItemCard | Sparse memoization usage app-wide | `chore/memoize-queue-item-card` |

### 1. Supervisor Review — Code review/refactor
Backed by: `src/features/manual-override/*`, `src/features/specimen-rejection/*`, `app/(medtech)/sample/override/[id].tsx`, `sample/reject/[id].tsx`

| Sub-task | Finding | Branch |
|---|---|---|
| Consolidate confirm-flow used by supervisor override screen | `useConfirmResult` vs `useResultConfirmation` divergence affects the override path in `sample/[id].tsx` | `fix/consolidate-result-confirmation` |
| Verify escalation/rejection paths don't throw unguarded | No error boundary exists; override/reject/escalate are state-mutating actions that shouldn't hard-crash | `fix/supervisor-actions-error-guarding` |
| Confirm QC batch reporting scope | Not found in current codebase — needs scoping, not refactor | `docs/supervisor-qc-reporting-scope` |

### 2. Smart Diagnosis — Code review/refactor
Backed by: `AIFindingsPanel` (currently rendered inside result-confirmation — confirm placement matches epic intent)

| Sub-task | Finding | Branch |
|---|---|---|
| Verify AI findings render location matches epic (supervisor result review) | `AIFindingsPanel` currently used in `ResultReviewScreen.tsx` — confirm this is the supervisor-facing screen | `docs/smart-diagnosis-display-audit` |
| Memoize findings panel for render stability | No `React.memo` on `AIFindingsPanel` | `chore/memoize-ai-findings-panel` |

### 3. Image Capture — Code review/refactor
Backed by: `src/features/image-retake/*`, `ImageCaptureScreen.tsx`

| Sub-task | Finding | Branch |
|---|---|---|
| Remove debug log leaking capture data | `ImageCaptureScreen.tsx:127` console.log | `chore/remove-image-capture-debug-log` |
| Guard capture/upload flow against unhandled failures | No error boundary; camera/upload is the first thing a demo touches | `fix/image-capture-error-guarding` |
| Confirm camera permissions are minimal & justified | Android manifest includes `RECORD_AUDIO`, `RECEIVE_BOOT_COMPLETED` — unjustified | `chore/trim-android-permissions` |

### 4. Result Confirmation — Code review/refactor
Backed by: `src/features/result-confirmation/*`

| Sub-task | Finding | Branch |
|---|---|---|
| Consolidate duplicate hooks (core fix for this epic) | `useConfirmResult.ts` and `useResultConfirmation.ts` implement the same confirm→Smart Diagnosis step differently, used by two different screens | `fix/consolidate-result-confirmation` *(same PR as Supervisor Review sub-task above)* |
| Remove root-layout sync reset that undermines "preserve original values" guarantee | TEMP `AsyncStorage.removeItem` risks wiping unsynced confirmed/corrected results | `fix/remove-temp-sync-reset` |
| Add critical-path test for confirm → Smart Diagnosis trigger | Currently untested beyond the two divergent hooks individually | `test/result-confirmation-critical-path` |

### 5. Push Notifications — Code review/refactor
Backed by: `src/lib/notifications`

| Sub-task | Finding | Branch |
|---|---|---|
| Fix notification icon asset (currently full app icon, uncompressed, 384KB) | Wrong asset shape/size, bloats bundle | `chore/optimize-notification-icon` |
| Verify tap-to-navigate deep-link correctness for both notification types (assignment, result return) | Not covered by audit in depth — core epic behavior | `docs/push-notification-navigation-audit` |
| Add test for notification → correct-screen navigation | No tests found for this path | `test/push-notification-navigation` |

### 6. Result Release — Code review/refactor
No code found in this mobile repo (receptionist/patient/physician portals).

| Sub-task | Finding | Branch |
|---|---|---|
| Confirm scope: is this mobile, web, or a separate portal repo? | Zero matching screens/features in `urolens-mobile` | `docs/result-release-scope-confirmation` |

## Sprint plan

**Sprint 1 (P0 — demo-blocking):**
1. Platform & Foundation → `fix/global-error-boundary`
2. Platform & Foundation → `fix/env-hygiene-rotate-keys`
3. Result Confirmation / Supervisor Review → `fix/consolidate-result-confirmation`
4. Result Confirmation → `fix/remove-temp-sync-reset`
5. Image Capture → `fix/image-capture-error-guarding`
6. Image Capture → `chore/remove-image-capture-debug-log`
7. Supervisor Review → `fix/supervisor-actions-error-guarding`
8. Image Capture → `chore/trim-android-permissions`
9. Platform & Foundation → `fix/remove-auth-debug-logs`

**Sprint 2 (P1 — polish, coverage, scope clarification):**
1. Platform & Foundation → `docs/hermes-event-workarounds`
2. Platform & Foundation → `chore/remove-sync-debug-logs`
3. Platform & Foundation → `chore/normalize-type-file-naming`
4. Platform & Foundation → `chore/ci-lint-and-triggers`
5. Platform & Foundation → `chore/memoize-queue-item-card`
6. Push Notifications → `chore/optimize-notification-icon`
7. Push Notifications → `docs/push-notification-navigation-audit`
8. Push Notifications → `test/push-notification-navigation`
9. Result Confirmation → `test/result-confirmation-critical-path`
10. Smart Diagnosis → `docs/smart-diagnosis-display-audit`
11. Smart Diagnosis → `chore/memoize-ai-findings-panel`
12. Supervisor Review → `docs/supervisor-qc-reporting-scope`
13. Result Release → `docs/result-release-scope-confirmation`

## Branch naming convention

`<type>/<kebab-slug>`, matching existing repo convention:
- `fix/*` — crash/bug fixes
- `chore/*` — cleanup, config, CI, non-functional
- `docs/*` — scoping/audit/documentation-only tickets
- `test/*` — test-only additions

Note: `fix/consolidate-result-confirmation` is shared between the Supervisor Review and Result Confirmation tickets — one PR, both tickets linked to it.
