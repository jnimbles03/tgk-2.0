# /builder Studio — MP4 → animated HTML demo pipeline

Five-stage pipeline that turns an uploaded MP4 (product demo, screen recording, Figma walkthrough) into a self-contained, themeable, animated HTML file. Internal users continuously feed clips through this to keep TGK 2.0's demo library current. Re-skinning a finished demo for a different vendor is two JSON edits.

This is a **passoffable scaffold** as of 2026-05-07. The folder structure, prompts, server routes, and frontend are wired end-to-end. Real Gemini integration is stubbed behind an env var so the rest of the pipeline can be exercised without an API key. See "Hand-off state" below for what's wired vs. stubbed.

## Quick start

```
npm install @google/genai multer            # multer is already in deps
export GEMINI_API_KEY=sk-...                # Patrick's key for now; engineers swap theirs in
node server.js
open http://localhost:5000/studio.html      # admin password: Welcome01!
```

Without `GEMINI_API_KEY`, the pipeline runs in **fake mode** — every model-driven stage returns a deterministic stub so the UI flow is testable end-to-end. Studio header shows a "Fake mode" badge in this state.

## Architecture

```
studio.html  ──▶  /api/builder/jobs/*  ──▶  builder/lib/pipeline.js  ──▶  builder/jobs/{id}/
   (UI)            (server.js routes)        (5-stage runner)              (per-job artifacts)
                                                    │
                                                    ▼
                                           builder/lib/model-invoke.js
                                                    │
                                                    ▼
                                           Gemini 2.5 Pro / Flash
                                                    │
                                                    ▼
                                           builder/prompts/v1/*.md
                                              (versioned, verbatim
                                               from the build spec)
```

### The five stages

| Stage | What it does | Wired? | Model |
|---|---|---|---|
| 1 — DECODE | `ffmpeg` shells out, extracts frames at user-specified fps | **fully wired** | none |
| 1.5 — TRIAGE | Classifies each frame KEEP / DROP, drops intro/outro/talking-heads, returns drop_ratio + warning gates | **stubbed** (modelInvoke) | `gemini-2.5-flash` (volume) |
| 2 — CLASSIFY | Branches REPLAY (≥8s kept) vs. SYNTHESIZE (<8s) vs. HYBRID. Emits `segments.json` + `timeline.json` | **stubbed** | `gemini-2.5-pro` |
| 3 — EXTRACT | Builds semantic DOM tree per scene. Emits `structure.json` + `content.json` + `theme.json` | **stubbed** | `gemini-2.5-pro` |
| 4 — RENDER | Generates a single self-contained `build/index.html` that auto-loops the demo | **stubbed** | `gemini-2.5-pro` |

### The eight base primitives (timeline.json)

```
cursor_move(to_xy, duration_ms)
click(target)
type_char(target, char, delay_ms)
type_paste(target, text)
nav(scene_id)
modal_open(id) | modal_close(id)
sign_stroke(svg_path_id, duration_ms)
wait(duration_ms)
```

If a behavior won't fit one of these, **stop and report what's missing**. Do not invent a 9th primitive. See the build spec inside the prompt files for the synthesize-macro layer that composes back to these eight.

### The six rendering techniques (segments.json)

1. DOM replay
2. Static background + DOM overlay
3. Frame crossfade
4. CSS keyframe
5. Sprite sequence
6. SVG morph / stroke draw

Vendor-specific segments are forced to technique 1 so verticalization re-skinning works.

## Folder layout

```
builder/
├── README.md                       ← you are here
├── prompts/
│   └── v1/                         ← active version (BUILDER_PROMPT_VERSION env var)
│       ├── decode.v1.md
│       ├── triage.v1.md
│       ├── classify-replay.v1.md
│       ├── classify-synthesize.v1.md
│       ├── extract.v1.md
│       └── render.v1.md
├── jobs/                           ← gitignored; per-job storage at builder/jobs/{id}/
│   └── .gitkeep
├── regression/                     ← reference MP4s + expected outputs for CI
│   └── README.md
└── lib/
    ├── prompts.js                  ← versioned prompt loader + draft saver
    ├── model-invoke.js             ← Gemini client wrapper (fake mode if no key)
    ├── job-store.js                ← file-system persistence
    └── pipeline.js                 ← five-stage runner
```

### Per-job layout (created automatically)

```
builder/jobs/{job_id}/
├── job-meta.json                   ← stage statuses, timings, prompt versions, gates
├── raw/upload.mp4
├── reference-screens/*.{png,jpg}   ← optional, user-uploaded
├── frames/f_NNNN.jpg               ← post-DECODE
├── keep/f_NNNN.jpg                 ← post-TRIAGE
├── triage.json
├── segments.json
├── timeline.json
├── background.json                 ← only if SYNTHESIZE branch ran
├── structure.json
├── content.json
├── theme.json
└── build/
    ├── index.html                  ← the deliverable
    └── assets/                     ← extracted backgrounds when too large to inline
```

## Server routes (all behind `requireBuilderAdmin` cookie)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/builder/jobs` | Create a new job (multipart: mp4 + reference[]) |
| GET | `/api/builder/jobs` | List jobs (recent first) |
| GET | `/api/builder/jobs/:id` | Read job-meta.json |
| POST | `/api/builder/jobs/:id/stages/:stage` | Run one stage |
| POST | `/api/builder/jobs/:id/run-all` | Run all stages, halt on first failure or gate |
| POST | `/api/builder/jobs/:id/verticalize` | Re-render only, with edited content/theme |
| GET | `/api/builder/jobs/:id/artifact/<path>` | Read-only access to job files |
| GET | `/api/builder/admin/prompts?version=v1` | List versions + read all prompts for one |
| POST | `/api/builder/admin/prompts/:stage` | Save edit as a draft (creates `{from}-draft` dir) |
| GET | `/api/builder/studio/health` | ffmpeg + model + prompt status |

## Hand-off state — what's wired vs. stubbed

### Fully wired
- Folder structure, all six prompt files installed verbatim from the build spec
- Versioned prompt loader (read + draft save)
- File-system job store + atomic stage status updates
- Stage 1 DECODE: ffmpeg + ffprobe + cost ceilings (>600s, >2GB)
- All server routes mounted under `/api/builder/*`, gated by existing admin cookie
- studio.html with all four views (New Job, Job Detail, My Jobs, Prompts Admin)
- Live preview iframe pulling `build/index.html` artifact
- Verticalization re-render endpoint
- Polling loop (1.5s while running)

### Stubbed (clearly flagged)
- **Gemini client**: `builder/lib/model-invoke.js` will call `@google/genai` when `GEMINI_API_KEY` is set and the package is installed. Without either, returns deterministic fake responses keyed by stage. Fake mode lets the team click through every screen.
- **Stage validators**: `pipeline.js` trusts model output. Add per-stage validators (every `@@key@@` resolves; every `data-demo-target` exists; primitives are in the allowed set) before going live.
- **Frame-verdict flip / segment-technique override**: studio.html shows the UI but Save buttons are disabled with `(not yet wired)`. The team needs two endpoints: `POST /api/builder/jobs/:id/triage/edit` and `POST /api/builder/jobs/:id/segments/edit`.
- **Hot-swap live preview** for verticalization edits: full `/verticalize` re-render works. DOM hot-swap via postMessage is TODO.
- **Job queue**: stages run in-process. Production should swap to BullMQ on Redis (already on the box if Replit is the host) — the swap point is the route handler in `server.js`, not `pipeline.js`.
- **Regression CI**: `builder/regression/README.md` documents the format. The team curates the set as real demos roll in. The CI hook itself is not yet written.
- **Role-based prompt-edit gating**: currently uses the same admin cookie as everything else. Spec called for a separate `PROMPT_EDITOR_ROLE` — layer on later.

### Out of scope (per spec)
- Multi-tenant isolation
- Auth/access control beyond the existing admin cookie
- Audio/voiceover
- Languages other than English in synthesized data
- Real-time collaboration on a single job
- Rendering techniques beyond the six primitives

## Verticalization

The whole point of the pipeline is that swapping `content.json` and `theme.json` re-skins the demo for any vendor. Stage 3 (EXTRACT) enforces this: if vendor-specific data ends up inline in `structure.json`, that stage failed.

Re-skin via the studio UI (Job Detail → Render review → verticalization panel) or programmatically:

```
curl -X POST -H "Content-Type: application/json" \
  -d '{"content":{"borrower_name_input.value":"Wayne Enterprises"},"theme":{"--vendor-primary":"#0F766E"}}' \
  http://localhost:5000/api/builder/jobs/JOBID/verticalize
```

## Extending — adding a new stage or prompt revision

1. **New prompt revision**: copy `builder/prompts/v1/` to `builder/prompts/v2/`, edit, set `BUILDER_PROMPT_VERSION=v2` in env, restart. Existing jobs keep their `prompt_version` recorded so historical builds remain reproducible.
2. **Edit via admin UI**: Prompts Admin view saves to `{version}-draft`. Promote by env flip.
3. **New stage**: add to `STAGE_FILES` in `prompts.js`, `STAGES` in `job-store.js`, `STAGE_RUNNERS` in `pipeline.js`, route handler in `server.js`, progress segment in `studio.html`.

## Costs + ceilings (per spec)

| Stage | Cap | On exceed |
|---|---|---|
| DECODE | mp4 ≤ 600s, ≤ 2GB | `quota_exceeded` |
| TRIAGE | ≤ 1000 frames classified | `quota_exceeded: frame_count_exceeded` |
| CLASSIFY | ≤ 50 segments per job | `quota_exceeded: segment_count_exceeded` |
| EXTRACT | ≤ 50 scenes, ≤ 500 elements | `quota_exceeded` |
| RENDER | ≤ 5MB output (HTML + assets) | retry once with file-refs, then `quota_exceeded: asset_size` |

## What "passoffable" means here

Today (2026-05-07): you can install the SDK, set the key, click through the studio, watch a real MP4 actually decode, run the rest of the stages in fake mode, see a stub render in the iframe, edit verticalization values, and re-render. Every screen renders. Every endpoint exists. Every prompt is verbatim from the spec.

What's left for the team: real Gemini integration test, validators on each stage's parsed output, the two save-edit endpoints for triage/classify checkpoints, regression CI, and a queue migration when traffic warrants it.

— Patrick, 2026-05-07
