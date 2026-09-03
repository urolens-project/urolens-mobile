# Supervisor QC batch reporting — scope confirmation

Scope: confirm whether "QC batch reporting," part of the Supervisor Review
epic description ("...escalation with three paths, and QC batch
reporting"), exists anywhere in this mobile codebase.

## Finding: nothing exists

Searched `src/`, `app/`, and `tests/` for any QC / quality-control / batch
report terminology (`QC`, `quality control`, `batch report`) — zero matches.
There is no screen, hook, type, or route referencing this feature at all.

This is consistent with the broader picture from
[docs/smart-diagnosis-display-audit.md](smart-diagnosis-display-audit.md):
this mobile codebase has no Supervisor-facing surface whatsoever —
`(medtech)/_layout.tsx` hard-gates its entire route group to
`role === UserRole.MEDTECH`, and there is no `(supervisor)` route group to
put a QC batch reporting screen (or any Supervisor screen) into.

## Related data point

`ResultStatus.CRITICAL_ESCALATED` already exists as an enum value
(`src/types/enums.ts:25`) and on the `AnalysisResult` model's status type —
the domain model anticipates escalation as a concept the backend can
express, but there is no mobile UI anywhere that sets, displays, or acts on
this status. Same shape of gap as QC batch reporting: a placeholder in the
data layer with no corresponding screen.

## Conclusion

"QC batch reporting" cannot be scoped as a refactor or a bug fix — there is
nothing here to refactor. It's a net-new feature that depends on the same
prerequisite as the rest of the Supervisor Review epic: a Supervisor route
group and screens need to exist before batch reporting (or escalation, or
Smart Diagnosis review) can be built on top of them.

Recommend treating "Supervisor Review" as a feature-build ticket for a
future sprint (with QC batch reporting, escalation, and Smart Diagnosis
display as sub-features within it), not as a refactor item in this MVP
stabilization pass.
