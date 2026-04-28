# Story Arc Audit & Use Case Extension · 2026-04-27

Two related passes on the FINS/HLS/PS demo set: (1) Scene 1 archetype audit on the canonical 5-scene stories; (2) extension of every vertical with two new sub-flow use cases (fraud-fabric + intake-mechanics) behind `?usecase=`.

## Files in this folder

### Pass 1 — Scene 1 archetype audit (canonical 5-scene stories)

- **`story-arc-audit-2026-04-27.html`** — the strategic memo. Read this first. Contains the 4 archetypes, the per-story diagnostic grid for all 19 FINS/HLS/PS verticals, and the prioritized 5-move fix list.
- **`audit-payloads-2026-04-27.json`** — per-story Scene 1 edits in `{path, value}` shape, with archetype + severity + rationale per entry. Drives the push script.
- **`push-audit-queue.mjs`** — Node helper that fetches `/api/audit/storylines` from a target base URL, applies each story's overlay, and POSTs to `/api/audit/submit` with the rationale as the queue note.

### Pass 2 — Use case extension (new sub-flows per vertical)

- **`usecase-extension-2026-04-27.html`** — the architecture proposal + per-vertical spec grid + 3 fully-baked exemplars (wealth, provider, slgov-recertification). Read second.
- **`usecase-payloads-2026-04-27.json`** — structured spec data: 3-scene templates for fraud-fabric and intake-mechanics, per-vertical spec rows for all 21 verticals, architecture/wiring requirements.
- **`usecase-narrations-2026-04-27.json`** — **the master narrations bundle.** Full scene narration (tag, head, lede, beats) for all 21 verticals × 2 use cases = 42 use case scripts, 145 scenes, 726 narrated beats. Drop-in for `VERTICALS[<key>].usecases` in story-shell.html. The shell fetches this file when `?usecase=` is set.
- **`_narrations-baked-exemplars.json`** + **`_narrations-{fins,hls-edu,ps-a,ps-b-nonprofit}.json`** — per-batch authoring source files merged into the master bundle. Paper trail; not used at runtime.

### Shell wiring (applied to live shell)

The following live files now support `?usecase=fraud-fabric` and `?usecase=intake`:

- **`stories/_shared/story-shell.html`** — added 6 new HOTSPOTS keys (portal_clear_idv, portal_webform, portal_submit, webform_intake, maestro_package, envelope_deliver), USECASE_SCENE_KEYS / USECASE_TEMPLATE_FILES / USECASE_TEMPLATE_MODES dispatch tables, srcForUsecaseScene() helper, async fetch of the narrations bundle when `?usecase=` is set, and usecase-aware SCENES build with re-render after fetch resolves. Default canonical 5-scene path is unchanged when `?usecase=` is not set.
- **`story-templates/docusign-portal-shell.html`** (new) — customer-portal stub for fraud-fabric Scenes 1 + 2. Two modes: `?mode=clear-idv-login` (Maestro orchestrates CLEAR at the door) and `?mode=action-webform` (Maestro serves webform inside authenticated session). Per-vertical preset wiring for all 21 tenants/customers.
- **`story-templates/docusign-webform-intake.html`** (new) — webform-intake stub for intake-mechanics Scene 1. Renders archetype A (sender) or B (self-service) based on per-vertical preset.
- **`story-templates/docusign-maestro-package.html`** (new) — Maestro fan-out visualizer for intake-mechanics Scene 2. Shows webform selections → packaged docs + recipient routing per vertical.
- **`story-templates/docusign-agreement-desk-chain-of-custody.html`** (new) — chain-of-custody view for fraud-fabric Scene 3. Surfaces auth event + transaction event linked as a continuous identity thread, with per-vertical session/transaction context for all 21 tenants.

URLs that work after this commit:
```
/stories/_shared/story-shell.html?vertical=<key>&usecase=fraud-fabric
/stories/_shared/story-shell.html?vertical=<key>&usecase=intake
```

Where `<key>` is any of the 21 verticals (wealth, banking, insurance, insurance-life, insurance-pc, banking-deposits, wealth-discovery, provider, lifesciences, payor, provider-roi, fedgov, slgov, slgov-311, slgov-benefits, slgov-recertification, slgov-vendor-compliance, slgov-employee-onboarding, slgov-licensing, education, nonprofit).

## How to run

Dry-run first (prints what would be submitted, no network calls beyond reading the JSON):

```
node _audits/push-audit-queue.mjs \
  --base https://<replit-domain> \
  --author "Jimmy" \
  --dry-run
```

Push for real:

```
node _audits/push-audit-queue.mjs \
  --base https://<replit-domain> \
  --author "Jimmy" \
  --note "Story arc audit — Scene 1 archetype re-anchor"
```

Push only specific stories:

```
node _audits/push-audit-queue.mjs \
  --base https://<replit-domain> \
  --author "Jimmy" \
  --include slgov-recertification,slgov-vendor-compliance,slgov-employee-onboarding
```

## What this audit covers and what it doesn't

**Covers**: Scene 1 only — tag, head, lede, beat-1 head. Archetype assignment per story. Sequencing/product flags for scenes 2–5 (read in the HTML grid; not auto-applied).

**Does not cover**: Scenes 2–5 copy rewrites, hotspot recalibration, iframe target changes, or the shell-level relabel of Scene 1 from "Sender · Agreement Desk" to "Intake." Those are intentionally out of scope for this pass — the spine relabel should land first, then this copy queue gets reviewed and applied.

## Stories flagged as follow-up (not auto-pushed)

Two stories need iframe re-routing in the shell on top of copy edits, so they're marked `follow_up: true` and skipped by default:

- **`banking`** (Meridian × Atlas — $2.5M facility) → Workspaces-led
- **`wealth-discovery`** (Cypress × Holcomb — IRA + family trust) → Workspaces-led

To push them anyway: `--no-skip-follow-up`.

## Reviewing in the queue

After push, review at `/admin/audit` on the Replit instance. Each entry shows:
- The vertical key
- The full overlay (entire vertical with edits applied)
- The per-story rationale in the note field
- Submitter name

Apply via the existing Python importer flow once approved.
