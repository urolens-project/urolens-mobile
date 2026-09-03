# Push notification navigation audit

Scope: verify tap-to-navigate correctness for both notification types (sample
assignment, supervisor result return), per the Push Notifications epic.
Source: `src/lib/notifications/notificationHandler.ts`, wired into
`app/(medtech)/_layout.tsx`.

## How it works today

`registerNotificationListeners()` attaches two listeners:

- **Received** (app in foreground/background, notification arrives) — triggers
  `synchronize()` so the local DB has the new data before the user taps
  anything. No navigation involved; correct as-is.
- **Response** (user taps the notification) — reads
  `response.notification.request.content.data` and switches on
  `notification_type`:
  - `SAMPLE_ASSIGNED` → `synchronize()` then `router.push('/(medtech)/queue')`.
  - `RESULT_RETURNED` → `router.push(\`/(medtech)/sample/${data.entity_id}\`)`
    if `entity_id` is present, else falls back to `/(medtech)/queue`.
  - anything else (including `notification_type` missing/unrecognized) →
    `router.push('/(medtech)/alerts')`.

## Finding: `RESULT_RETURNED` navigates with the wrong id type — will 404

`sample/[id].tsx`'s `id` route param is the **local WatermelonDB row id**
everywhere else it's used in the app:

- `useQueue.ts:13` maps `id: s.id` (WatermelonDB's own local model id) as a
  field distinct from `serverId: s.serverId` — confirms `id` and `serverId`
  are different values by design.
- `queue.tsx`'s `handleProceed` navigates with `selectedItem.id` (the local id).
- `ImageCaptureScreen.tsx` explicitly names its route param `localSpecimenId`
  when navigating to `sample/[id]`, to distinguish it from the server-side
  `specimenId` also in scope.
- `sample/[id].tsx` loads the record via
  `database.get<Specimen>('specimens').find(specimenId)` — WatermelonDB's
  `.find()` is a local-primary-key lookup, it does not query by `server_id`.

The push notification's `entity_id` comes from the backend payload. The
backend has no knowledge of a device's local WatermelonDB row ids — it can
only identify the specimen/result by its own server-side id. So
`data.entity_id` here is a **server id**, not a local id.

**Consequence**: when a MedTech taps a "result returned" notification, the
resulting `database.get('specimens').find(entity_id)` call will not find a
matching local record (or, worse, could coincidentally match an unrelated
record if id spaces ever collide) and the screen will show the existing
"Sample not found" state — a real, reachable failure on a core Push
Notifications epic path, not just a theoretical edge case.

## Recommended fix (follow-up ticket, not made in this audit)

Before navigating, resolve the local record by server id, then navigate using
its local id — the same pattern already used in `sample/[id].tsx`'s own
`useEffect` subscriptions elsewhere in the app (`Q.where('server_id', ...)`):

```ts
case 'RESULT_RETURNED': {
  if (data.entity_id) {
    const specimen = await database
      .get<Specimen>('specimens')
      .query(Q.where('server_id', data.entity_id))
      .fetch();
    if (specimen[0]) {
      router.push(`/(medtech)/sample/${specimen[0].id}`);
      break;
    }
  }
  router.push('/(medtech)/queue');
  break;
}
```

This requires a local sync/lookup to complete before navigating, and should
handle the case where the record hasn't synced down yet (fall back to queue,
as the existing "no entity_id" branch already does).

## Other observations

- `SAMPLE_ASSIGNED` → `/(medtech)/queue` needs no id resolution and is correct
  as-is.
- The unknown/missing `notification_type` fallback to `/(medtech)/alerts` is
  a reasonable default.
- No test coverage exists for either listener today — tracked separately as
  `test/push-notification-navigation`.
