# TGK 2.0

**Modular demo system for Docusign IAM.** Components → Scenes → Stories. Built in HTML; Python only at build-time. Variables (tenant, customer, color, logo) injected like ad libs so the same shell renders any vertical.

This repo is the source of truth. Replit deploys the live demo (`tgk-deux.replit.app`); GitHub Pages mirrors the static surface.

## Start here

| If you are… | Read |
|---|---|
| Picking up the codebase, day 1 | **`HANDOFF.md`** — TL;DR, lego framework, day-1 file lookup |
| Looking for granular state / history | **`CANONICAL.md`** — wrap state at top, vertical matrix, build queue |
| Adding a new demo to the build queue | **`_audits/sub-vertical-mapping.md`** — 60-cell canonical grid |
| Producing a custom-branded demo | Open `/builder.html` (the "Demo iMovie") |
| Editing narration across all stories | Open `/audit-grid.html` (sortable + filterable + inline edit) |
| Anything in `/admin/*` or builder Stage 4 | Password is `Welcome01!` |

## The 30-second mental model

```
COMPONENTS  →  SCENES  →  STORIES
~28 building   5 visual UI moments    5-scene arcs that
blocks (Web    (Agreement Desk,        tell a complete
Forms, IDV,    CLEAR, Signing,         end-to-end use
Maestro,       Navigator, Workspace)   case
Workspaces,
Headless)
```

Every demo URL is `story-shell.html?vertical=<key>&usecase=<flow>`. The shell reads `VERTICALS[<key>]` from inside the same file, picks scene-keys per usecase, and iframes the matching scene template with `?preset=<key>`. No JSON config, no database.

The canonical taxonomy: every sub-vertical exposes exactly 5 demos — Onboarding, Maintenance, Fraud Fabric, Headless IAM, Workspaces. 4 clusters × 3 sub-verticals × 5 demos = 60 cells in `picker.html`.

## Hosting

Two targets, one source. Source files use root-relative paths (`/assets/…`, `/story-templates/…`). Don't convert to relative.

- **Replit** (`server.js` + Express) — live working environment. Backend routes only run here.
- **GitHub Pages** (`jnimbles03.github.io/tgk-2.0/`) — static-only mirror. Auto-deploys on push to `main`; the Pages workflow rewrites root paths to `/tgk-2.0/`.

Mac working copy is the source. **Don't edit in the Repl.**

## Common operations

```
Edit a beat's headline/lede           → stories/_shared/story-shell.html → VERTICALS[<key>]
Edit the workspace surface             → story-templates/docusign-workspace.html → PRESETS[<key>]
Bulk-edit narration across stories     → /audit-grid.html
Build a custom-branded demo            → /builder.html
Add a new vignette from MP4            → /builder.html → topbar Admin → Stage 4 Card A
Wire into the picker                    → /picker.html
Add a new vertical                     → 3 edits: VERTICALS block, PRESETS block, redirect stub
```

## Layout

```
/
├── stories/_shared/story-shell.html   ← the canonical 5-scene shell, holds VERTICALS map
├── story-templates/                    ← 5 scene templates (Agreement Desk, CLEAR, Signing,
│                                          Navigator, Workspace) + callable vignettes
├── components/{current-state,future-state}/   ← ~200 component mocks for drill-downs
├── headless-iam/{fins,hls,ps}.html     ← tenant-branded portals (cluster-level)
├── flipbooks/                          ← MP4 → stills → HTML pipeline output (~17 vignettes)
├── builder/                            ← NEW. 5-stage MP4→animated-HTML studio pipeline.
│   ├── README.md                          architecture + wired-vs-stubbed map
│   ├── prompts/v1/                        verbatim Gemini prompts (versioned)
│   ├── lib/                               prompts loader, model client, job store, runner
│   ├── jobs/                              gitignored per-job storage
│   └── regression/                        CI manifest format
├── docs/                               ← reference docs + experimental surfaces
│   ├── solution-design.html              one-page architecture reference
│   ├── STORYLINES.md, _docusign-template-spec.md, _cleanup_candidates.md
│   ├── HLS Discovery Playbook…, Public Sector.md, TGK-2.0-Imagery-Spec.xlsx
│   └── experiments/                      HANDOFF.html, _persona-keyboard-demo.html
├── assets/{wizard,demo-stage,admin-auth,sor-badge}/   ← reusable JS+CSS primitives
├── picker.html                         ← canonical 4×3×5 grid nav
├── builder.html                        ← Demo iMovie (Stage 1-4)
├── studio.html                         ← NEW. 5-stage MP4→HTML pipeline UI
├── audit.html + audit-grid.html        ← classic dashboard + simplified grid
├── admin/index.html                    ← /admin/audit
├── server.js                           ← Express backend (Replit only)
└── _audits/                            ← planning docs + audit toolkit
```

### Reorg state (2026-05-07)

Cleanup is **complete**. Everything that was at root and shouldn't be has been moved:

- **5 docs** → `docs/` (STORYLINES.md, _cleanup_candidates.md, "HLS Discovery Playbook…", "Public Sector.md", TGK-2.0-Imagery-Spec.xlsx)
- **11 experimental/superseded HTMLs** → `docs/experiments/` (HANDOFF.html, _persona-keyboard-demo.html, architecture.html, audit-dashboard.html, dashboard.html, landing.html, index-playbook.html, auto.html, composition-stack.html, geos.html, index-unified.html)

All inbound references in picker.html, server.js (redirects), admin/index.html (admin nav), audit/SKILL.md, and the various spec docs were updated. Deep-link aliases (`/architecture`, `/architecture/`) still resolve via server.js redirects.

## Conventions

- **No emoji in TGK 2.0 UI.** Use inline SVG or brand icons.
- **HTML-first.** No JSON config or database. Python is build-time only.
- **Variables injected per preset.** Tenant, color, customer, logo, SoR — all swappable.
- **Hotspots are scene-keyed, not vertical-keyed.** Visual furniture is shared.
- **Shell is the only place narration lives.** Scene templates are visual furniture.
- **Patrick's code has redundancy** (hard-coded CSS per file). Don't refactor day one — harvest valuable components first.
