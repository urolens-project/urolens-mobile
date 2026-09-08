# UroLens MVP — Tier 1 Critical Path Test Cases

**Scope:** The 9 workflows in the Tier 1 critical path (Login → Queue → Capture → Upload → Inference → Confirm → Override → Smart Diagnosis → Supervisor Notification). Grounded against the current implementation in `urolens-backend`, `urolens-mobile`, and `urolens-ai-engine` as of 2026-09-08.

**Legend:** **V** = Verification (matches spec/code as built) · **Val** = Validation (real-world fit for a MedTech on the lab floor)

**Known implementation gaps to test against (not assumptions from the SRS):**
- Backend only accepts `image/jpeg` and `image/png` on upload (`ALLOWED_MIME_TYPES` in `image.py`). The SRS/doc claims HEIC/HEIF is accepted and auto-converted — **this is not implemented**. Treat HEIC/HEIF as a negative-path input, not a happy path, until confirmed otherwise.
- AI inference is server-side (`urolens_ai.infer()` called in-process by the backend), not on-device. It's also **best-effort**: if the `urolens_ai` package import fails, `_try_run_inference` silently returns `None` and the upload still succeeds with `ai_findings: null`. That "silent no-op" behavior needs to be a deliberate test case, not a surprise.
- Session idle-timeout is not visible in the auth code reviewed (only a fixed 60-minute JWT expiry via `ACCESS_TOKEN_EXPIRE_MINUTES`). If idle-timeout is a separate mechanism, locate it before writing that sub-case; otherwise the JWT expiry test below stands in for it.

---

## 1. Login (UC 2.1)

**Endpoint:** `POST /api/v1/auth/login` · **Lockout:** 5 failed attempts (`MAX_FAILED_ATTEMPTS = 5`) · **Token TTL:** 60 min (`ACCESS_TOKEN_EXPIRE_MINUTES`)

**Execution status (2026-09-08):** LOGIN-01 through LOGIN-09 (all API-level Verification cases) were automated and executed against the actual FastAPI route in `urolens-backend/tests/integration/test_auth_login.py`, run with `.venv/bin/python -m pytest tests/integration/test_auth_login.py -v`. **All 9 passed.** Real Supabase was not touched — the test double-patches `app.services.auth_service.supabase` and `app.services.audit_logger.supabase` with an in-memory fake so no real account could be locked, no real audit rows written, and no login credentials were needed; password hashing (bcrypt) and JWT signing/verification run for real. A full `tests/` run before and after adding this file shows the same 16 pre-existing, unrelated failures (stale sync calls to the now-async `verify_password` in `test_auth_service.py`, and Supabase-mock shape mismatches in `test_queue_service.py` / `test_image_upload_and_inference.py`) — this change introduced zero regressions. LOGIN-10 and LOGIN-11 are Validation cases (real device, human judgment) and were not executed — they need a physical device/UAT session, not a test run.

| ID | Title | Preconditions | Steps | Expected Result | Type | Result |
|---|---|---|---|---|---|---|
| LOGIN-01 | Successful login returns token + role | Active MedTech account exists | POST `/auth/login` with valid username/password | `200`, response has `access_token`, `role`, `user_id`; audit log entry created (`log_login_success`, async via background task) | V | ✅ PASS |
| LOGIN-02 | Wrong password rejected | Valid username, wrong password | POST `/auth/login` | `401 INVALID_CREDENTIALS`; `failed_attempts` incremented; `log_login_failed` recorded with `user_id` | V | ✅ PASS |
| LOGIN-03 | Unknown username rejected identically to wrong password | Username does not exist | POST `/auth/login` | `401 INVALID_CREDENTIALS` (same code/message as LOGIN-02 — verify no username-enumeration leak via response timing or message diff) | V | ✅ PASS |
| LOGIN-04 | Account locks after 5th failed attempt | Account currently has 4 `failed_attempts`, not locked | POST `/auth/login` with wrong password once more | `401` on this attempt (password check still fails first), `locked_at` is now set on the user row | V | ✅ PASS |
| LOGIN-05 | Locked account rejected even with correct password | Account has `locked_at` set (from LOGIN-04) | POST `/auth/login` with **correct** password | `423 ACCOUNT_LOCKED` — confirms lock check happens after password verification | V | ✅ PASS |
| LOGIN-06 | Inactive account rejected | User row has `is_active = false` | POST `/auth/login` with correct credentials | `403 ACCOUNT_INACTIVE` | V | ✅ PASS |
| LOGIN-07 | Successful login resets failed-attempt counter | Account has 2–4 failed attempts, not locked | POST `/auth/login` with correct credentials | `200`; `failed_attempts` reset to 0, `locked_at` cleared | V | ✅ PASS |
| LOGIN-08 | Logout closes session and is audited | Logged-in session with valid token | POST `/auth/logout` with bearer token | `204`; session `is_active` closed; `log_logout` entry created | V | ✅ PASS |
| LOGIN-09 | Expired JWT rejected on subsequent request | Token issued >60 min ago | Call any authenticated endpoint (e.g. `/queue/pending`) with expired token | `401`, request rejected before reaching route logic | V | ✅ PASS |
| LOGIN-10 | Lab-floor usability: time-to-login under load | Fresh app install, real device | MedTech logs in cold (app not backgrounded) | Login completes fast enough not to stall bench work — capture actual seconds and compare against team's target (SRS doesn't fix a number for login specifically; ≤3s UI-load NFR is the closest anchor) | Val | ⏳ Not executed (needs real device/UAT) |
| LOGIN-11 | Error message clarity | Any failed-login case above | Observe the mobile-rendered error for LOGIN-02/04/05/06 | MedTech can tell *why* they're blocked (wrong password vs. locked vs. inactive) without reading raw error codes | Val | ⏳ Not executed (needs real device/UAT) |

---

## 2. Sample Queue View (UC 2.2)

**Mechanism:** Local-only read against WatermelonDB `specimens` table (`useQueue.ts`), filtered to `status IN (ASSIGNED, IN_QUEUE)`. Requires a prior sync to be populated — this is not a live server call.

**Execution status (2026-09-08):** QUEUE-02 through QUEUE-07 were automated in `tests/unit/useQueue.test.ts` (extends the existing suite) and run with `npx jest tests/unit/useQueue.test.ts`. **All 8 new assertions pass** (QUEUE-04 counts as 4: one per priority bucket). Full mobile suite before/after: **235/235 pass** (up from a 227-test baseline), zero regressions. QUEUE-03/04/05 uncovered a real gap in the *test infrastructure*, not the app: the existing WatermelonDB jest mock only stubbed `Q.where`/`Q.oneOf` — `Q.sortBy`/`Q.gte`/`Q.lte` were never mocked, so the `DATE`, `LATEST`, and `EARLIEST` filters had never actually been exercised by a test before (they would have thrown `Q.sortBy is not a function` if they had been). Extending the mock and asserting on the actual clauses built confirms `buildQuery()` itself is correct — this closes that blind spot rather than finding an app bug. QUEUE-01 and QUEUE-08 were not executed: QUEUE-01's real precondition (specimens actually landing in local WatermelonDB via sync) is a `syncManager`/pull-endpoint concern, not `useQueue` logic — see note below; QUEUE-08 is a Validation case requiring a real device/UAT.

| ID | Title | Preconditions | Steps | Expected Result | Type | Result |
|---|---|---|---|---|---|---|
| QUEUE-01 | Assigned samples appear after sync | MedTech has ≥2 specimens assigned server-side, device has synced at least once | Open queue screen | All `ASSIGNED`/`IN_QUEUE` specimens for this MedTech render with patient name, sample UID, received time, priority | V | ⏳ Not executed — depends on the sync pull path (`syncManager`/backend), not `useQueue` itself; `useQueue`'s half of this (render whatever's in local DB) is covered by the pre-existing "populates items" test |
| QUEUE-02 | Empty queue state | MedTech has 0 assigned specimens | Open queue screen | Empty-state UI shown, not a blank screen or crash | V | ✅ PASS |
| QUEUE-03 | Filter: DATE (today only) | Specimens exist with `received_at` both today and prior days | Apply `DATE` filter | Only today's specimens shown, sorted by `received_at` desc | V | ✅ PASS |
| QUEUE-04 | Filter: PRIORITY buckets (HIGH/NORMAL/LOW/ROUTINE) | Specimens exist across all 4 priority levels | Apply each single-priority filter (`HIGH`, `NORMAL`, `LOW`) in turn | Only matching-priority specimens shown per filter | V | ✅ PASS (all 4 buckets) |
| QUEUE-05 | Filter: LATEST vs EARLIEST sort | ≥3 specimens with distinct `received_at` | Toggle `LATEST` then `EARLIEST` | Sort order reverses correctly; no items dropped between the two views | V | ✅ PASS |
| QUEUE-06 | Queue reflects a specimen that changed status elsewhere | Specimen was `ASSIGNED`, then rejected/confirmed on another device or by another actor | Trigger sync, reopen queue | Specimen drops out of the `ASSIGNED/IN_QUEUE` view once its status moves past those two states | V | ✅ PASS (verified at the reactive-emission layer; a real cross-device sync round-trip is still worth one manual pass) |
| QUEUE-07 | Stale queue before first sync | Fresh install, no sync run yet | Open queue screen with no local data | Empty state (not an error) — confirms this screen degrades gracefully when never-synced, distinct from QUEUE-02's "synced but genuinely empty" | V | ✅ PASS (same code path as QUEUE-02 — the hook has no notion of "never synced" vs. "synced empty," confirmed by reading `useQueue.ts`, not a gap) |
| QUEUE-08 | Real-triage scannability | Realistic queue of 15–20 mixed-priority specimens | MedTech is asked to pick the next sample to process | MedTech can identify the correct next sample (by priority/time) within a few seconds, without needing to open individual entries | Val | ⏳ Not executed (needs real device/UAT) |

---

## 3. Microscopy Image Capture (SRS §2 technical workflow #1)

**Mechanism:** `expo-camera` native capture in `ImageCaptureScreen.tsx`; EXIF strip + resolution check in `imageUtils.ts` before local storage. Backend independently enforces `640×480` minimum and JPEG/PNG only — capture-side validation should match the backend's actual accepted set, not the SRS's broader claim.

**Re-verified 2026-09-08.** Two corrections from the original draft:
- **CAP-05 is resolved, not open.** `imageUtils.ts::processCapture` (the live-camera path) hardcodes `outputMime = 'image/jpeg'` regardless of input — the code comment confirms this is deliberate ("Expo Camera always produces JPEG"). Expo's camera API captures via its own AVFoundation/Camera2 pipeline, not the OS's native Camera app, so it never produces HEIC in the first place — the primary MedTech workflow (mount-and-shoot) never touches the HEIC question. The only path that *could* see HEIC is the gallery-picker fallback (`processPickerAsset`), and that path already re-encodes any non-PNG input to JPEG via the same `ImageManipulator` call — confirmed by the pre-existing `imageUtils.test.ts` test `"falls back to image/jpeg for unsupported mimeType"`. So HEIC is a non-issue end-to-end, not a gap.
- **`useImageRetake.ts`/`useImageRetake.test.ts` are dead code.** `grep` for `useImageRetake` usage outside its own file and test returns nothing — `ImageCaptureScreen.tsx` has its own inline state machine (`phase`, `handleCapture`, `handleUseImage`, `handleRetapTap`, `handleDiscardConfirm`) that duplicates/supersedes it. The hook's passing tests were not evidence that the live screen behaves correctly — hence the new component-level tests below.

**Execution status (2026-09-08):** CAP-01, CAP-02, CAP-03 were automated in a new `tests/unit/features/ImageCaptureScreen.test.tsx` (screen-level, complementing the pre-existing `tests/unit/imageUtils.test.ts` which already fully covers CAP-02's resolution-guard logic and CAP-04/CAP-05's format-handling logic at the function level). **All 7 pass.** Full mobile suite: **242/242 pass** (up from the 235-test baseline after §2), zero regressions. This required adding `testID="capture-button"`, `testID="retake-button"`, and `testID="use-image-button"` to `ImageCaptureScreen.tsx` — those three controls are icon-only or otherwise lacked an accessible name/role for `getByRole` to target (a real, if minor, accessibility gap: a screen reader user would also struggle to identify the capture button by voice-over alone, worth a UX follow-up). CAP-04's EXIF strip is verified only by proxy (the code path that would strip it is called) — real EXIF removal is delegated to the native `ImageManipulator` re-encode and cannot be verified without a real device and a real photo carrying GPS/orientation tags; CAP-06/CAP-07 remain Validation cases needing the same.

| ID | Title | Preconditions | Steps | Expected Result | Type | Result |
|---|---|---|---|---|---|---|
| CAP-01 | Successful capture stores image locally before any network call | Device + microscope adapter, sample selected | Mount phone on adapter, capture image | Image written to local storage first; capture succeeds fully offline (airplane mode) | V | ✅ PASS (verified: capture → preview transition never calls the API; real device airplane-mode pass still recommended) |
| CAP-02 | Capture below minimum resolution is caught client-side | Camera/device forced or simulated to produce <640×480 | Attempt capture/preview | Rejected locally (or flagged before upload attempt) — verify this happens client-side rather than only surfacing as a 422 after a wasted upload | V | ✅ PASS (function-level in `imageUtils.test.ts`; screen-level surfacing confirmed in `ImageCaptureScreen.test.tsx`) |
| CAP-03 | Preview → retake before commit | Image just captured, on preview screen | Reject the preview without confirming | No local record persisted; camera re-opens cleanly | V | ✅ PASS (both the no-existing-result reset path and the existing-result discard-confirmation path) |
| CAP-04 | EXIF metadata stripped | Capture a real image with EXIF (GPS/orientation) present | Inspect the stored local file / uploaded bytes | EXIF stripped per `imageUtils.ts` — verify no location metadata reaches the backend/storage | V | ✅ PASS by proxy (`imageUtils.test.ts` confirms the strip call happens); ⏳ real EXIF payload check still needs one manual device pass |
| CAP-05 | HEIC/iOS default capture format handled correctly | iOS device set to capture HEIC (default on iOS 14+) | Capture an image | Live camera capture always outputs JPEG (Expo's own pipeline, not the OS default); gallery-picked HEIC is re-encoded to JPEG before upload | V | ✅ PASS — resolved as a non-issue, not a gap (see note above) |
| CAP-06 | Ergonomics with adapter | Physical microscope adapter, real specimen slide | MedTech captures a series of images across a normal shift | Adapter alignment doesn't require repeated recalibration; capture doesn't require unnatural phone positioning | Val | ⏳ Not executed (needs real device/UAT) |
| CAP-07 | Rejected format surfaces a clear retake prompt | Attempt capture that will produce a rejected type/resolution | Observe UI response | MedTech is told to retake immediately, not left on a spinner or a raw error string | Val | ⏳ Not executed (needs real device/UAT) |

---

## 4. Multipart Image Upload

**Endpoint:** `POST /api/v1/images/upload` · form fields `specimen_id` (UUID) + `file` · role: `MEDTECH` only · returns `201` with `AnalysisResultResponse`. Confirmed live in `main.py` (`src.urolens.api.image`) — no dead-file mismatch this time.

**Execution status (2026-09-08):** UPL-01, 03, 04 already had integration tests in the pre-existing `tests/integration/test_image_upload_and_inference.py` — but **3 of those 9 tests were silently broken** by two bugs in the test harness itself, not the app:
1. `conftest.py`'s `_make_sb_mock` always replayed the *seeded* static rows for any `.execute()` call, including `.insert()`. A fresh insert into an empty seeded table therefore looked identical to "insert returned no data," tripping the app's own defensive guard and turning a valid upload into a fake `422`. Fixed by making the mock track the last op (`select`/`insert`/`update`) and echo back the actual insert/update payload — matching real Supabase's default "return the row you just wrote" behavior.
2. The AI-inference test mocked `.to_dict()` on the fake inference result, but `_try_run_inference()` reads `.particles` directly (the code was refactored after the test was written). `MagicMock`'s default `__iter__` (`iter([])`) silently turned this into an empty findings dict instead of an error, so the test looked like it was asserting something when it was actually asserting against dead mock wiring. Fixed to set `.particles` directly.

With those fixed, all 9 original tests pass, and I added 5 more covering UPL-02, 05, 06, 07, 09 (UPL-08 was already an implicit assertion inside the original happy-path test — a fresh specimen with no existing `analysis_results` row takes the insert branch). **All 14 pass.** Full backend regression: **49 passed, 13 failed** (down from the 16-failure baseline — these 3 fixes reduced total failures; the remaining 13 are the same pre-existing, unrelated failures from before this work: stale sync calls to async `verify_password` in `test_auth_service.py`, and Supabase-mock shape mismatches in `test_queue_service.py`). UPL-10 is a Validation case needing a real device on real lab Wi-Fi — not executed.

| ID | Title | Preconditions | Steps | Expected Result | Type | Result |
|---|---|---|---|---|---|---|
| UPL-01 | Valid JPEG upload succeeds | Valid specimen_id, JPEG ≥640×480, authenticated MedTech | POST `/images/upload` | `201`; response `status = "PENDING_CONFIRM"`; previous `ACTIVE` image for the specimen (if any) flipped to `REPLACED` | V | ✅ PASS (after fixing the harness bug above — was a false failure, not an app bug) |
| UPL-02 | Valid PNG upload succeeds | Same as UPL-01 but PNG | POST `/images/upload` | `201`, same behavior as UPL-01 | V | ✅ PASS |
| UPL-03 | Unsupported format rejected | File with `content_type` outside `{image/jpeg, image/png}` (e.g. `image/gif`, `video/mp4`) | POST `/images/upload` | `422 INVALID_IMAGE_FORMAT`; no `images` row created | V | ✅ PASS |
| UPL-04 | Below-minimum resolution rejected | Valid JPEG but <640×480 | POST `/images/upload` | `422 INVALID_IMAGE_RESOLUTION` | V | ✅ PASS |
| UPL-05 | Corrupt/unreadable file rejected | Bytes that PIL cannot open (truncated file, renamed non-image) | POST `/images/upload` with correct `content_type` header but garbage bytes | `422 INVALID_IMAGE_FORMAT` ("Cannot read image file") | V | ✅ PASS |
| UPL-06 | Non-MedTech role rejected | Valid request but caller is RECEPTIONIST/SUPERVISOR token | POST `/images/upload` | `403` from `RequireRole([MEDTECH])` | V | ✅ PASS (tested with RECEPTIONIST) |
| UPL-07 | Re-upload for same specimen supersedes prior image | Specimen already has an `ACTIVE` image + existing `analysis_results` row | Upload a second valid image for the same `specimen_id` | Old image → `REPLACED`; existing `analysis_results` row **updated in place** (not duplicated) with new `image_id`, status reset to `PENDING_CONFIRM`, `ai_findings`/`flagged_anomalies` cleared to `{}` | V | ✅ PASS (verified via response `result_id` matching the pre-existing row's id, confirming UPDATE not INSERT) |
| UPL-08 | First upload for a specimen creates the analysis_results row | Specimen has no prior `analysis_results` row | Upload a valid image | New `analysis_results` row inserted with `model_version = "mvp-v1.0"` | V | ✅ PASS (covered by UPL-01's own test setup: empty seeded `analysis_rows` forces the insert branch) |
| UPL-09 | Storage failure doesn't block record creation | Simulate Supabase Storage upload failure (bad bucket/network blip) | POST `/images/upload` | Upload still returns success per current code (storage failure only logs a warning, doesn't raise) — **confirm this is the intended behavior**, since it means an `images` row can point at a storage key with no actual file | V | ✅ PASS (confirmed as-built: still `201` when storage throws — flagging this as a product decision to sign off on, not just a test result, since a MedTech would see a successful upload with no retrievable image behind it) |
| UPL-10 | Upload latency on realistic file size | 8–12MP JPEG (per NFR-COMPAT-001 min. camera spec) | POST `/images/upload` over a typical lab Wi-Fi connection | Completes within a time the MedTech perceives as acceptable during peak sample volume (tie to NFR-PERF targets where applicable) | Val | ⏳ Not executed (needs real device/UAT) |

---

## 5. Backend AI Inference

**Mechanism:** `_try_run_inference()` in `image.py` — calls `urolens_ai.infer()` in a thread, **best-effort**: any exception (including `ImportError` if the package isn't installed) is swallowed and returns `None`. Findings persisted back to `analysis_results.ai_findings`; failures don't affect the `201` upload response.

**Execution status (2026-09-08):** INF-01 and INF-03 were already covered by the two upload tests fixed in §4. Added 4 more tests to `test_image_upload_and_inference.py` for the rest: dash→underscore normalization (a real gap in the old test — `FAKE_AI_FINDINGS` had no dashed keys, so a regression here would have gone undetected), INF-04 (real `ImportError` path, distinct from INF-03's runtime-exception path), INF-05 (asserts the DB persistence call itself carries the right payload, via a spy on `.update()`, independent of the HTTP response), and INF-06 (persistence call forced to raise, confirming the response is unaffected). **All pass — 18/18 in this file.** Full backend regression: **53 passed, 13 failed** (same pre-existing, unrelated failures as before; up from 49 passed after §4, zero regressions). `urolens_ai` is genuinely installed in this venv (confirmed via direct import), so INF-01/03/04/05/06 all exercise real conditional logic, not a permanently-skipped branch. INF-02 (≤10s budget) isn't meaningfully testable against a mock — mocked calls are instant by construction — so it needs a real timing run against the actual `urolens-ai-engine` model, not this suite. INF-07 doesn't need a test run: it's a documented architecture finding (see the "Known implementation gaps" note at the top of this doc), not something pytest can confirm or refute. INF-08 remains a Validation case needing a real specimen.

| ID | Title | Preconditions | Steps | Expected Result | Type | Result |
|---|---|---|---|---|---|---|
| INF-01 | Successful inference populates findings on the same response | `urolens_ai` installed and functional, valid image uploaded | POST `/images/upload` | Response `ai_findings` is a non-null dict; particle class names use underscores (e.g. `epithelial_cells`), not the model's native dashes | V | ✅ PASS (base case + a dedicated dashed-key normalization test — the original test's fixture couldn't have caught a regression here) |
| INF-02 | Inference completes within performance budget | Same as INF-01 | Time the upload→findings round trip | ≤10s total for the pipeline (NFR-PERF-001) | V | ⏳ Not executed — needs real model timing, not a mock |
| INF-03 | Inference failure does not fail the upload | Force `urolens_ai.infer()` to raise (bad/corrupt model artifact, OOM, etc.) | POST `/images/upload` | Still `201`; `ai_findings: null` in response; warning logged with the specimen/result context; MedTech is not blocked from proceeding | V | ✅ PASS |
| INF-04 | Package absent → silent no-op (regression guard) | `urolens_ai` not importable in the runtime | POST `/images/upload` | `201`, `ai_findings: null`, **no exception surfaces to the MedTech** — write this as an explicit test so a future "fix" that makes this loud doesn't silently break the upload contract, and so it's never mistaken for "inference ran and found nothing" | V | ✅ PASS (real `ImportError` simulated, distinct code path from INF-03) |
| INF-05 | Findings persist even if the initial response context is lost | INF-01 conditions | Upload succeeds, then re-fetch the result later (via sync or a result-detail call) | `ai_findings` from the async persistence step (`sb.table("analysis_results").update(...)`) matches what was returned synchronously | V | ✅ PASS (verified via a spy on the `.update()` call itself, not a second HTTP round-trip — the mock has no cross-request store) |
| INF-06 | Findings persistence failure doesn't suppress returned findings | Simulate the post-inference DB update failing | POST `/images/upload` | Response still contains the computed `ai_findings` (returned before the DB write is attempted to fail) even though the row itself wasn't updated — confirms the two failure modes (compute vs. persist) are independently safe | V | ✅ PASS |
| INF-07 | On-device vs. server-side expectation mismatch | N/A — documentation/architecture check | Compare actual behavior (server round-trip required) against NFR-PORT-004 ("core functions run fully offline") | **Expected finding: FAIL as literally specified.** Confirm with the team whether NFR-PORT-004 should be reworded to exclude AI inference, since inference cannot run in airplane mode under the current architecture | V | 📋 Documented finding, not a test run (see top-of-doc gap note) |
| INF-08 | Findings are clinically plausible against physical review | Real specimen slide with known particle content | Compare AI findings against a MedTech's manual microscopy read of the same slide | Findings are close enough to be a credible starting point for confirmation (not necessarily exact) | Val | ⏳ Not executed (needs real device/UAT) |

---

## 6. Result Confirmation (UC 2.5)

**Endpoint:** `POST /api/v1/results/{result_id}/confirm` · body `{notes: Optional[str]}` · live implementation: `app/api/results.py` → `app/services/result_service.py::confirm_result`.

**Re-verified 2026-09-08 — corrected from the original draft, which was grounded on `src/urolens/api/results.py` / `ResultConfirmationService`. That file is NOT wired into `main.py` (its import is commented out there in favor of the old `app.api.results`) and does not run in production. The corrections below replace CONF-01–08 as originally written:**
- **No explicit role gate.** The route depends only on `get_current_user` (any authenticated role), not `RequireRole([MEDTECH])`. Authorization is enforced *implicitly*, by comparing `specimens.medtech_id` to the caller's `user_id` — so in practice only the assigned MedTech can confirm, but there is no defense-in-depth role check backing that up.
- **Status precondition is explicit and testable:** the target `analysis_results.status` must be exactly `"PENDING_CONFIRM"`, or the call raises `409 Conflict` with `"Result cannot be confirmed in status '{status}'."` — this resolves CONF-05 definitively: re-confirming is **not** idempotent, it's a hard 409.
- **Success transitions status to `"PENDING_SUPERVISOR_APPROVAL"`** (not `PENDING_REVIEW`), and sets `confirmed_by`, `confirmed_at` (Asia/Manila, UTC+8, via `_PHT` — not UTC), `confirmation_notes` from the request body.
- **Smart Diagnosis is NOT triggered by this endpoint at all.** There is no call to any diagnosis service, `SmartDiagnosisService`, or `smart_diagnosis_outputs` insert anywhere in `confirm_result`. The original CONF-02/CONF-06 (Epic 7 "triggers Smart Diagnosis synchronously," "EngineErrorLog on failure") describe the *unwired* `src/urolens` service, not what actually runs — see §8 below for what's really happening.

**Execution status (2026-09-08):** CONF-01 through CONF-06 automated in a new `tests/integration/test_result_confirmation_override.py` (24 tests total, shared with §7/§8). **All pass.** No production bugs found in the confirm path itself — it behaves exactly as re-verified above.

| ID | Title | Preconditions | Steps | Expected Result | Type | Result |
|---|---|---|---|---|---|---|
| CONF-01 | Confirm a result in PENDING_CONFIRM | `analysis_results` row exists, `status = "PENDING_CONFIRM"`, caller's `user_id` matches `specimens.medtech_id` for that result's specimen | POST `/results/{result_id}/confirm` with `{"notes": "..."}` | `200`; response `status = "PENDING_SUPERVISOR_APPROVAL"`, `confirmed_at` is a PHT (UTC+8) ISO timestamp | V | ✅ PASS |
| CONF-02 | Confirming does not create a Smart Diagnosis record | Same as CONF-01 | POST `/confirm`, then query `smart_diagnosis_outputs` for this `result_id` | **No new row is created by this call.** If a row already exists it's because upload-time preview logic wrote it elsewhere — confirm this is the actual (if unintended) contract before treating it as a defect | V | ✅ PASS (confirmed as-built; still worth a product sign-off) |
| CONF-03 | Caller who doesn't own the specimen is rejected | Valid `PENDING_CONFIRM` result, caller's `user_id` ≠ `specimens.medtech_id` (any role, including another MEDTECH) | POST `/confirm` | `403` `"Result does not belong to your specimens."` | V | ✅ PASS |
| CONF-04 | Confirming a nonexistent result | Random/invalid `result_id` | POST `/confirm` | `404` `"Analysis result not found."` | V | ✅ PASS |
| CONF-05 | Re-confirming an already-confirmed result | Result already at `PENDING_SUPERVISOR_APPROVAL` (or any non-`PENDING_CONFIRM` status) | POST `/confirm` again | `409 Conflict` — confirmed non-idempotent by reading `confirm_result`'s status check | V | ✅ PASS |
| CONF-06 | Confirmation notes are optional | Valid `PENDING_CONFIRM` result | POST `/confirm` with `{}` (no `notes` key) | `200`; `confirmation_notes` stored as `null`, no validation error | V | ✅ PASS |
| CONF-07 | Confirmation requires secondary confirmation in the UI | Mobile confirm screen, result ready to confirm | Tap "Confirm Result" | A second explicit confirmation step is required before the API call fires (NFR-USE-007) | V | ⏳ Not executed (needs real device/UAT) |
| CONF-08 | MedTech has enough evidence to confirm responsibly | Real AI findings + image on the confirm screen | MedTech reviews screen before confirming | AI output, image, and any flags are all visible together — MedTech isn't confirming "blind" | Val | ⏳ Not executed (needs real device/UAT) |

---

## 7. Manual Override (UC 2.6)

**Endpoint:** `POST /api/v1/results/{result_id}/override` · live implementation: `app/api/results.py` → `app/services/result_service.py::override_parameter`. Body (`OverrideParameterRequest` in `app/schemas/results.py`): `parameter_name` (str, **no length/blank constraint**), `original_ai_value` (`float | int`, **no `ge=0` constraint**), `corrected_value` (`float | int`, same), `rationale` (str, **required — no default**).

**Re-verified 2026-09-08 — corrected from the original draft (same wrong-file issue as §6).** Real differences from what was first documented:
- Field is `parameter_name`, not `parameter`.
- `rationale` is **required** with no default — omitting it is a `422`, not a silent `"No rationale provided"`.
- **No validation at all** on blank `parameter_name` or negative values — the schema has no `field_validator` and no `Field(ge=0)`. OVR-03/OVR-04 as originally written are wrong; blank names and negative numbers are both accepted by the schema layer.
- **No explicit role gate** — `Depends(get_current_user)`, any role. Ownership is enforced only for non-`SUPERVISOR` callers (`role.upper() != "SUPERVISOR"` skips the check entirely for supervisors); everyone else must own the specimen via `medtech_id == user_id` or gets `403`.
- Values are stored as `int(float(original_ai_value))` / `int(float(corrected_value))` — **`int()` truncates toward zero, it does not round.** `5.7` is stored as `5`, and `-1.9` would store as `-1` (and would be accepted, per the point above).
- The response (`OverrideParameterResponse`) only echoes back `override_id`, `result_id`, `parameter_name` — **not** `corrected_value`, `original_ai_value`, `rationale`, or attribution/timestamp fields. Those are only visible later via the supervisor's full-result view.
- This endpoint is still the freshest code in the repo (recent commits: `patient_uid` resolution, storing values as INTEGER, accepting numeric input, column rename `overridden_by`→`medtech_id`) — still the highest-priority surface to test, the specifics below are just corrected.

**Execution status (2026-09-08):** All 13 automatable cases ran in `test_result_confirmation_override.py`. **OVR-11 and OVR-12 found two real, previously-undetected production bugs** — both fixed in this pass:
1. **`app/services/result_review_service.py::get_full_result`** computed the lab-request-fallback `patient_uid` into a local variable but the final `return` statement read `spec.get("patient_uid")` again, discarding it — so the fallback added by commit `9b7ea98` never actually reached the API response. Fixed to `"patient_uid": patient_uid or spec.get("patient_uid")`.
2. **`app/schemas/results.py::ManualOverrideItem`** typed `original_ai_value`/`corrected_value` as `str`, but the DB stores them as `int` (per the override service's `int(float(x))` cast) — so `GET /api/v1/results/{result_id}` would **crash with a 500 `ResponseValidationError`** for any result that had a manual override at all, which is exactly the case a supervisor most needs to review. Fixed to `Union[float, int]` matching the actual stored type.

Both were caught by tests written to confirm two *already-landed* fixes (commits `9b7ea98`, `3cc6738`) actually worked end-to-end — they hadn't been exercised through the full upload→override→supervisor-view path before. Full backend regression after both fixes: **77 passed, 13 failed** (same pre-existing unrelated failures as every prior section; up from 53, zero new regressions).

| ID | Title | Preconditions | Steps | Expected Result | Type | Result |
|---|---|---|---|---|---|---|
| OVR-01 | Valid override is recorded | `analysis_results` row exists, caller owns the specimen (or is SUPERVISOR) | POST `/override` with `parameter_name`, `corrected_value`, `original_ai_value`, `rationale` | `200`; response has `override_id`, `result_id`, `parameter_name` (only) | V | ✅ PASS |
| OVR-02 | Missing rationale is rejected | Same as OVR-01, omit `rationale` | POST `/override` | `422` — `rationale` has no default in `OverrideParameterRequest` | V | ✅ PASS |
| OVR-03 | Blank parameter_name is currently accepted (gap, not a guard) | `parameter_name: ""` or `"   "` | POST `/override` | `200` — no rejection exists at the schema or service layer; flag this as a validation gap worth closing, not a passing negative-path test | V | ✅ PASS (confirms the gap is real) |
| OVR-04 | Negative values are currently accepted (gap, not a guard) | `corrected_value: -1`, `original_ai_value: -1` | POST `/override` | `200`, stored as `-1` — no `ge=0` constraint exists; same flag as OVR-03 | V | ✅ PASS (confirms the gap is real) |
| OVR-05 | Integer values sent as numbers are accepted | `corrected_value: 5` (int) | POST `/override` | `200` — `Union[float, int]` accepts both; matches the recent "accept number values" fix | V | ✅ PASS |
| OVR-06 | Fractional values are truncated, not rounded | `corrected_value: 5.7` | POST `/override`, then inspect the stored `manual_overrides` row | Stored value is `5` (`int(float(5.7))` truncates) — **confirm with the team whether truncation is the intended contract**, since a MedTech entering "5.7" and having it silently become "5" (not "6") could misrepresent a corrected count | V | ✅ PASS (behavior confirmed; product decision still open) |
| OVR-07 | Multiple parameters overridden on the same result | Result exists | POST `/override` twice with different `parameter_name` values | Both rows inserted independently in `manual_overrides`, neither overwrites the other | V | ✅ PASS |
| OVR-08 | Supervisor can override without owning the specimen | Valid override body, caller is SUPERVISOR, specimen assigned to a *different* MedTech | POST `/override` | `200` — ownership check is explicitly skipped for `role == "SUPERVISOR"` | V | ✅ PASS |
| OVR-09 | Non-owning MedTech is rejected | Valid override body, caller is MEDTECH but not the specimen's assigned `medtech_id` | POST `/override` | `403` `"Result does not belong to your specimens."` | V | ✅ PASS |
| OVR-10 | Overriding a nonexistent result | Random/invalid `result_id` | POST `/override` | `404` `"Analysis result not found."` | V | ✅ PASS |
| OVR-11 | patient_uid resolves correctly on the resulting record | Specimen's `patient_uid` is empty, but `lab_request_id` is set (per commit `9b7ea98`) | Override a parameter, then fetch `GET /api/v1/results/{result_id}` as SUPERVISOR | `patient_uid` in `FullResultDetail` is populated via the `lab_requests` → `patients` fallback, not null | V | 🐛→✅ FIXED (was returning empty/null — see note above) |
| OVR-12 | Override list returns in deterministic chronological order | ≥3 overrides exist on one result, inserted out of timestamp order | `GET /api/v1/results/{result_id}` as SUPERVISOR, inspect `manual_overrides` | Ordered by `overridden_at` ascending — confirmed by the `.order("overridden_at")` clause in `result_review_service.get_full_result`, matching commit `3cc6738` | V | 🐛→✅ FIXED (ordering itself was correct, but the endpoint 500'd before ever returning it — see schema bug above) |
| OVR-13 | Override workflow matches real disagreement flagging | MedTech disagrees with one specific AI count among several | Walk through override entry on the mobile UI | Entry point is obvious from the AI findings screen (not buried); rationale field feels natural to fill, not like paperwork | Val | ⏳ Not executed (needs real device/UAT) |

---

## 8. Smart Diagnosis Generation (UC 3.1)

**Re-verified 2026-09-08 — corrected.** The original draft described a two-stage generation (upload preview + formal confirm-time record via `SmartDiagnosisService`/`EngineErrorLog`). Tracing the code that's actually wired into `main.py` shows only **one** generation point is live:

- **Generation:** `_try_run_smart_diagnosis()` in `src/urolens/api/image.py`, run once at upload time (§5), best-effort (any exception is swallowed, logged, returns `None`). Writes to `analysis_results.smart_diagnosis` as `{gout: {...}, glomerulonephritis: {...}, nephrolithiasis: {...}, no_significant_indicators}`. **Confirming a result does not call this again or write anywhere else** — `result_service.confirm_result` (§6) has no diagnosis-related code at all.
- **The `smart_diagnosis_outputs` table exists in the schema and is read** by both `result_service.get_smart_diagnosis()` and `result_review_service.get_full_result()` as the "authoritative" source, checked *before* falling back to the upload-time JSONB — but nothing in the currently-registered routers writes to it. In this build it should be expected to be **empty for every result**, making the fallback path the one actually exercised. If a supervisor screen or another team's script populates it directly, that's a separate, unverified write path — don't assume it happens as a side effect of the mobile confirm flow.
- **Access:** `GET /api/v1/results/{result_id}/smart-diagnosis` is **SUPERVISOR-only** (`_supervisor` dependency in `app/api/results.py`) — this is not an endpoint the MedTech mobile app calls. Whatever the MedTech sees pre-confirm comes from the `smart_diagnosis` field already present on the upload response (§5), not a second fetch.
- Field names in the live fallback path: `gout_score`/`gn_score`/`nephro_score`, matching the SDD (confirmed correct) — but note `app/schemas/results.py::EvidenceMap` still defines unused `gout`/`uti`/`tricho` list fields that no code path actually returns; it's dead/misleading schema, not a contract.

**Execution status (2026-09-08):** SD-02 through SD-07 automated in `test_result_confirmation_override.py` (SD-01 duplicates INF-01, already executed in §5). **All pass**, no additional bugs found beyond the two fixed in §7 (the smart-diagnosis fallback path shares `get_full_result`'s `spec`/`ar` plumbing but not the buggy `patient_uid` line). SD-08 remains a Validation case needing a real specimen.

| ID | Title | Preconditions | Steps | Expected Result | Type | Result |
|---|---|---|---|---|---|---|
| SD-01 | Upload-time generation populates the preview | AI findings computed successfully at upload (§5, INF-01) | POST `/images/upload` | Response `smart_diagnosis` populated in the same call, before any confirmation | V | ✅ PASS (see §5, INF-01) |
| SD-02 | Confirming a result does not touch Smart Diagnosis (regression guard) | Result confirmed (CONF-01) | POST `/confirm`, then query `smart_diagnosis_outputs` for this `result_id` | Still no row from this action — write this as an explicit guard so a future change that silently starts writing here is a deliberate decision, not an untested side effect | V | ✅ PASS |
| SD-03 | Supervisor smart-diagnosis endpoint falls back to the upload-time JSONB | `smart_diagnosis_outputs` has no row for this result (expected default state), but `analysis_results.smart_diagnosis` is populated from upload | `GET /results/{result_id}/smart-diagnosis` as SUPERVISOR | `200`, `status = "ATTACHED"`, scores sourced from the fallback branch of `get_smart_diagnosis()` | V | ✅ PASS |
| SD-04 | No data anywhere returns FLAGGED_UNAVAILABLE, not an error | Neither `smart_diagnosis_outputs` nor `analysis_results.smart_diagnosis` has data (e.g. inference failed at upload, INF-03) | `GET /results/{result_id}/smart-diagnosis` as SUPERVISOR | `200`, `{"result_id": ..., "status": "FLAGGED_UNAVAILABLE"}` — not suppressed or a 404/500 | V | ✅ PASS |
| SD-05 | Non-supervisor cannot call the smart-diagnosis endpoint | Valid result, caller is MEDTECH | `GET /results/{result_id}/smart-diagnosis` | `403` | V | ✅ PASS |
| SD-06 | All-LOW / no-significant-indicators path | Upload-time findings with no flagged particles | POST `/images/upload`, then `GET /smart-diagnosis` as SUPERVISOR | `no_significant_indicators = true`; individual scores reflect LOW | V | ✅ PASS |
| SD-07 | Field names match SDD | Any generated diagnosis | Inspect the `GET /smart-diagnosis` response | Uses `gout_score`/`gn_score`/`nephro_score` — never `uti_score`/`tricho_score` | V | ✅ PASS |
| SD-08 | Diagnosis is a credible clinical aid | Real specimen with known suspected condition | Compare Smart Diagnosis output against known clinical context | Output is directionally consistent enough to be useful as a supervisor-review aid, not a source of false reassurance | Val | ⏳ Not executed (needs real device/UAT) |

---

## 9. Supervisor Notification of Review Outcome (UC 3.4)

**Endpoints:** `POST /api/v1/results/{result_id}/approve`, `/return`, `/escalate` (supervisor-only). MedTech-side receipt of these decisions needs to be traced through `NotificationService` — confirm the actual notify-MedTech call exists for each outcome before testing it as a given.

| ID | Title | Preconditions | Steps | Expected Result | Type |
|---|---|---|---|---|---|
| SUP-01 | MedTech notified on approval | Result confirmed by MedTech, now pending supervisor review | Supervisor calls `/approve` | MedTech receives an in-app notification referencing this specific result; confirm this notify path actually exists in `notification_service.py` — don't assume parity with the supervisor-facing notifications already confirmed in Epic 7 | V |
| SUP-02 | MedTech notified on return-for-correction | Same precondition | Supervisor calls `/return` with a `reason` | MedTech notified with the reason visible; result status reflects "sent back," queue reflects it needing action again | V |
| SUP-03 | MedTech notified on escalation | Same precondition | Supervisor calls `/escalate` with `escalation_path` + note | MedTech (and/or the escalation target) notified appropriately | V |
| SUP-04 | Annotation doesn't itself trigger a MedTech notification (unless intended) | Supervisor calls `/annotate` only | Check notification log | Confirm whether annotation alone should notify — if the current code doesn't, decide if that's correct or a gap | V |
| SUP-05 | Non-supervisor cannot approve/return/escalate | Valid result, caller is MEDTECH token | Call any of the three endpoints | `403` | V |
| SUP-06 | Notification arrives in a reasonable window | Any of SUP-01–03 | Time from supervisor action to MedTech-visible notification | Delivered promptly enough to be actionable, not batched/delayed past the point of relevance | Val |
| SUP-07 | Notification doesn't disrupt active work | MedTech mid-capture/mid-override on an unrelated sample when a decision notification arrives | Trigger a supervisor decision on a different sample | Notification is noticeable but non-blocking — doesn't interrupt the in-progress unrelated task | Val |

---

## Execution notes

- Run IDs 1–9 as one continuous chain at least once per test cycle (one specimen, start to finish) in addition to testing each section in isolation — several of the negative-path findings above (INF-07, UPL-09, OVR-06, SUP-01) only matter in the context of the full pipeline.
- Anything marked "confirm actual behavior" above is a known unknown from reading the code, not a documented contract — resolve it by testing before treating either outcome as a defect.
- OVR-06, OVR-09, OVR-10, and INF-04 map directly to the five most recent commits on this branch; run those first.
