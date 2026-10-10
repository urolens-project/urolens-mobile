# Mobile result review: visible bounding boxes

Investigated: 2026-10-07. Implementation added: 2026-10-09. The investigation and original steps below remain as a reference.

## Implementation status

Mobile now displays AI detections and saved reviewer annotations over the sample image. Coordinates use the actual contained image rectangle, including its letterbox offsets. Particle colors, labels, and source indicators distinguish AI boxes from reviewer boxes. Replacing the image resets its dimensions and overlay readiness; retakes clear geometry associated with the previous image while preserving review notes.

The engine returns accepted detections alongside particle counts. The backend stores normalized percentage coordinates in `analysis_results.ai_detections` and returns them, the image identity, and existing reviewer annotations from the result-detail API. Legacy results without stored AI coordinates retain their existing reviewer annotations; a new analysis is needed to obtain AI boxes.

Before running the updated backend, apply migration `0046_analysis_results_ai_detections.py` and install the updated local AI engine package. Restart the backend and reload mobile after setup. The overlay is display-only; drawing and editing boxes remain follow-up work. Automated validation covers the engine output, backend persistence and response mapping, mobile mapping, and image layout. Device-level visual validation is still required, especially for historical web annotations described below. The web repository was left unchanged.

Setup verified on 2026-10-09: the configured backend database is at revision `0046` with the `ai_detections` column present, and the backend virtual environment imports the updated local AI engine. Validation passed: 886 backend tests, 91 focused mobile tests, 56 focused engine tests, mobile type-checking, and lint checks without errors. Other environments still need the migration and updated engine package before starting the updated backend.

## Intended behavior

When a MedTech opens the mobile result-review screen, the Sample Image panel should display the microscopy image with available bounding boxes over the corresponding particles. Boxes should appear automatically, stay aligned as the image changes size, and show a readable particle label. Existing result confirmation, count correction, retake, and refresh behavior should continue to work.

There are two sources to support:

- **Saved reviewer annotations:** existing MedTech or Supervisor boxes returned by the result-detail API. These can be displayed after mobile maps the existing response.
- **AI detections:** boxes produced during analysis, needed for boxes to appear during the first review before anybody has saved an annotation. These require changes to the AI engine's public output and backend persistence/API before mobile can display them.

The initial mobile feature is a display-only overlay. Drawing, moving, deleting, saving boxes, and zoom gestures are separate follow-up work. A count correction does not identify which detected particle to remove, so it should not silently change the box list.

## What the web implements

The web's supervisor screen fetches result details, displays an image, and places an SVG above it. Each saved box becomes a colored rectangle and label. Its box model is `{ id, label, x, y, w, h }`, with coordinates expressed as percentages from 0 to 100.

Relevant web files:

- [Result fetch and annotation save](../../urolens-web/src/features/result-review/api/resultReviewApi.ts)
- [Initialize boxes from the response and pass them to the renderer](../../urolens-web/src/features/result-review/components/MicroscopyImageSection.tsx)
- [Image, SVG rectangles, labels, and drawing controls](../../urolens-web/src/features/result-review/components/AnnotationCanvas.tsx)
- [Supervisor review screen and saving changes before actions](../../urolens-web/src/features/result-review/components/FullResultDetailView.tsx)

Reuse the image-plus-overlay approach, but implement native rendering and use the current API contract. The web expects `image_url`, top-level `spatial_annotations`, and `label`; the current backend returns `imageUrl`, `annotations[]`, and `particleType`. No conversion between these contracts was found in the web API client.

The web also measures its entire canvas container while the image uses `object-contain`. Empty margins can therefore affect alignment. Mobile should anchor coordinates to the actual displayed image area. Historical boxes drawn against a letterboxed web container may already contain that offset; a new mobile renderer cannot reliably reconstruct the original image-relative coordinates without the original viewport information. Check real saved examples visually.

## Current mobile implementation

| Area                                                                                                                                         | Current behavior                                                                                                       | Required change                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Sample route](<../app/(medtech)/sample/[id].tsx>)                                                                                           | Reads specimen/result identifiers and composes `SampleDetailScreen`.                                                   | Keep the route thin; no overlay logic here.                                               |
| [SampleDetailScreen](../src/features/sample/components/SampleDetailScreen.tsx)                                                               | Opens shared `ResultReviewScreen` for a sample with a result. Reports with `readOnly=true` use a separate detail view. | Implement in the shared review screen; report-view image support is a separate extension. |
| [ResultReviewScreen](../src/features/result-confirmation/components/ResultReviewScreen.tsx)                                                  | Combines local result state and server detail; passes only `imageUrl` to `ResultImagePanel`.                           | Pass mapped box data together with image data.                                            |
| [useResultReviewDetail](../src/features/result-confirmation/hooks/useResultReviewDetail.ts)                                                  | Fetches online, maps the DTO, refreshes on connectivity/local revision changes, and isolates data by user.             | Preserve this flow for the expanded detail model.                                         |
| [resultReviewApi](../src/features/result-confirmation/api/resultReviewApi.ts)                                                                | Fetches `GET /results/{resultId}` through the shared authenticated client.                                             | Existing endpoint is sufficient for reviewer annotations.                                 |
| [resultReview.mapper](../src/features/result-confirmation/mappers/resultReview.mapper.ts)                                                    | Maps image URL, identifiers, status, counts, and diagnosis; drops `annotations[]`.                                     | Map reviewer annotation groups and their boxes.                                           |
| [Feature types](../src/features/result-confirmation/types.ts)                                                                                | `ResultReviewDetail` has `imageUrl` but no annotation or box properties.                                               | Add the UI model for boxes and their source metadata.                                     |
| [ResultImagePanel](../src/features/result-confirmation/components/ResultImagePanel.tsx)                                                      | Renders React Native `Image`, uses `contain`, and updates aspect ratio from `onLoad`.                                  | Add a positioned image wrapper and overlay.                                               |
| [Generated API types](../src/types/api.ts)                                                                                                   | Already includes `FullResultDetail.annotations`, `AnnotationItem`, and `SpatialAnnotationItem`.                        | Reuse these DTOs; regenerate only when the backend contract changes.                      |
| [Local result model](../src/db/models/AnalysisResult.ts), [schema](../src/db/schema.ts), and [sync mapper](../src/db/mappers/sync.mapper.ts) | Cache counts/status/image ID, but not reviewer boxes or a durable sample-image file.                                   | An offline overlay needs a separate caching/sync extension.                               |

`ResultImagePanel` currently starts with a 4:3 aspect ratio and learns the real ratio after load. An overlay should wait for successful image loading and usable layout dimensions instead of rendering against that temporary ratio.

## Existing reviewer-box contract

The current API and mobile generated types describe this response structure. The following is an illustrative fragment, not a complete result DTO:

```json
{
  "imageUrl": "<signed image URL>",
  "annotations": [
    {
      "reviewedBy": "<reviewer UUID>",
      "reviewerRole": "MEDTECH",
      "annotationNotes": "Review note",
      "updatedAt": "2026-10-07T00:00:00Z",
      "spatialAnnotations": [
        {
          "id": "box-1",
          "particleType": "erythrocytes",
          "x": 20,
          "y": 30,
          "w": 10,
          "h": 8
        }
      ]
    }
  ]
}
```

`x` and `y` describe the top-left corner; `w` and `h` describe width and height. These are percentages, not 0-to-1 fractions and not pixel coordinates. `annotations[]` retains each reviewer's independent contribution; there is no single top-level box collection to read.

Sources: [backend schemas](../../urolens-backend/src/schemas/result_review.py), [result-detail service](../../urolens-backend/src/services/result_review_service.py), and [review persistence](../../urolens-backend/src/models/result_review.py).

Recommended display policy: show all saved reviewer groups by default, retaining their attribution. Use particle color for classification and source text or stroke treatment to distinguish MedTech and Supervisor. If AI detections are also present, identify them as AI; do not present reviewer boxes as model detections. A display filter can reduce clutter without deleting data.

## Required data work for AI boxes on the first review

The local AI engine already creates detections with `class_name`, confidence, and pixel `bbox=(x1,y1,x2,y2)` in [yolo_engine.py](../../urolens-ai-engine/src/urolens_ai/inference/yolo_engine.py). However:

1. [The public `infer()` function](../../urolens-ai-engine/src/urolens_ai/__init__.py) aggregates detections into counts and returns no detection array.
2. [InferenceResult](../../urolens-ai-engine/src/urolens_ai/schemas/inference.py) contains counts, confidence summaries, dimensions, and timing, but no boxes. A separate `Detection` schema exists, but is not a field on `InferenceResult`.
3. [Backend `_infer()`](../../urolens-backend/src/services/ai_integration_service.py) returns only `inferenceResult.particles`.
4. [AnalysisResult](../../urolens-backend/src/models/analysis_result.py) persists aggregate findings; the current review API exposes no dedicated AI detection coordinates.

Particle counts cannot be used to reconstruct particle positions. To satisfy automatic boxes on a newly analyzed image, implement this sequence:

1. **Expose detections from the engine's public API.** Add a typed detection list to `InferenceResult` and populate it from the same accepted detection set used for counts. Preserve existing count fields and the public `infer()` entry point. Verify class normalization and any confidence filtering produce consistent counts and boxes.
2. **Define one coordinate contract.** Convert pixel `xyxy` into percentage top-left/width/height in the backend, using the dimensions of the exact image used for inference:

   ```text
   x = 100 * x1 / imageWidth
   y = 100 * y1 / imageHeight
   w = 100 * (x2 - x1) / imageWidth
   h = 100 * (y2 - y1) / imageHeight
   ```

   Normalize class names to canonical underscore names. Confirm that orientation, resizing, and any letterboxing have been accounted for before conversion. The engine normalizer uses EXIF orientation handling; keep inference and stored/displayed image orientation identical.

3. **Persist AI boxes with image identity.** Add an appropriate migration and typed storage field/table for detections, tied to `imageId` and analysis/model version. Keep model detections separate from reviewer annotations. Generate stable detection IDs at persistence time so repeated detail requests do not change identity.
4. **Expose them in result detail.** Extend `FullResultDetail` and its service with an explicit detection array and image identity. Suggested new fields are `imageId` and `aiDetections`; these names are proposals, not existing API fields. Include normalized geometry, particle type, and confidence per detection. Use an empty array for a successful analysis with zero detections; keep an unavailable legacy analysis distinguishable from that state.
5. **Handle replacement images.** Replace detection data atomically with a new image's analysis and prevent old detections from being returned for the new image.
6. **Regenerate mobile DTOs.** Run the existing `generate:types` script against the updated backend, then map AI detections to the same rendering geometry used for reviewer boxes while retaining `source: 'AI'` and confidence.
7. **Plan legacy-result behavior.** Previously analyzed results have counts without stored coordinates. Display available reviewer boxes and a truthful unavailable state for missing AI coordinates. Backfilling AI boxes requires authorized re-analysis of the stored image, recording the model version; it cannot be derived from counts.

The image upload response can also be expanded if another screen needs immediate coordinates, but this review screen already loads server detail. The detail endpoint is the primary integration point for this feature.

## Implementation steps in mobile

### 1. Add the UI model and mapper

- Extend `ResultReviewDetail` with annotation groups or a flattened `imageBoxes` collection that preserves attribution.
- Each rendering box should carry `id`, `particleType`, `x`, `y`, `w`, `h`, a stable `renderKey`, and source metadata. Reviewer metadata should include `reviewedBy`, `reviewerRole`, and `updatedAt`; AI metadata can include confidence and image identity once available.
- Flatten `dto.annotations[].spatialAnnotations` in the mapper, treating null/missing box arrays as empty. Construct keys from reviewer identity plus box ID; IDs supplied by different reviewers can collide. Use a separate key namespace for AI detections.
- Preserve unknown particle names with a neutral color and formatted text. Reuse [formatParticleName](../src/features/result-confirmation/lib/findingRows.ts) for generic label formatting.
- Validate that coordinates are finite and width/height are positive. Clip otherwise valid boxes that partially exceed image bounds; skip boxes wholly outside the image or with invalid geometry. The current backend validates non-negative numbers, but does not enforce all percentage boundaries.
- Map DTOs at the existing boundary. Do not copy the web's `label` or snake_case response assumptions into mobile.

### 2. Add a native overlay component

Suggested new file: `src/features/result-confirmation/components/ResultBoundingBoxOverlay.tsx`.

Use absolutely positioned React Native `View` rectangles and `Text` labels. This is sufficient for a static rectangular overlay and uses existing dependencies; the mobile package does not currently declare `react-native-svg` directly. The web's DOM `<svg>` cannot be copied into native JSX.

- Keep the overlay a pure renderer receiving mapped boxes and layout geometry.
- Set the overlay layer to `pointerEvents="none"` so scrolling and existing controls remain usable.
- Use a visible border and a small label background. Keep labels inside the visible image bounds, including boxes at the top/right edge.
- Use particle color tokens and source text; color alone should not carry meaning. Provide an accessible summary/legend with particle and source information instead of exposing every decorative rectangle as a separate control.
- Keep label layout independent of box height so small particle boxes can remain visible.
- Reset image readiness and geometry when the image source changes. Render no overlay for an absent, loading, or failed image.

Suggested constants file: `src/features/result-confirmation/constants/particleAnnotation.constant.ts`. Put display mappings and color-token choices there; use `src/theme` for new colors and layout tokens. Cover canonical `urinary_casts`, not only the web's `casts`, and handle `sperm_cells`, `trichomonas_vaginalis`, and `yeast` as well.

### 3. Anchor geometry to the image

Wrap the `Image` and overlay in one positioned container inside the existing padded content area. The panel header and padding must not be part of the coordinate space.

Use `Image.onLoad` for source dimensions and the wrapper's `onLayout` for available dimensions. For source size `(Iw, Ih)` displayed with `contain` inside `(Cw, Ch)`:

```text
scale = min(Cw / Iw, Ch / Ih)
displayWidth  = Iw * scale
displayHeight = Ih * scale
offsetX = (Cw - displayWidth) / 2
offsetY = (Ch - displayHeight) / 2

left   = offsetX + (x / 100) * displayWidth
top    = offsetY + (y / 100) * displayHeight
width  = (w / 100) * displayWidth
height = (h / 100) * displayHeight
```

The current panel can instead keep its wrapper at the loaded image's aspect ratio, making offsets zero. Still measure the actual wrapper and recompute when its layout changes. Extract projection into a pure helper, suggested file `src/features/result-confirmation/lib/imageBoxGeometry.ts`, for focused verification.

Example: a 1000x500 image inside a 300x300 container displays as 300x150 with a 75-point top margin. A box `{ x: 20, y: 30, w: 10, h: 8 }` must render at `left=60`, `top=120`, `width=30`, `height=12`. Using container percentages directly would put its top at 90 and misalign it.

### 4. Wire the screen and image panel

- Add box props to `ResultImagePanelProps` and pass `detail`'s mapped boxes from `ResultReviewScreen`.
- Preserve image ratio detection and the existing unavailable message; render the overlay only after successful load and layout measurement.
- Display a compact source/particle legend or annotation count when boxes exist. If no coordinates were supplied, keep the image visible without inventing boxes or claiming no particles were detected.
- Derive boxes from the latest detail props rather than initializing a second permanent box state. Refreshed annotations must update even if the image URL is unchanged.
- Use result/image identity for lifecycle resets. The screen currently keys the image panel by image URL; signed URLs can change without the underlying image changing. Once the backend supplies `imageId`, use it to distinguish a replacement image from a refreshed URL.
- Keep `useResultReviewDetail`'s cancellation, user isolation, reconnect, local revision invalidation, and pull-to-refresh behavior. Saved reviewer changes made elsewhere currently require refresh/re-entry/reconnect to be fetched; no live annotation subscription was found.

### 5. Prevent stale annotations after retake

This needs verification before enabling saved reviewer overlays broadly:

- Backend retake reuses the result ID and updates `AnalysisResult.imageId`.
- `ResultReview` stores boxes against `resultId` and reviewer, with no `imageId` field.
- The inspected upload/reset path clears findings, diagnosis, and manual overrides, but no clearing or image-version filtering of `ResultReview.spatialAnnotations` was found.

Recommended backend extension: associate spatial annotations with image identity, and return only boxes belonging to the displayed image. Preserve older annotations as history if needed. An alternative is explicitly invalidating spatial boxes during image replacement while preserving review notes. Define the migration behavior for existing unversioned annotations rather than assuming they belong to the current image.

Clearing local state alone is insufficient: a subsequent detail fetch could return those old result-linked boxes again. Changing only the mobile render key also does not solve this server-data issue.

### 6. Preserve the current connectivity behavior

The current hook stores detail in memory and fetches only online. It may retain a previously loaded detail while offline if its user and local revision still match; reopening without loaded detail cannot recover image/annotation data from WatermelonDB. A signed URL is not a durable offline image cache.

For the first release, support boxes whenever the corresponding image and detail are available, and preserve the existing offline fallback. Do not require a database migration solely for an online overlay.

If reopening images with boxes offline is required later, implement a separate account-scoped image-file cache and annotation metadata store, keyed by result/image version. Extend schema/migrations/sync as needed, invalidate on retake, and follow existing logout/account-isolation behavior. Store image files rather than relying on expired signed URLs.

## Files expected to change during implementation

| File                                                                              | Purpose                                                          |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/features/result-confirmation/types.ts`                                       | Add annotation/source UI models and detail fields.               |
| `src/features/result-confirmation/mappers/resultReview.mapper.ts`                 | Map and validate reviewer boxes; later map AI detections.        |
| `src/features/result-confirmation/components/ResultReviewScreen.tsx`              | Pass image and mapped boxes together.                            |
| `src/features/result-confirmation/components/ResultImagePanel.tsx`                | Own image readiness/layout and compose overlay/legend.           |
| `src/features/result-confirmation/components/ResultBoundingBoxOverlay.tsx` (new)  | Render native rectangles and labels.                             |
| `src/features/result-confirmation/lib/imageBoxGeometry.ts` (new)                  | Project percentage geometry into the displayed image.            |
| `src/features/result-confirmation/constants/particleAnnotation.constant.ts` (new) | Centralize particle display/color mappings.                      |
| `src/theme/colors.ts` and related theme files, if needed                          | Add missing visual tokens.                                       |
| `src/types/api.ts`                                                                | Regenerate after image identity/AI detection contract changes.   |
| `tests/unit/features/resultReview.mapper.test.ts`                                 | Add mapping, attribution, and malformed-coordinate coverage.     |
| `tests/unit/features/ResultReviewScreen.test.tsx`                                 | Verify detail boxes reach the image panel and refresh correctly. |
| New image-panel and geometry tests                                                | Verify loading/error lifecycle and correct placement.            |

For first-review AI boxes, also change engine `schemas/inference.py` and `__init__.py`, backend `ai_integration_service.py`, result storage/migrations, result-detail schemas/service, and corresponding tests. For retake-safe reviewer boxes, extend review storage and image-replacement handling as described above.

Follow the mobile code standards: named interfaces, explicit return types, JSDoc on exports, theme tokens, existing import aliases, API calls in feature modules, mapping at DTO boundaries, and small focused components. Computed rectangle geometry is an appropriate use of dynamic styles. No new API request is needed merely to render existing reviewer boxes.

## Verification and acceptance criteria

### Focused automated checks for the implementation

- Mapper: multiple reviewers, null/empty box arrays, duplicate box IDs across reviewers, unknown particle types, source attribution, invalid numbers, and partially out-of-bounds geometry.
- Geometry: portrait, landscape, letterboxing, edge boxes, zero layout dimensions, and the numeric example above.
- Image panel: hides overlays until load/layout are ready; hides them after image error; resets after image replacement; refreshed box props appear without requiring a new URL.
- Screen/hook: result switches, user changes, refresh, reconnect, and superseded responses cannot attach boxes from another result.
- Backend/engine, when extended: public detections survive persistence and detail retrieval; empty successful detections differ from missing legacy data; retake replaces AI detections and excludes old reviewer geometry.

Run the relevant Jest tests, then the existing `type-check` and `lint` scripts. For example, after implementation:

```text
pnpm test --runInBand tests/unit/features/resultReview.mapper.test.ts tests/unit/features/ResultReviewScreen.test.tsx
pnpm type-check
pnpm lint
```

Add the new geometry/image-panel test paths to the focused test run. Run backend and engine checks if those layers change. None of these implementation checks were run during this documentation-only investigation.

### Device acceptance

- [ ] Opening a review with saved boxes shows labeled rectangles over the intended particles automatically.
- [ ] Opening a newly analyzed image shows AI boxes after the engine/backend work is complete, even when `annotations` is empty.
- [ ] Images with unavailable coordinates still display correctly; boxes are never generated from counts.
- [ ] Portrait/landscape images and screen-size changes keep boxes aligned with the actual image pixels.
- [ ] Labels remain visible at image edges; overlays do not block scrolling, refresh, or result actions.
- [ ] MedTech, Supervisor, and AI sources are distinguishable without relying only on color.
- [ ] Pull-to-refresh updates boxes for the same image.
- [ ] Switching samples/users never shows another result's overlay.
- [ ] A retake cannot display boxes from the previous image, including after a fresh API fetch.
- [ ] Image errors, expired URLs, and offline entry preserve usable existing fallback behavior.
- [ ] Dense detection output remains usable on Android and iOS; measure it before adding an arbitrary display limit.

## Suggested delivery order

1. Implement the mobile mapper and static overlay against existing attributed reviewer annotations, using fixtures to verify placement.
2. Resolve image identity and stale reviewer boxes on retake before shipping that behavior for replacement images.
3. Preserve AI detections through engine/backend/API and regenerate mobile DTOs so the first result review also has boxes.
4. Verify real images and annotations on devices, including retakes and refreshes.
5. Add offline persistence, drawing/editing, or report-view image support only as separately scoped extensions.

The display layer can be developed first, but the user's first-review experience is complete only when actual coordinates reach it. Existing annotations cover previously marked images; preserving AI detections covers newly analyzed images.
