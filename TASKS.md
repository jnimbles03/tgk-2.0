# Tasks

## Active

- [ ] **P1 — `BEAT_TO_INTERNAL` entries for unmapped use-case scene keys** — added 2026-04-28
  - Source: story-demo-audit-2026-04-28.md
  - Missing keys: `maestro_package`, `envelope_deliver`, `portal_submit`
  - Symptom: `postBeatToFrame()` reads `mapping = BEAT_TO_INTERNAL[sceneKey]` (story-shell.html), gets undefined, iframe never receives `tgk:lockToBeat` → all 5 beats hold internal state s1 (full visual stall)
  - Suggested mapping (verify each template's actual `data-scene` attributes first):
    ```js
    maestro_package:    ["s1", "s2", "s3", "s4", "s5"],
    envelope_deliver:   ["s1", "s2", "s3", "s4", "s5"],
    portal_submit:      ["s1", "s2", "s3", "s4", "s5"],
    ```
  - Affects fraud-fabric Scene 3 and the 3-/4-scene intake variants

- [ ] **P2 — Resolve `portal_webform` dead code** — added 2026-04-28
  - Source: story-demo-audit-2026-04-28.md
  - Defined in `HOTSPOTS` (story-shell.html, line ~521) but never referenced in `USECASE_SCENE_KEYS`
  - Fraud-fabric Scene 2 uses `webform_intake` instead
  - Decision: wire it into fraud-fabric (replace `webform_intake` at `USECASE_SCENE_KEYS["fraud-fabric"][1]`) OR delete the hotspot block
  - Hotspot block reads like the right anchor set for fraud-fabric Scene 2 (session_banner, identity_binding, etc.) — recommend wiring rather than deleting

## Waiting On

## Someday

- [ ] **Author dedicated `usecases.workspaces` blocks for flagship verticals** — speculative
  - Today every vertical reuses canonical Scene 5 via synthesis when `?usecase=workspaces` is hit
  - For flagships (wealth, banking, provider, slgov, lifesciences) a tighter cold-open story might be worth authoring as a 1-scene `v.usecases.workspaces` block
  - Shell already prefers a dedicated block over the synthesis when present — drop-in additive change

- [ ] **Drop the `?usecase=auth-fabric` URL alias** — target 2026-10-28
  - Backward-compat alias added 2026-04-28 alongside the rename
  - Drop after 6 months (or sooner if analytics show no traffic on the old key)
  - Lines to remove in story-shell.html: the `if (usecase === "auth-fabric") usecase = "fraud-fabric";` line and the surrounding comment block

## Done

- [x] ~~P0 — Fix `?usecase=maintenance` (broken on every vertical)~~ (2026-04-28)
  - Resolved as part of the 5-flow build-out: 2 missing maintenance blocks authored (slgov-recertification, slgov-vendor-compliance), `provider-roi` formally skipped (covered by fraud-fabric), JSON inlined into the shell so no flash on load. 20/21 verticals now have maintenance narration; provider-roi's picker entry omits Maintenance by design.

- [x] ~~5-flow taxonomy build-out — Onboarding + Maintenance + Fraud Fabric + Workspaces + Headless~~ (2026-04-28)
  - Step 1: Fraud Fabric rename — auth-fabric → fraud-fabric across story-shell.html, JSON narration, picker URLs, CSS classes, JS variables, doc files. Backward-compat URL alias kept for 6 months.
  - Step 2: 2 maintenance narration blocks authored (slgov-recertification, slgov-vendor-compliance); provider-roi intentionally skipped.
  - Step 3: Workspaces standalone wired — `?usecase=workspaces` synthesizes a 1-scene story from canonical Scene 5; splash semantics preserved; topbar tab cleanup for sub-flows.
  - Step 4: Use-case narration JSON inlined into story-shell.html as `<script id="tgk-usecases">` — no more flash, no GitHub Pages fetch fragility.
  - Step 5: Picker IA — 21 Workspaces cards added (one per vertical); chip-filter strip (All / Onboarding / Maintenance / Fraud Fabric / Workspaces) inside Demo Story view.
  - Step 6: CANONICAL.md, five-flow-matrix doc, TASKS.md, memory updated.
