/** A queued change the server refused, as the Profile screen lists it. */
export interface FailedActionUi {
  id: string;
  /** What the MedTech tried to do, e.g. "Confirm result". */
  title: string;
  /** The sample it was about, when it can be worked out. */
  sampleUid: string | null;
  /** Why it didn't go through, in words fit to show. */
  reason: string;
}
