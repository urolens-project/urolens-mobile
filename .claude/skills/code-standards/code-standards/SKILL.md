---
name: code-standards
description: UroLens mobile (Expo / React Native) code standards — naming, return types, JSDoc, interfaces, constants, import order, component member ordering, styling (the RN equivalent of the company's BEM + Tailwind rule), icons, API calls, loading state, data mapping, zustand stores, and project structure. Adapted from the company's Angular FE standard. Use whenever writing, editing, refactoring, or reviewing any .ts/.tsx file in this repo — new components, screens, hooks, API modules, stores, or styles — even when the user does not mention "standards".
---

# UroLens Mobile Code Standards

These rules adapt the company FE standard (Angular: "Code Standards & Best Practices") to React Native. Each section notes the Angular rule it replaces so the two stay in sync.

**Scope for existing code:** do not mass-refactor untouched files. Apply these rules to code you write or touch. When you modify a file that badly violates them (for example a 500+ line screen), point it out and suggest a split. Do not do the split without being asked.

For full worked examples (component, hook, API module, store, mapper), read `references/examples.md`.

---

## Chapter 1 — Basics

### 1.1 Naming
- **camelCase** for variables, functions, props, style keys, and object properties.
  - ✅ `selectedSampleId` ❌ `SelectedSampleId`, `selected_sample_id`
- **PascalCase** for components, interfaces, and component files (`ResultReviewScreen.tsx`).
- **camelCase** for hook, API, util, and mapper files (`useQueue.ts`, `authApi.ts`).
- **ALL_CAPS** for module-level constants (`QUEUE_STATUSES`, `MAX_RETAKE_ATTEMPTS`).
- **snake_case only for raw API / DB fields**, and only at the boundary. Map to camelCase in a mapper (see 3.3) before the data reaches components.
- Booleans read as questions: `isLoading`, `hasError`, `canSubmit`.
- Event handlers: props are `onX` and local handlers are `handleX` (`onSubmit={handleSubmit}`).

### 1.2 Public vs private (replaces `public` / `private` / `protected`)
Function components have no access modifiers. Visibility is controlled by **what you export**:
- **Public:** the component's props interface and anything `export`ed. Keep it minimal.
- **Private:** helpers, sub-components, and constants used only in this file. Do **not** export them, not even "for later".
- A hook returns only what callers use. Keep internal state setters inside the hook.
- Never export something just so a test can reach it. Test through the public API.

### 1.3 Explicit return types
Every function declares its return type: components, hooks, handlers, API functions, and utils.
```ts
export function EmptyState({ title }: EmptyStateProps): React.JSX.Element { … }
export function useQueue(filter: FilterOption): UseQueueResult { … }
async function login(username: string, password: string): Promise<TokenResponse> { … }
const handleSubmit = (): void => { … };
```
Hooks return a **named interface** (`UseQueueResult`), not an inline object type.

### 1.4 JSDoc on every exported function, hook, and component
Use `@description` and `@param`. `@returns` is optional because the TS return type covers it. Explain **why** the function exists, not just what it does.
```ts
/**
 * @description Loads the medtech's queue from the local DB and re-syncs when the device comes back online.
 * @param filter - Active queue filter chip.
 */
export function useQueue(filter: FilterOption): UseQueueResult { … }
```
Non-exported one-line helpers can skip JSDoc if the name is self-explanatory.

### 1.5 `interface` over `type`
- `interface` for object shapes: props, payloads, DTOs, and hook results.
- `type` only for unions, mapped types, and utility types (`type SpecimenStatus = 'ASSIGNED' | 'IN_QUEUE'`).
- Props interfaces are named `<Component>Props` and declared directly above the component.

### 1.6 Constants
- Never inline large arrays or config objects in a component: filter options, reason lists, layout configs, or magic numbers.
- Put them in `constants/` next to where they're used: `src/features/<feature>/constants/<name>.constant.ts`. Cross-feature constants go in `src/lib/constants/`.
- Export in ALL_CAPS: `export const REJECTION_REASONS: RejectionReasonOption[] = [ … ];`

### 1.7 Import grouping order
Separate the groups with one blank line, in this order:
1. **React / React Native / Expo**: `react`, `react-native`, `expo-*`, `expo-router`
2. **Third-party and core**: `axios`, `zustand`, `@nozbe/watermelondb`, `@lib/*`, `@db/*`, `@hooks/*`, `@app-types/*`
3. **Shared UI**: `@components/*`
4. **Local**: `@features/<same feature>` and relative paths (`./`, `../`)

Use the path aliases (`@lib`, `@db`, `@components`, `@hooks`, `@features`, `@app-types`) instead of `../../..` when crossing top-level folders. Use `import type` for type-only imports.

---

## Chapter 2 — JSX & Styling

### 2.1 Conditional and list rendering (replaces `@if` / `@for`)
- `{condition && <X />}` for show/hide. Use a single-level ternary for either/or. **No nested ternaries**; extract a sub-component or use early returns.
- Handle loading, error, and empty states with **early returns** before the main JSX.
- Use `FlatList` / `SectionList` for data lists and `.map` only for small static lists. Always give a stable `key` / `keyExtractor` (an id, never the array index).
- Keep logic out of JSX. Compute values above the `return`.

### 2.2 Icons (replaces the SVG sprite rule)
- Use icons only through the shared `<Icon name="…" />` wrapper in `src/components/Icon.tsx`, which wraps `@expo/vector-icons`. If the wrapper doesn't exist yet, create it the first time you need an icon; don't add more direct `Ionicons` / `MaterialIcons` imports.
- Custom SVGs go in `assets/icons/` and are registered in the wrapper. **Never inline raw `<Svg><Path d="…"/>` data in a component.**

### 2.3 Styling: block / element / modifier (replaces BEM + Tailwind `@apply`)
RN has no CSS classes, so BEM maps onto `StyleSheet` like this:

| BEM | React Native |
|---|---|
| Block `.card` | The component. One component = one `styles` object. |
| Element `.card__title` | A style key: `styles.title` |
| Modifier `.card__title--active` | A camelCase suffix key, `styles.titleActive`, applied with a style array |
| `@apply text-slate-700` | A theme token: `colors.slate700` from `src/theme` |

Rules:
- `const styles = StyleSheet.create({ … })` goes at the **bottom** of the file, after the component.
- Name the root style `container`. Element keys are nouns (`title`, `icon`, `buttonText`).
- Modifiers are `<element><State>` and applied with arrays: `style={[styles.button, isDisabled && styles.buttonDisabled]}`.
- **No raw hex colors, font sizes, or spacing numbers in new code.** Use tokens from `src/theme` (`colors`, `spacing`, `radius`, `typography`). If a token you need doesn't exist, add it to the theme rather than hardcoding the value. If `src/theme` doesn't exist yet, create it and seed it with values already used in the codebase.
- **No inline style objects** (`style={{ marginTop: 8 }}`) except for truly dynamic values (animated values, computed widths).
- Never import another component's `styles`. If two components need the same look, extract a shared component (`<Button variant="primary" />`) instead of sharing style objects.

---

## Chapter 3 — Intermediate

### 3.1 Member ordering inside a component or hook
Every component and hook body follows this order:

1. **Store / context / router hooks** (injected services): `useAuthStore(selector)`, `useRouter()`, `useNetworkStatus()`
2. **Props destructuring** (inputs / outputs): destructure in the signature, `onX` callbacks included
3. **State and derived values** (signals / computed): `useState`, then `useMemo`
4. **Refs**: `useRef`
5. **Effects** (lifecycle): `useEffect`
6. **Handlers** (custom methods): `handleX` with `useCallback` when passed to children
7. **Data fetching**: lives in a feature hook (`useXxx`), not in the component. A component calls the hook at step 1–3.

After the body: early returns (loading/error/empty), then the main JSX `return`. Below the component: private sub-components, then `styles`.

### 3.2 Loading and error state (replaces `withLoading`)
- **Never** toggle loading by hand around a request (`setLoading(true)` … `setLoading(false)`).
- Use the shared `useAsyncAction` hook in `src/hooks/useAsyncAction.ts`. It owns `isLoading` and `error`, catches and logs errors, and aborts the previous in-flight request (the RN equivalent of `subscription.unsubscribe()`). If it doesn't exist yet, create it following `references/examples.md`.
- Always catch errors. Log them with a tag (`console.error('[Queue] failed to fetch', error)`, or the shared logger if one exists), then surface a user-facing message. Never swallow errors silently.

### 3.3 Map API data to UI (replaces `mapDataToUi()`)
- API modules return **raw DTOs** typed from `src/types/api.ts`.
- Convert DTOs to UI models in a pure mapper: `src/features/<feature>/mappers/<name>.mapper.ts` exporting `mapXToUi(dto): XUi`. Do snake_case → camelCase renames **here and only here**.
- Components and hooks never touch snake_case fields or destructure raw response bodies.
- Keep the success path short: fetch → map → set state.

### 3.4 API modules (replaces Angular services)
- One module per feature: `src/features/<feature>/api/<feature>Api.ts`, exporting a const object (`export const queueApi = { … }`).
- Always use the shared `apiClient` from `@lib/apiClient`, never a fresh `axios` instance or `fetch`.
- Every function has an explicit `Promise<Dto>` return type and JSDoc, and accepts an optional `AbortSignal`.
- No UI logic, navigation, or store writes inside API modules.

### 3.5 zustand stores (replaces `_private` + `asReadonly()`)
- Components **never** call `useStore.setState` or read the whole store object.
- Export **selector hooks** for reads (`export const useAuthRole = (): UserRole | null => useAuthStore((s) => s.role);`) and named actions for writes.
- Select the narrowest slice you need so unrelated updates don't cause re-renders.

### 3.6 DRY
Before writing something new, check:
- `src/components/` for shared UI
- `src/hooks/` for shared hooks
- `src/lib/` for utils, API client, auth, camera, and notifications
- `src/types/` for DTOs and domain types

Logic repeated in two places moves to `src/lib/utils/` (generic) or `src/features/<feature>/lib/` (feature-specific).

---

## Project structure

```
app/                              # expo-router routes: page-level, THIN (compose a feature screen, no business logic)
src/
  components/                     # shared, reusable UI (Icon, Button, EmptyState…)
  hooks/                          # shared hooks (useNetworkStatus, useAsyncAction…)
  lib/                            # apiClient, auth, camera, notifications, utils/, constants/
  theme/                          # colors, spacing, radius, typography tokens
  types/                          # api.ts (DTOs = exact API payload shapes), domain.ts, enums.ts
  db/                             # WatermelonDB models, migrations, sync
  features/<feature>/
    api/                          # <feature>Api.ts
    components/                   # feature screens and sub-components
    hooks/                        # useXxx: data fetching + feature state
    mappers/                      # DTO → UI model
    constants/                    # *.constant.ts
    lib/                          # feature-only helpers
    types.ts                      # feature UI models
```

| Angular | Here |
|---|---|
| `app/core/services` | `src/features/<f>/api/` + `src/lib/apiClient.ts` |
| `core/dto` | `src/types/api.ts` |
| `features/` (page-level) | `app/` routes → `src/features/<f>/components/<X>Screen.tsx` |
| `shared/components` | `src/components/` |
| `shared/utils` | `src/lib/utils/` |

## Size limits
- **Route files in `app/`:** about 50 lines. They render a feature screen and read route params, nothing else.
- **Components and hooks:** about 250 lines. Past that, split: move fetching and state into a hook, move repeated JSX blocks into sub-components, and move constants out.
- **Functions:** if a function needs a comment to explain each section, split it into named functions.

## Review checklist
When reviewing or finishing code, check:
- [ ] camelCase / PascalCase / ALL_CAPS naming; snake_case only inside mappers
- [ ] Only the public API is exported
- [ ] Explicit return types on every function
- [ ] JSDoc on exported functions, hooks, and components
- [ ] `interface` for object shapes
- [ ] No inline constant arrays or config objects in components
- [ ] Imports grouped in 4 blocks, using aliases
- [ ] No nested ternaries; early returns for loading/error/empty
- [ ] Icons go through `<Icon />`; no inline SVG paths
- [ ] Styles at the bottom, element/modifier keys, theme tokens, no raw hex, no inline style objects
- [ ] Member order: stores → props → state/memo → refs → effects → handlers
- [ ] No manual loading toggles; errors caught and logged
- [ ] DTOs mapped to UI models in a mapper
- [ ] API calls go through `apiClient` in a feature `api/` module
- [ ] Store access via selector hooks
- [ ] Route files thin; files within size limits
