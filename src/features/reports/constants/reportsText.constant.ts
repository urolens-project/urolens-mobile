function pluralizeSample(count: number): string {
  return count === 1 ? 'sample' : 'samples';
}

export const REPORTS_TEXT = {
  syncErrorMessage:
    'Reports could not be updated. Showing available records. Pull down to try syncing again.',
  loadingAccessibilityLabel: 'Loading reports',
  loadingCaption: 'Loading reports…',

  categoryHeaderBackLabel: 'Back to Reports',

  emptyFilteredTitle: 'No matching samples',
  emptyFilteredSubtitle: 'Try another search or clear the filters to view all dates.',
  emptyCategoryTitle: 'Nothing here yet',
  emptyCategorySubtitle: 'Samples that reach this stage will show up here.',
  emptyOfflineTitle: "You're offline",
  emptyOfflineSubtitle: 'Connect to sync your finished samples.',
  loadOlderSamplesLabel: 'Load older samples',

  searchPlaceholder: 'Sample ID, patient ID, or test type',
  searchAccessibilityLabel: 'Search reports',
  filterCaption: 'Filter by received date',
  clearFiltersLabel: 'Clear filters',

  defaultMedtechName: 'MedTech',
  medtechRoleLabel: 'Medical Technologist',
  totalLabel: 'Total',
  headerTitle: 'Reports',
  headerSubtitle: 'Finished samples, read-only',

  offlineCachedDataNotice: 'Offline — showing cached data',

  getSampleUnitLabel: pluralizeSample,

  getCategoryHeaderSubtitle: (count: number): string =>
    `${count} ${pluralizeSample(count)} · Read-only`,

  getVisibleSampleCountLabel: (visibleCount: number, totalCount: number): string =>
    `${visibleCount} of ${totalCount} samples`,

  getSampleCountLabel: (count: number): string => `${count} ${pluralizeSample(count)}`,

  getReportItemAccessibilityLabel: (sampleUid: string, patientUid: string): string =>
    `Sample ${sampleUid}, patient ${patientUid}`,

  getTotalSamplesAccessibilityLabel: (totalCount: number): string =>
    `${totalCount} finished ${pluralizeSample(totalCount)} in total`,
};
