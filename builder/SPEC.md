# TGK 2.0 `/builder` — MP4-to-HTML Demo Generator (Original Build Spec)

This is the original build spec Patrick handed off on 2026-05-07 evening. It's the contract for finishing the studio pipeline. The runtime prompts in this spec are already installed verbatim at [`builder/prompts/v1/*.md`](./prompts/v1/) — see Part 2 of this doc for the canonical text. The architecture wired against it is documented in [`builder/README.md`](./README.md). The acceptance test in Part 3 is the test the build needs to pass before the feature ships.

---

## How to use this document

- **Part 1** is the build instruction — what should be built, where it goes in TGK 2.0, and how to know it's done.
- **Part 2** is the runtime specification — the prompts and contracts that the built feature uses **forever** after it ships. The 6 prompt files at `builder/prompts/v1/*.md` are the verbatim source of truth — do not rewrite or summarize them.
- **Part 3** is the canonical acceptance test — a reference run the build must pass end-to-end.

Where you see `{{DOUBLE_BRACES}}`, infer the value from TGK 2.0's existing conventions.

---

# PART 1 — BUILD INSTRUCTION

## Mission

Add a permanent capability to TGK 2.0's `/builder` page: a user uploads an MP4 (product demo, screen recording, Figma walkthrough), the pipeline produces a self-contained animated HTML file that visually replays the demo, and the user can re-skin the result for different vendors by editing two JSON files.

This is not a one-off build. After this work, internal users will continuously feed new product release clips, Figma exports, and demo recordings through this feature to keep TGK 2.0's demo library current. The feature must be:

- **Robust** to varied input quality (intro slides, presenter overlays, short clips)
- **Edit-tunable** without code deploys (versioned prompts, admin UI)
- **Deterministic** (same input = same output, byte-for-byte)
- **Verticalizable** (re-skin for nCino → Epic → Guidewire by editing JSON)

## Deliverables

### 1. Backend pipeline

Five stages, each a separately invocable endpoint at `/api/builder/jobs/{job_id}/stages/{stage}`:

| Stage | Endpoint | Persists |
|---|---|---|
| 1 — DECODE | `POST .../decode` | `frames/f_NNNN.jpg` |
| 1.5 — TRIAGE | `POST .../triage` | `keep/f_NNNN.jpg`, `triage.json` |
| 2 — CLASSIFY | `POST .../classify` | `segments.json`, `timeline.json`, optional `background.json` |
| 3 — EXTRACT | `POST .../extract` | `structure.json`, `content.json`, `theme.json` |
| 4 — RENDER | `POST .../render` | `build/index.html`, `build/assets/` |

Each stage:
- Reads its inputs from job storage, writes its outputs to job storage
- Records its execution in `job-meta.json` (prompt version used, status, timing, errors)
- Is independently re-runnable given prior outputs exist
- Is idempotent — same inputs produce same outputs byte-for-byte
- Respects the cross-stage requirements in Part 2 (escape hatch, cost ceiling, versioning)

### 2. Frontend additions to `/builder`

Purely additive. Do not modify existing routes, theming, or shared components. Required UI elements:

- **Upload control** — accepts one MP4 (required) plus optional reference screenshots (multi-file). Surfaces an `fps` setting (default 1) and a `vertical` selector.
- **Five-stage progress indicator** — shows current stage; clicking a completed stage opens its review panel.
- **Three checkpoint screens** that block the pipeline on user input:
  - **Post-TRIAGE** — kept/dropped frame strip with thumbnails. Drop-ratio warning gate. Slider for sensitivity. Per-frame "flip verdict" control.
  - **Post-CLASSIFY** — segment list with assigned rendering techniques. Per-segment override dropdown. Global "force DOM replay" toggle. SYNTHESIZE-only: scripted-interaction script visible and editable before render.
  - **Post-RENDER** — verticalization panel exposing `content.json` and `theme.json` as editable form fields, with live preview.
- **Final preview** — iframe rendering `build/index.html` at 1100×700 with a "view at 1440×900" toggle. Download button for the HTML file.
- **"My jobs" view** — job history with status, error reasons, and "retry from failed stage" controls.

### 3. Runtime prompts

Installed verbatim at `builder/prompts/v1/`:

```
decode.v1.md
triage.v1.md
classify-replay.v1.md
classify-synthesize.v1.md
extract.v1.md
render.v1.md
```

**Do not rewrite, summarize, or "improve" these prompts.** They are the contract that runs forever. Edits happen later, through the admin UI, with versioning.

### 4. Job storage layout

For each job at `builder/jobs/{job_id}/`:

```
raw/upload.mp4
reference-screens/*.{png,jpg}     ← optional, user-uploaded
frames/f_NNNN.jpg                  ← post-DECODE
keep/f_NNNN.jpg                    ← post-TRIAGE
triage.json
segments.json
timeline.json
background.json                    ← only if SYNTHESIZE branch ran
structure.json
content.json
theme.json
build/index.html
build/assets/
job-meta.json                      ← stage statuses, timings, prompt versions
```

### 5. Verticalization endpoint

`POST /api/builder/jobs/{job_id}/verticalize`

Accepts edited `content.json` and `theme.json` in the request body. Re-runs **only** the RENDER stage against the existing `structure.json` and `timeline.json`. Returns the new HTML.

In the panel UI, plain text and color edits should hot-swap the live preview via DOM updates without a full re-render. Anything structural (different button placement, scene reorder) goes through the full re-render endpoint.

## Constraints

- **Reuse existing TGK 2.0 conventions** for routing, theming, job queue, storage abstractions, and auth. Do not introduce new infrastructure dependencies.
- **Model invocation** assumes an existing `modelInvoke(prompt, inputs) → outputs` client. Without a Gemini API key, fake mode returns deterministic stubs per stage.
- **Frame extraction uses ffmpeg.** Assume it's available; if not, surface the dependency requirement in the build note.
- **All stages run server-side.** The browser never touches frames or model APIs directly.
- **No new infrastructure.** No new database, no new queue, no new storage backend.

## Out of scope

- Authentication / access control (TGK 2.0's existing admin cookie handles it)
- Multi-tenant isolation (assume per-user workspace conventions exist)
- Rendering techniques beyond the eight primitives in Part 2
- Languages other than English in synthesized data
- Audio extraction or voiceover generation (visual replay only)
- Real-time collaboration on a single job

## Production requirements

These are not optional. The feature is unusable in production without them.

### Regression set

Check 5–10 reference MP4s into the repo at `builder/regression/`. Format documented in [`builder/regression/README.md`](./regression/README.md). For each, store expected outputs as `<slug>.expected.json`:

- Frame count after DECODE
- Drop ratio after TRIAGE
- Segment count and technique distribution after CLASSIFY
- Generated HTML file size and primitive count
- Total runtime

Add a CI job that runs the pipeline against each reference on every change to `prompts/v1/` (or any prompt version directory) and flags drift beyond declared tolerances. Without this, prompt edits silently break working demos.

### Versioned prompts

All runtime prompts live under `prompts/vN/`. Bumping a prompt creates a new directory; the old one stays. Jobs record which prompt version they used in `job-meta.json` so historical builds remain reproducible.

The pipeline reads the active version from a single config value (`BUILDER_PROMPT_VERSION` env var), settable per environment.

### Prompt-edit UI for trusted roles

A `/builder/admin/prompts` route accessible to admin users. The route exposes the active prompt files for editing.

- Edits create a new draft version (`v2-draft`)
- Drafts don't affect in-flight jobs
- Promoting a draft to active requires an explicit "promote to active" action and triggers the regression CI
- Failed regression blocks promotion; the editor can roll back

### Failure surfacing

Every stage failure writes a structured error to `job-meta.json`:

```json
{
  "stage": "classify-replay",
  "status": "failed",
  "reason_category": "malformed_input" | "quota_exceeded" | "model_error" | "validation_failed" | "cannot_proceed",
  "reason": "human-readable explanation",
  "prompt_version": "v1",
  "started_at": "...",
  "failed_at": "..."
}
```

The "my jobs" view surfaces these so users self-service their failures. Retry-from-failed-stage uses the recorded reason to decide whether to re-run with the same inputs (for transient model errors) or require user action (for malformed input).

## Acceptance criteria

The build is complete when an internal user can perform every step below without the team touching the code:

1. Navigate to `/studio.html`, upload a reference MP4
2. Watch all five stages complete with a visible progress indicator
3. At the TRIAGE checkpoint, see kept/dropped frames in a strip and adjust at least one
4. At the CLASSIFY checkpoint, see segments with assigned techniques and override one
5. At RENDER, download a working self-contained `index.html` that visually replays the demo
6. Open the verticalization panel, change `"Acme Industries LLC"` to `"Wayne Enterprises"` and the primary color from `#002B5C` to `#0F766E`, and see the demo re-render with the new values
7. Re-upload the same MP4 a week later and get a byte-identical build (determinism)
8. As an admin, edit `triage.v1.md`, see the regression CI fail because drop classifications changed, and roll back to v1
9. Trigger SYNTHESIZE by uploading a short (~6s) reference clip, review the generated interaction script in the UI, edit one field value, and render

## Output format

Code changes only. The `/studio.html` page working end-to-end against the acceptance criteria is the deliverable.

---

# PART 2 — RUNTIME SPECIFICATION

The contract that runs forever. The 6 prompt files at [`builder/prompts/v1/`](./prompts/v1/) are the verbatim source of truth.

## Pipeline overview

```
STAGE 1   DECODE     →  raw frames at user-specified fps
STAGE 1.5 TRIAGE     →  kept frames + triage.json + masks (warning gates)
STAGE 2   CLASSIFY   →  segments.json + timeline.json
                        REPLAY branch:    reads frames, recreates motion
                        SYNTHESIZE branch: generates plausible script
                        HYBRID:            REPLAY then SYNTHESIZE tail
STAGE 3   EXTRACT    →  structure.json + content.json + theme.json
STAGE 4   RENDER     →  index.html (self-contained, themeable)
```

## The six rendering techniques

Stage 2 assigns one of these per segment and Stage 4 implements them.

1. **DOM replay** — UI rebuilt as real HTML elements; state changes animate. Required for any segment containing vendor-specific text or values.
2. **Static background + DOM overlay** — one frame as `<img>` background; only moving parts are real DOM on top.
3. **Frame crossfade** — two stills, opacity transition. For page transitions, modal appearances, tab switches.
4. **CSS keyframe animation** — `@keyframes` on transform / opacity / stroke-dashoffset. For cursor paths, signature strokes, progress bars.
5. **Sprite sequence** — rapid swap through a series of stills, like a GIF.
6. **SVG morph / stroke draw** — animating SVG paths directly. For signatures, hand-drawn marks, logo reveals.

## The eight base primitives

Every entry in `timeline.json` resolves to exactly one of these:

```
cursor_move(to_xy, duration_ms)
click(target)
type_char(target, char, delay_ms)
type_paste(target, text)
nav(scene_id)
modal_open(modal_id) | modal_close(modal_id)
sign_stroke(svg_path_id, duration_ms)
wait(duration_ms)
```

Targets are referenced by `data-demo-target` attribute, never by class, id, or DOM order.

## Synthesize macros (compose to base primitives)

The SYNTHESIZE branch of Stage 2 may emit these higher-level verbs. Stage 4 expands them to base primitives at render time:

```
cursor_arrival(element_id, duration_ms)     →  cursor_move
field_fill(element_id, value, cadence_ms)   →  cursor_move + type_char* + wait
dropdown_open(element_id, choice, dur)      →  click + wait + click
button_press(element_id, response_ms)       →  click + wait
page_advance(target_frame, transition_ms)   →  nav (with crossfade)
modal_summon(modal_id, dur)                 →  modal_open
signature_apply(block_id, dur)              →  sign_stroke
```

**If a behavior won't fit one of the eight base primitives, stop and report what's missing. Do not invent a 9th primitive. Do not compose primitives into new ones at runtime.** Every escape hatch added in run #2 is the drift vector that breaks run #3.

## Verticalization constraint

Applies to every stage:

The output of this pipeline is re-skinned for multiple vendors. Any vendor-specific text, color, value, or logo must end up in `content.json` or `theme.json` — never hardcoded into HTML, scripts, or `structure.json`. When a stage is choosing between rendering techniques, segments containing vendor-specific elements force technique #1 (DOM replay).

**When in doubt, pick DOM replay.** It's the only technique that survives a name change.

## Stage prompts

The verbatim text for each stage's prompt lives in its own file. **Read these to understand what each stage actually does — they're the runtime contract.**

- [`prompts/v1/decode.v1.md`](./prompts/v1/decode.v1.md) — ffmpeg shell-out
- [`prompts/v1/triage.v1.md`](./prompts/v1/triage.v1.md) — KEEP/DROP frame classification + warning gates
- [`prompts/v1/classify-replay.v1.md`](./prompts/v1/classify-replay.v1.md) — REPLAY branch (8s+ kept runtime)
- [`prompts/v1/classify-synthesize.v1.md`](./prompts/v1/classify-synthesize.v1.md) — SYNTHESIZE branch (<8s kept runtime)
- [`prompts/v1/extract.v1.md`](./prompts/v1/extract.v1.md) — semantic DOM tree + content + theme extraction
- [`prompts/v1/render.v1.md`](./prompts/v1/render.v1.md) — final HTML emission

## Cross-stage requirements

### Cannot-proceed escape hatch

Every stage prompt includes this clause. If a stage receives malformed input, input out of expected bounds, or input unsuited to the stage, it returns:

```json
{ "status": "cannot_proceed", "reason": "<short_description>" }
```

The pipeline halts. The user sees the reason in the UI and can retry, adjust, or re-upload.

### Cost ceiling

Every stage declares its own quota (frames, scenes, tokens, time). Exceeding it returns:

```json
{ "status": "quota_exceeded", "reason": "<which_bound>" }
```

Defaults are in the prompts. Environment-specific overrides come from a config block.

### Versioning

Every stage records the prompt version it ran in `job-meta.json`:

```json
{
  "stage": "classify-replay",
  "prompt_version": "v1",
  "started_at": "2026-05-07T14:23:00Z",
  "completed_at": "2026-05-07T14:23:14Z",
  "status": "ok",
  "model_calls": 3,
  "model_tokens": 14823
}
```

Re-running a job under a newer prompt version creates a new build directory; the old build remains.

---

# PART 3 — CANONICAL ACCEPTANCE TEST

A reference run that the build must pass end-to-end:

1. Upload `regression/banking-ncino-loan-origination.mp4` (60s source, 4s of intro card, 56s of in-product, banking vertical, ncino vendor)
2. **DECODE** produces 60 frames at 1fps. `frame_count: 60, source_duration_s: 60`.
3. **TRIAGE** drops the 4 intro frames. `drop_ratio: 0.067, kept_runtime_s: 56, status: ok, notice: trimmed_intro_outro`.
4. **CLASSIFY (REPLAY)** produces ~5 segments with a mix of techniques 1, 3, 4. Every segment with vendor-specific text has technique 1.
5. **EXTRACT** produces `structure.json` with no inline vendor strings, `content.json` with ~20 entries, `theme.json` with ~10 CSS variables.
6. **RENDER** produces a 1.2MB self-contained `index.html` that loops cleanly with no JS errors.
7. Verticalization panel: change `"Acme Industries LLC"` → `"Wayne Enterprises"` and `"--vendor-primary": "#002B5C"` → `"#0F766E"`. Demo updates without full re-render.
8. Re-upload the same MP4: produces a byte-identical build (determinism check).
9. Admin edits `triage.v1.md`, regression CI fails because drop classifications changed, admin rolls back to v1.
10. Upload a short (~6s) clip. SYNTHESIZE runs by default. User reviews the generated script in the UI, edits one field value, renders.

If all 10 pass, the feature ships.

---

## Hand-off state — where we are vs. where we need to land

Per [`builder/README.md`](./README.md):

**Wired**:
- Folder structure, all 6 prompt files installed verbatim
- Versioned prompt loader + draft save
- File-system job store + atomic stage status updates
- Stage 1 DECODE: ffmpeg + ffprobe + cost ceilings
- All server routes mounted under `/api/builder/jobs/*`
- `/studio.html` with all four views (New Job, Job Detail, My Jobs, Prompts Admin)
- Live preview iframe pulling `build/index.html` artifact
- Verticalization re-render endpoint
- Polling loop (1.5s while running)

**Stubbed (the punch list to ship the feature)**:
- **Real Gemini integration** — `npm install @google/genai`, set `GEMINI_API_KEY` in Replit Secrets, restart. Without the key, fake mode returns deterministic stubs per stage.
- **Per-stage validators** — every `@@key@@` in `structure.json` resolves in `content.json`; every `data-demo-target` referenced by `timeline.json` exists in `structure.json`; every primitive is one of the 8 base primitives.
- **Frame-verdict-flip Save endpoint** — `POST /api/builder/jobs/:id/triage/edit` to persist user verdicts.
- **Segment-technique-override Save endpoint** — `POST /api/builder/jobs/:id/segments/edit` to persist user overrides.
- **Hot-swap live preview** for verticalization edits — postMessage from studio.html into the iframe.
- **Job queue** — production should swap the in-process polling for BullMQ on Redis.
- **Regression CI** — wire the `builder/regression/*.expected.json` checks into a GitHub Action.
- **Role-based prompt-edit gating** — currently uses the same admin cookie as everything else.

The acceptance criteria above are the test suite. The 9 stubs are the gap between today's scaffold and the feature being live.
