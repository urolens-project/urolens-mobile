# Hermes `Event` class workarounds (RN 0.83 + React 19)

## Root cause

React Native 0.83.6's `Event`/`EventTarget` implementation defines the phase
constants (`NONE`, `CAPTURING_PHASE`, `AT_TARGET`, `BUBBLING_PHASE`) as
non-writable/sealed properties on the class, but something in the runtime
(and/or a dependency touching `Event`) later tries to reassign them as
instance properties. On Hermes this throws, because Hermes enforces
non-configurable/non-writable property descriptors strictly.

Two active patches exist in this repo to work around it, plus one that was
briefly removed as dead code and has since been reinstated in consolidated
form — see "History" below.

## The two active patches

### 1. `babel.config.js:1-33` — `removeEventPhaseFields` (build-time)
A custom Babel visitor that runs during transpilation. It matches any file
whose path includes `Event.js` or `EventTarget`, and deletes:
- `this.NONE = ...` style assignment expressions inside the constructor
- class-field declarations for the same four phase properties

This prevents the problematic assignment from ever reaching the compiled
output for those specific files.

### 2. `polyfills.js` — `Object.defineProperty` interception (runtime, active)
Wraps the global `Object.defineProperty`. Whenever RN's `Event` class tries to
define one of the four phase constants as non-writable, this forces it to
`writable: true, configurable: true` instead, then lets the define call
through. Required from `index.js` (`require('./polyfills')`) before
`require('expo-router/entry')`, so it's in place before any app or RN
internals load.

## History

This same runtime interception used to live inline in `index.js` at the same
time a second, weaker copy sat in `polyfills.js` (post-hoc, walked
`global.Event.prototype` after the fact instead of intercepting the define
call — unreliable depending on load order). Nothing required `polyfills.js`,
so it was dead code, and it was removed on `main` for that reason.

Separately, on `fix/refactor`, the inline copy in `index.js` and the dead
copy in `polyfills.js` were consolidated: the more robust interception logic
now lives solely in `polyfills.js`, and `index.js` just requires it. When
`main` was merged into `fix/refactor`, that consolidation is what survived —
so `polyfills.js` is back, but as the single active implementation rather
than a dead duplicate.

## Redundancy between the two active patches

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

**Manual QA needed before merging any future change to these patches:**
1. Comment out the require in `index.js` (patch #2), keep #1. Run `pnpm ios`
   or `pnpm android`. Exercise a flow that dispatches native events (camera
   capture, gesture handler interactions, WatermelonDB sync). Confirm no
   crash.
2. Revert, then comment out patch #1 in `babel.config.js`, keep #2. Repeat
   the same manual flow.
3. Whichever combination survives both passes without a crash is the
   minimal necessary fix — is the basis for removing the other patch in a
   follow-up ticket.

## Current state

- `polyfills.js` exists and is required by `index.js`. It is not dead code.
- `index.js` only bootstraps: `require('./polyfills')` then
  `require('expo-router/entry')`.
- `babel.config.js`'s `removeEventPhaseFields` plugin is untouched.
- Neither active patch has had the manual QA pass above run against it, so
  treat both as load-bearing until that's done.
