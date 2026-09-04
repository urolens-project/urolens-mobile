# Smart Diagnosis display placement audit

Scope: verify that AI findings / Smart Diagnosis output renders in the
"Supervisor's result review screen," per the Smart Diagnosis epic
description ("This Epic covers displaying that output correctly in the
Supervisor's result review screen").

## Finding: there is no Supervisor-facing screen in this codebase

`app/` contains exactly two route groups: `(auth)` and `(medtech)`. There is
no `(supervisor)` group, and no screen anywhere references a Supervisor
workflow. `AIFindingsPanel` and `SmartDiagnosisPanel` (the two components
that render Smart Diagnosis output) are only used inside
`ResultReviewScreen.tsx`, which is only reachable via
`app/(medtech)/sample/[id].tsx` — entirely inside the `(medtech)` route
group.

That group is hard role-gated:

```ts
// app/(medtech)/_layout.tsx:74-76
if (!isAuthenticated || role !== UserRole.MEDTECH) {
  return <Redirect href="/(auth)/login" />;
}
```

Any authenticated user whose role isn't `MEDTECH` — including `SUPERVISOR`
— is redirected straight back to the login screen. Combined with
`useAuth.ts`'s login handler always doing
`router.replace('/(medtech)/queue')` regardless of the authenticated
user's actual role (`useAuth.ts:26`, no role-based branch), a Supervisor
account logging into this app today would land on `/(medtech)/queue`, get
immediately bounced by the layout guard back to `/(auth)/login`, and have
no route into the app at all.

**Conclusion**: `ResultReviewScreen` is not a Supervisor screen — it's the
MedTech's own pre-confirmation review screen (correctly scoped to the
**Result Confirmation** epic, where MedTech reviews AI output, optionally
overrides a parameter, then confirms). The Smart Diagnosis epic's intended
destination — a Supervisor result review screen — does not exist yet.
"Confirm placement matches epic intent" can't be resolved by relocating a
component; it requires building the Supervisor Review screen itself, which
is out of scope for a display-only audit.

## Where Smart Diagnosis output is currently shown (both MedTech-only)

1. **Pre-confirmation** — `ResultReviewScreen.tsx`, via `AIFindingsPanel`
   and `SmartDiagnosisPanel` (dedicated, reusable components in
   `src/features/result-confirmation/components/`).
2. **Post-confirmation (revisiting from queue)** — `sample/[id].tsx`'s own
   `SmartDiagnosisSection` and `AIFindingsSection` — locally-defined
   components in the route file itself, separate from and differently
   styled than the two above, rendering materially the same information
   (particle counts, condition risk levels). This is a smaller-scale
   version of the same kind of duplication fixed in
   `fix/consolidate-result-confirmation` — worth consolidating into one
   shared display component in a future pass, though lower priority since
   it's display-only (no behavior to drift, unlike the confirm-logic bug).

## Recommendation

This ticket surfaces a genuine product/scope gap, not a code defect:
Supervisor Review (ticket #1 in the sprint plan) needs its own route group,
role-gated to `SUPERVISOR`, before Smart Diagnosis output can be displayed
"in the Supervisor's result review screen" as the epic describes. Until
that screen exists, Smart Diagnosis is only visible to MedTech — flag this
to whoever owns sprint/epic scoping rather than treating it as a quick fix
here.
