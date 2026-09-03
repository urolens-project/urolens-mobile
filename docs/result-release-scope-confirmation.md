# Result Release — scope confirmation

Scope: confirm whether "Result Release" (Receptionist releasing results,
patient portal result viewing, physician portal for lab request submission
and result retrieval) belongs in this mobile repo (`urolens-mobile`) at all.

## Finding: no matching code anywhere

Searched `src/`, `app/`, `tests/` for receptionist/patient-portal/
physician-portal/lab-request/result-release terminology. The only hits are
cosmetic:

- `UserRole.RECEPTIONIST`, `UserRole.PHYSICIAN`, `UserRole.PATIENT` exist in
  `src/types/enums.ts`, and are used in exactly one place —
  `app/(medtech)/profile.tsx:22-27`, a static `{ role: label }` lookup map
  for displaying a human-readable role name. No screen, route, or hook
  exists for any of these three roles.
- `ResultStatus.RELEASED` exists and is read in one place —
  `app/(medtech)/sample/[id].tsx:308` — to show a "Result Released" banner
  to the MedTech. Nothing in this codebase ever *sets* a result to
  `RELEASED`; there is no release action anywhere.

Same pattern as the two other scope-confirmation tickets this sprint
(Supervisor Review's QC batch reporting, Smart Diagnosis's Supervisor
screen): the domain model / enums anticipate these roles and states, but
zero corresponding UI exists in `urolens-mobile`.

## Conclusion

Result Release — receptionist releasing, patient viewing results, and a
physician portal for lab requests — describes three separate user-facing
surfaces (receptionist tool, patient app/portal, physician app/portal),
none of which resemble a MedTech/Supervisor lab workflow app. Given
`(medtech)/_layout.tsx` gates this entire app to the `MEDTECH` role (and,
per the other two scope docs, has no path in for any other role at all),
this is almost certainly intended to live in a **separate application** —
most plausibly a web portal, given "portal" is used explicitly for both
the patient and physician surfaces in the epic description, whereas
`urolens-mobile` is architecturally a single-role (MedTech) field app.

**Recommendation**: confirm with whoever owns product/architecture
decisions whether Result Release is:
1. A separate repo/web app already in progress elsewhere, or
2. Genuinely intended for this mobile app, in which case it needs its own
   epic-level scoping (new role-gated route groups, likely a completely
   different navigation shape for patient/physician users versus the
   MedTech tab-bar layout) rather than a refactor ticket.

Not something to build or fix as part of this MVP stabilization pass.
