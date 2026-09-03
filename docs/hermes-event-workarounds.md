# Hermes `Event` class workarounds (RN 0.83 + React 19)

## Root cause

React Native 0.83.6's `Event`/`EventTarget` implementation defines the phase
constants (`NONE`, `CAPTURING_PHASE`, `AT_TARGET`, `BUBBLING_PHASE`) as
non-writable/sealed properties on the class, but something in the runtime
(and/or a dependency touching `Event`) later tries to reassign them as
instance properties. On Hermes this throws, because Hermes enforces
non-configurable/non-writable property descriptors strictly.

Three independent patches exist in this repo to work around it. They were
added at different times without cross-referencing each other, so the repo
currently carries more workaround surface than necessary.

## The three patches

### 1. `babel.config.js:1-33` — `removeEventPhaseFields` (build-time)
A custom Babel visitor that runs during transpilation. It matches any file
whose path includes `Event.js` or `EventTarget`, and deletes:
- `this.NONE = ...` style assignment expressions inside the constructor
- class-field declarations for the same four phase properties

This prevents the problematic assignment from ever reaching the compiled
output for those specific files.

### 2. `index.js:4-24` — `Object.defineProperty` interception (runtime, active)
Wraps the global `Object.defineProperty`. Whenever RN's `Event` class tries to
define one of the four phase constants as non-writable, this forces it to
`writable: true, configurable: true` instead, then lets the define call
through. Installed before `require('expo-router/entry')`, so it's in place
before any app or RN internals load.

### 3. `polyfills.js` — **dead code, not wired in anywhere**
Attempts the same fix a third way: after `Event` is loaded, walk
`global.Event.prototype`/`global.Event` and force the four phase properties
configurable/writable via `Object.defineProperty`.

**Finding:** `package.json`'s `"main"` field points to `index.js`, not
`polyfills.js`, and nothing in the repo (`app.json`, `babel.config.js`,
`metro.config.js`, `index.js`, `src/`, `app/`) requires or imports
`polyfills.js`. It has never executed. Verified via:
```
grep -rn "polyfills" --include="*.js" --include="*.json" --include="*.ts" --include="*.tsx" .
# only self-match in polyfills.js itself
```
Removed in this ticket — it was providing zero protection and existing only
as a leftover from an earlier, abandoned attempt at this fix.

## Redundancy between the two remaining patches

The babel plugin (#1) and the runtime patch (#2) address the same failure
from different angles — build-time source stripping vs. runtime interception
— and their file-path/name matching means they could theoretically diverge
(e.g. a new RN version renaming internal files would silently disable #1
while #2 keeps working since it matches on the class name, not the file
path). They are not strictly redundant today: #2 is the actual safety net,
and #1 reduces reliance on it for the specific known files. Recommend keeping
both until the project upgrades off this RN 0.83/React 19 combination or RN
ships a fix upstream — track as tech debt to revisit on the next RN upgrade.

## Regression testing — status

This sandboxed environment has no booted iOS Simulator, no `emulator`/`adb`
on PATH, so a live app boot could not be exercised here to empirically
confirm which of the two remaining patches is load-bearing versus
belt-and-suspenders.

**Manual QA needed before merging any future change to these patches** (not
required for this ticket, since neither remaining patch was touched):
1. Comment out patch #2 in `index.js`, keep #1. Run `pnpm ios` or
   `pnpm android`. Exercise a flow that dispatches native events (camera
   capture, gesture handler interactions, WatermelonDB sync). Confirm no
   crash.
2. Revert, then comment out patch #1 in `babel.config.js`, keep #2. Repeat
   the same manual flow.
3. Whichever combination survives both passes without a crash is the
   minimal necessary fix — is the basis for removing the other patch in a
   follow-up ticket.

## Changes made in this ticket

- Removed `polyfills.js` (dead code, never referenced).
- No changes to `index.js` or `babel.config.js` — both active patches are
  left in place pending the manual QA pass described above, since removing
  either without a real device/simulator test is a genuine crash risk on
  the exact code path we're trying to protect.
