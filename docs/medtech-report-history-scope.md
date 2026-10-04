# MedTech report history — partial frontend implementation

Acceptance criteria have not been supplied. This pass extends the existing Reports tab for browsing completed and historical samples from the records retained by the current device sync.

- Keep the existing Pending Supervisor Approval, Approved by Supervisor, Released, and Rejected categories. Pending approval means the MedTech has finished confirmation; it is not a released result.
- Search within a category by sample ID, patient ID, or test type, ignoring case and surrounding whitespace.
- Default to All dates, including previous years. Last 7 days and Last 30 days filter by received date, including today and the previous 6 or 29 days in the device's local timezone.
- Show matching counts separately from each category's total and provide Clear filters and a distinct no-match state.
- Preserve the existing newest-first order by confirmation/rejection timestamp, falling back to received date. Approval and release timestamps are not available in the local models.
- Open sample details in explicit read-only mode. Analysis, rejection, confirmation, retake, and the editable result review shortcut remain unavailable even if sync returns a report to an active state. Queue entry retains the existing actions.
- Update categories when existing specimen/result rows change. A rejected specimen appears only under Rejected, even if an old result still has an approved or released status.
- Keep cached records available offline and during refresh failures; show loading and failure feedback. Pull-to-refresh retries sync and failed local report subscriptions.

This pass does not add backend history endpoints, server pagination, audit/version history, exports, or access-control rules. Visibility remains bounded by the existing sync scope and retention; a historical report is the sample's current retained result, not every previous revision. Returned-for-correction results continue to belong in Queue. Critical/escalated results keep their existing behavior until their report-history requirements are defined.

Suggested manual checks:

1. Open Reports, select a category, and open an older approved or released sample. Verify identifiers, findings, and diagnosis are visible with no edit actions.
2. Search for a sample or patient ID, select each received-date filter, and clear filters. Verify counts, old records under All dates, and the no-match message.
3. Switch offline and browse previously synced reports. Reconnect and pull down to sync; verify a supervisor status change moves the sample to the correct category.
4. Return an open report for correction through another client. Verify its details remain read-only, then open it from Queue and verify the correction actions are available.
