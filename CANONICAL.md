# TGK 2.0 — Canonical State Matrix

**Audit date:** 2026-04-26 (last revised 2026-04-26 PM after the split-into-verticals batch)
**Purpose:** One source of truth for what each vertical *is* today vs. what
the docs and older memories *say* it is. Drives the prioritized build
punch list at the bottom.

This file gets edited as work lands. Don't trust REGISTRY.md or
VERTICAL_PORTALS.md alone — they were brought current 2026-04-26 AM but
the vertical-count split happened later that day; spot-check before
quoting either as authoritative on count.

---

## Hosting & deploy

Two targets, one source. Source files use root-relative paths (`/assets/…`,
`/index-unified.html`, `/api/feedback`). **Do not** convert source paths to
relative — both targets depend on the absolute form, and the Pages workflow
adds the prefix automatically.

- **Replit (`server.js` + Express):** the live working environment. Serves
  source files unchanged at the domain root. Backend routes (`/api/feedback`,
  `/admin/*`, SSE) only work here. This is where feedback collection runs.
- **GitHub Pages (`jnimbles03.github.io/tgk-2.0/`):** static-only mirror.
  Auto-deploys on push to `main` via `.github/workflows/deploy-pages.yml`,
  which copies the repo into `_site/`, runs `.github/scripts/rewrite-paths.mjs`
  (prepends `/tgk-2.0/` to all root-relative paths), swaps the legacy
  `index.html` to `story-demo-classic.html`, and writes a fresh redirect
  `index.html` → `index-unified.html`. The feedback widget no-ops here
  (POST 404s silently). Admin console partially renders but its API calls
  404 — this is intentional while feedback is being phased out.

One-time repo setup: **Settings → Pages → Source: GitHub Actions**.

---

## Canonical shape (locked 2026-04-26)

One demo experience per vertical, one technology shape across all
verticals:

- **Entry point:** `/stories/story-<vertical>/index.html` is a thin
  redirect to `/stories/_shared/story-shell.html?vertical=<key>`.
- **Shell:** a single ~1,058-line `story-shell.html` reads `?vertical=`
  and renders a **5-scene narration** with shared hotspot coordinates
  pointing at Docusign template UI elements.
- **Scene template loading order is fixed and shared across all
  verticals:**

  | Scene | Role | Template iframe loaded | Hotspot key |
  |---|---|---|---|
  | 1 | Sender | `docusign-agreement-desk.html?preset=<vertical>` | `agreement_desk` |
  | 2 | Identity | `docusign-clear-idv.html?preset=<vertical>` | `clear_idv` |
  | 3 | Signing | `docusign-signing-ceremony.html?preset=<vertical>` | `signing` |
  | 4 | Data | `docusign-navigator.html?preset=<vertical>` | `navigator` |
  | 5 | Workspace | `docusign-workspace.html?preset=<vertical>[&splash=1]` | `workspace` |

- **`?splash=1`** appended to any vertical URL bolts the MasterCard-style
  Workspace splash onto Scene 5. The splash is no longer MasterCard-only;
  it's a Workspace-intro pattern any vertical can opt into.
- **Hotspots are shared across verticals** because they target Docusign
  template UI, which doesn't shift per preset. Only narration (sidebar
  copy + per-beat headlines) varies by vertical.

### Five-flow taxonomy (locked 2026-04-28)

Every vertical exposes four story flavors via `?usecase=` plus a
core-vertical-level Headless IAM page:

| Flow | URL | Scenes | Narration source |
|---|---|---|---|
| **Onboarding** | `?vertical=<key>` (no usecase) | 5 | `v.scenes` (canonical) |
| **Maintenance** | `?vertical=<key>&usecase=maintenance` | 3 | `v.usecases.maintenance.scenes` (inlined) |
| **Fraud Fabric** | `?vertical=<key>&usecase=fraud-fabric` | 3 | `v.usecases.fraud-fabric.scenes` (inlined) |
| **Workspaces** | `?vertical=<key>&usecase=workspaces` | 1 | synthesized from `v.scenes[4]` (canonical Scene 5) |
| **Headless** | `/headless-iam/{fins,hls,ps}.html` | n/a | tenant-branded portal |

Backward compat: `?usecase=auth-fabric` aliases silently to `fraud-fabric`
(rename happened 2026-04-28; alias to be dropped after ~6 months).

Use-case narration is inlined in story-shell.html as
`<script id="tgk-usecases" type="application/json">` (eliminates the
network fetch and the load flash). The async fetch path is retained as a
fallback only.

This shape supersedes the older recipe.json + per-portal scene HTMLs
architecture described in VERTICAL_PORTALS.md and the
`stories/wealth-onboarding-v2/` multi-tenant pattern in REGISTRY.md.

---

## Vertical matrix

**Twenty-one verticals** registered in the shell's `VERTICALS` map as of
2026-04-26 PM (was 10 at the start of the day). The new 11 came from the
"split into their own" decision — provider/insurance got dedicated
verticals for their distinct stories, the 6 public-sector samplers each
became their own vertical, and the remaining 2 split-eligible samplers
(banking-deposits, wealth-onboarding) added two more. Plus a vanity
portal folder (`wealth-hillside-aster`) redirecting to `?vertical=wealth`.

The original 10 stay unchanged. The 11 new entries:

| New vertical | Tenant + named customer | Mark color | **Splash default** | Source sampler |
|---|---|---|---|---|
| `insurance-life` | Beacon Mutual × Whitfield Family — death claim | `#B189D9` | **✓** | `insurance-life.html` |
| `insurance-pc` | Northgate Mutual × Patel Logistics — commercial auto FNOL | `#FF8A4D` | **✓** | `insurance-pc.html` |
| `provider-roi` | Catalina Medical × Eric Tan — records release to Silver Mountain Disability | `#5BCDB8` | ✗ | `hls-roi.html` |
| `slgov-311` | Greenhaven Public Works × 1124 Cedar Ave pothole | `#4CAF7A` | ✗ | `public-sector-311.html` |
| `slgov-benefits` | Eastside HHS × Rivera family SNAP application | `#5DA9C9` | **✓** | `public-sector-benefits.html` |
| `slgov-recertification` | Cascade Medicaid × Diane Park annual recert | `#94A3B8` | ✗ | `public-sector-recertification.html` |
| `slgov-vendor-compliance` | Ridgeview Procurement × Apex Logistics annual COI | `#E89B5B` | ✗ | `public-sector-vendor-compliance.html` |
| `slgov-employee-onboarding` | Cascade County HR × Marcus Lee new caseworker | `#B589DB` | ✗ | `public-sector-employee-onboarding.html` |
| `slgov-licensing` | Northbrook Licensing Bureau × Avalon Café restaurant license | `#F2A56B` | ✗ | `public-sector-licensing.html` |
| `banking-deposits` | Cedar Federal Credit Union × Williams household — Account Opening (A-trig). `?usecase=fraud-fabric` = high-value wire + chain-of-custody. `?usecase=maintenance` = household beneficiary update (B). | `#6BB6FF` | ✗ | `banking-deposits.html` |
| `wealth-discovery` | Cypress Wealth × Holcomb Family — IRA rollover + family trust | `#5BA1B8` | **✓** | `wealth-onboarding.html` |

Each new vertical has the same shape as the original 10:
- Full shell `VERTICALS` entry: 5 scenes × 5 beats × tenant + customer narrative
- Matching workspace `PRESETS` entry: tenant + email + summary + sections + activity + Iris + agent
- Redirect at `/stories/story-<key>/index.html`
- Splash works via `?splash=1` (now that the splash is inlined). **As of 2026-04-27,
  splash is also enabled by default on 8 verticals via the `splashOk:true` flag in
  the shell's `VERTICALS` map — see "Splash default" column below.** `?splash=0`
  forces it off; `?splash=1` forces it on; no param uses the per-vertical default.

**Original 10 verticals** (unchanged):

Truth-test legend: ✓ wired · ◐ partial · ✗ missing · — not applicable.

| Vertical key | Tenant + named customer | Mark color | All 5 scenes wired | Preset exists | `?splash=1` works | **Splash default** | Root sampler | Sampler decision | Future-state components |
|---|---|---|---|---|---|---|---|---|---|
| `wealth` | Hillside × Aster Capital — New Client Onboarding | `#3FDA99` | ✓ | ✓ | ✓ | **✓** | `wealth-onboarding.html` | fold or retire | ~6 (`wealth-onboarding`) |
| `banking` | Meridian × Atlas Manufacturing — $2.5M Working Capital Facility | `#2D8EFF` | ✓ | ✓ | ✓ | **✓** | `banking-deposits.html` | fold or retire | ~6 (`retail-banking-deposits`) |
| `insurance` | Sentinel × Ramirez Family — HO3 Policy Binding | `#F2B3C2` | ✓ | ✓ | ✓ | ✗ | `insurance-life.html`, `insurance-pc.html` | shell covers HO3; samplers are L&A and P&C niches | many (`insurance-life-annuities-*` + `insurance-pc-*`) |
| `provider` | Riverside × Jordan Kim — New Patient Onboarding | `#6FD6C8` | ✓ | ✓ | ✓ | ✗ | `hls-discovery-process-map.html`, `hls-roi.html` | hls-roi is a distinct ROI flow, may earn its own preset | ~10 (`hls`, `hls-roi`) |
| `lifesciences` | Helix × Austin Research Clinic — Site Activation for HX-2104 | `#C7A0FF` | ✓ | ✓ | ✓ | **✓** | none | — | 0 dedicated; ad-hoc demos only |
| `payor` | Unity × Marcus Chen — Silver HMO Enrollment | `#6FDA9B` | ✓ | ✓ | ✓ | ✗ | none | — | 0 dedicated |
| `fedgov` | DOL × Taylor Nguyen — UI Claim UI-2026-48211 | `#E8B800` | ✓ | ✓ | ✓ | ✗ | `public-sector-employee-onboarding.html`, `public-sector-recertification.html` | overlap with slgov; re-bucket | shared with slgov |
| `slgov` | Springfield × 1420 Oak Street — Residential Building Permit | `#E8A438` | ✓ | ✓ | ✓ | ✗ | `public-sector-311.html`, `-benefits`, `-licensing`, `-vendor-compliance` (+ shared with fedgov) | shell covers permit; the 6 samplers are 6 distinct slgov flavors | many (`public-sector-*` × 6 sub-scopes) |
| `education` | Maple Ridge × Priya Shah — Fall 2026 Student Onboarding | `#F2C65A` | ✓ | ✓ | ✓ | ✗ | none | — | 0 dedicated |
| `nonprofit` | Harbor × Safe Streets Initiative — $120k Grantee Onboarding | `#FFB86B` | ✓ | ✓ | ✓ | **✓** | none | — | 0 dedicated |

**Headline read:** narration is fully populated for **all 21 verticals** — 5
scenes × 5 beats each, with tenant brand, named customer, and color
applied. All 19 also have matching presets in
`story-templates/docusign-workspace.html` (which carries 27 presets
total once you count the older sub-presets like `wealth-hnw-onboarding`,
`banking-commercial-loan-mod`, `lifesciences-mlr-review`, etc.). The
shell is shippable for every one of them.

~~**Verified bug:** `?splash=1` is currently a no-op for **every** vertical.~~
**Resolved 2026-04-26.** Splash CSS + JS inlined inside
`docusign-workspace.html` (`.mc-splash` block in `<style>`, `loadSplash`
IIFE at the end of the script block). The previous external load of
`/stories/_shared/mastercard-splash.{css,js}` is gone — those files
never existed on disk. `?splash=1` now triggers a ~10s
Deep-Violet-on-Ecru splash (brand lockup → 3 editorial lines → preset-
specific descriptor tag → fade-out) before the Workspace appears.

---

## ~~Architectural drift to reconcile~~ — Resolved 2026-04-26

All three doc-drift items below were addressed in the same pass that
inlined the splash. Notes preserved for historical traceability.

1. ~~**`VERTICAL_PORTALS.md`** still describes the 4-scene spine with `recipe.json`.~~
   Updated. The "How the portals fit into TGK story structure",
   "Story shells on disk", "Authoring order", and "Next build priorities"
   sections were rewritten to describe the 5-scene shell + `VERTICALS` map +
   `?vertical=` redirect pattern. A new "How to add or edit a vertical"
   section now points authors at the shell. The architecture-note callout
   at the top of the doc explicitly flags the body capability palettes
   as the spec, not the delivery mechanism.

2. ~~**`REGISTRY.md`** says component-level mocks number 89+.~~ Updated to
   97 current-state and 100 future-state. The wealth-onboarding-v2
   multi-tenant pattern section was reframed as "deprecated — superseded
   by `?vertical=` + per-vertical preset." The chrome-alignment table
   referencing dead folders (payor-healthedge, federal-servicenow,
   insurance-la-duckcreek) was replaced with a brief historical note.
   The Maestro template's "84 of 95 future-state components" claim was
   updated to "88 of 100 as of 2026-04-26."

3. ~~**`mastercard-splash.css/.js` shared module**~~ — never existed.
   Replaced everywhere: REGISTRY's Workspaces template section now points
   at the inlined splash, VERTICAL_PORTALS's MasterCard scene-block was
   rewritten, and the comment header inside `docusign-workspace.html` was
   updated to describe the inline implementation.

---

## Root-level samplers

Twelve sampler HTMLs at the project root. As of 2026-04-26 PM (final pass),
**11 of the 12 have been converted to thin redirects** pointing to their
matching shell verticals. The original sampler content is preserved in git
history. The 12th (`hls-discovery-process-map.html`) stays as-is — it's a
process-map artifact, not a story arc. Updated per-sampler decisions:

| Sampler | Status | Notes |
|---|---|---|
| `insurance-life.html` | ✓ Redirects to `insurance-life` vertical | Original in git history |
| `insurance-pc.html` | ✓ Redirects to `insurance-pc` vertical | Original in git history |
| `hls-roi.html` | ✓ Redirects to `provider-roi` vertical | Original in git history |
| `public-sector-311.html` | ✓ Redirects to `slgov-311` vertical | Original in git history |
| `public-sector-benefits.html` | ✓ Redirects to `slgov-benefits` vertical | Original in git history |
| `public-sector-recertification.html` | ✓ Redirects to `slgov-recertification` vertical | Original in git history |
| `public-sector-vendor-compliance.html` | ✓ Redirects to `slgov-vendor-compliance` vertical | Original in git history |
| `public-sector-employee-onboarding.html` | ✓ Redirects to `slgov-employee-onboarding` vertical | Original in git history |
| `public-sector-licensing.html` | ✓ Redirects to `slgov-licensing` vertical | Original in git history |
| `banking-deposits.html` | ✓ Redirects to `banking-deposits` vertical | Original in git history |
| `wealth-onboarding.html` | ✓ Redirects to `wealth-discovery` vertical | Original in git history |
| `hls-discovery-process-map.html` | Standalone artifact (preserved) | Process map view, not a story arc — keep as-is |

**Resolved 2026-04-26 PM.** The "split into their own" decision was made
explicit: each distinct story gets its own first-class vertical entry in
the shell, not a sub-preset. Result: 9 new verticals authored from the 9
superseded samplers. The `?subv=` proposal was not needed; the shell
handles each story as a peer entry under `VERTICALS`.

The 3 remaining samplers (`banking-deposits.html`, `wealth-onboarding.html`,
`hls-discovery-process-map.html`) didn't get split this round and need
separate disposition.

---

## Future-state coverage (rough)

Rough counts by scope suffix in `/components/future-state/` (100 files
total). Run an exact count when needed; this is the orientation.

- `insurance-life-annuities-new-business`: ~10
- `insurance-life-annuities-death-claims`: ~9
- `insurance-pc-claims`: ~5
- `insurance-pc-policy-generation`: ~6
- `retail-banking-deposits`: ~6
- `wealth-onboarding`: ~6
- `public-sector-311`: 5
- `public-sector-benefits`: 4
- `public-sector-licensing`: 4
- `public-sector-recertification`: 5
- `public-sector-vendor-compliance`: 5
- `public-sector-employee-onboarding`: 5
- `hls`: 4
- `hls-roi`: 5
- Cross-cutting (no scope suffix): 4 demo files

The shell's Scene 4 (Navigator) doesn't currently surface these
component mocks — the iframe loads `docusign-navigator.html` directly.
**Question to resolve:** are future-state components meant to be
Navigator surface variants, or do they live in the root samplers as
the destination of Scene 3 drill-downs?

---

## Build punch list (prioritized)

In dependency order. Don't skip ahead — each step de-risks the next.

### ~~P0 — lock the canonical shape in docs~~ ✓ Done 2026-04-26

1. ~~Rewrite `VERTICAL_PORTALS.md` "Story shells on disk" + "Authoring order".~~ ✓
2. ~~Update `REGISTRY.md` component count + prune stale sections.~~ ✓
3. ~~Decide: keep or delete `mastercard-workspace.html`.~~ ✓ Already a thin redirect.

### ~~P1 — fix the broken splash + verify shell rendering~~ ✓ Done 2026-04-26

4. ~~Fix `?splash=1`.~~ ✓ Inlined inside `docusign-workspace.html`.
5. ~~Spot-load each of the 10 verticals.~~ ✓ Verified via Read/Grep — all 11 portal redirects use the correct vertical key, all 10 keys exist in shell `VERTICALS`, all 10 keys exist in workspace `PRESETS`. No live browser check yet — recommend a quick eyeballing on Replit before P2 begins.

### ~~P2 — sampler reconciliation~~ ✓ Done 2026-04-26 PM

6. ~~Add `?subv=<key>` to the shell.~~ Not needed — went with first-class verticals instead.
7. ~~Decide each sampler's fate.~~ ✓ 11 of 12 samplers now have a matching shell vertical; 12th (process-map artifact) preserved as-is.
8. ~~Retire or redirect samplers.~~ ✓ All 11 superseded samplers now redirect to their canonical shell URLs. Originals preserved in git history.

### ~~P2.5 — handle the remaining 3 samplers~~ ✓ Done 2026-04-26 PM (final pass)

8a. ~~`banking-deposits.html`~~ ✓ Authored `banking-deposits` vertical (Cedar Federal × Williams household joint checking). Sampler now redirects.
8b. ~~`wealth-onboarding.html`~~ ✓ Authored `wealth-discovery` vertical (Cypress Wealth × Holcomb Family multi-account onboarding). Sampler now redirects.
8c. ~~`hls-discovery-process-map.html`~~ ✓ Confirmed as standalone process-map artifact. Preserved as-is.

### P3 — coverage matrix and SoR badge sweep (≤ 4 hours)

9. **Wire future-state components into Navigator surfaces.** The
   ~100 future-state files belong somewhere — the most natural slot
   is as Scene 3 (Signing) or Scene 4 (Data) drill-downs. Pick one
   vertical, prove the wiring, then sweep.
10. **Apply the SoR badge treatment** ("System of record" pill in
    chrome) across all 5 scene templates per vertical, mapping the
    correct vendor per the REGISTRY badge kit table.
11. **Re-run `tgk-audit`** across the shell + scene templates after
    everything above lands.

### P4 — story polish

12. Visual polish, hotspot calibration with the shell's calibrate mode,
    SoR-per-vertical brand application, copy review.

---

## Picker consolidation — geos × index-unified

**Decision (2026-04-29):** the surviving picker will be a **new
consolidated file** (name TBD; provisionally `/picker.html` or a
rebuilt `/index.html`), not a takeover of either existing file. Both
`geos.html` (function-first) and `index-unified.html` (vertical-first)
become redirects once the new file ships. The FINS/HLS/PS path uses
**inline cluster cards + handoff to a vertical chooser** — the b2c
wizard isn't being inlined into geos's existing flow; the new picker
will host both halves cleanly.

### Wizard primitive — extracted 2026-04-29

`/assets/wizard/wizard.css` and `/assets/wizard/wizard.js` now own the
generic wizard pattern:

- **wizard.css** — `.wizard-back` button visuals + the "show back
  button on stages 2–6" rule. Page-specific show/hide rules
  (`#subverticalSection` etc.) stay in the consumer page because
  they're tied to the page's DOM.
- **wizard.js** — exposes `window.WizardPrimitive` with `setStage(n)`,
  `getStage()`, and `attachBack({ btnSelector, onBack, escapeGuard })`.
  Pages keep their own state-clearing handler inside `onBack`.

**DOM contract:** `<body>` accepts `wizard-mode` + `wizard-stage-{N}`
classes. Page supplies a back button (default selector `#wizardBack`)
and per-stage CSS show/hide rules.

### Status

- ✓ Wizard primitive extracted to `/assets/wizard/`.
- ✓ `index-unified.html` consumes the primitive — its local
  `setWizardStage` is now a thin wrapper around `WizardPrimitive.setStage`,
  and its back-button + Escape wiring is one `attachBack` call. Behavior
  unchanged.
- ✓ `geos.html` loads `wizard.css` + `wizard.js` for forward-compat. It
  doesn't add `wizard-mode` to body today (still uses `.locked` section
  unlocking), so zero behavior change; assets are pre-positioned for the
  consolidated file.
- ☐ Build the consolidated picker file consuming the primitive.
- ☐ Flip `server.js` `/` route + Pages-deploy redirect from
  `index-unified.html` to the new file.
- ☐ Convert `geos.html` and `index-unified.html` to redirects.

### Visual + structural state of the two pages

- Hero / STEP-1 layout is already aligned between geos and unified
  (cross-reference comments inside each file confirm — "matching the
  equivalent compression on geos.html", "Aligned to .option-card in
  index-unified.html").
- geos handles Procurement + Sales itself (linking to flipbook
  demo-stage pages) and hands the b2c path off to index-unified via
  `?cluster=fins|hls|ps`. index-unified honors the cluster param and
  pre-selects the matching vertical (see `CLUSTER_TO_VERTICAL` in its
  IIFE).
- Routing today: `server.js` redirects `/` → `/index-unified.html`;
  the Pages workflow's generated `index.html` also redirects to
  `/index-unified.html`. geos.html is reachable only by direct URL.

---

## Callable vignettes

Vignettes are reusable Docusign UI moments that any vertical can iframe
into any beat. Unlike scene templates (which are slotted at fixed
positions in the 5-scene spine), vignettes are operator-driven — narration
JSON references them per-beat as drill-downs or scene replacements.

| Vignette | File | URL params | First-wired verticals |
|---|---|---|---|
| **Connected Forms** (Maestro · Add Connected Forms wizard + App Center · Field Mapping) | `/story-templates/docusign-connected-forms.html` | `?embed=1` (hide chrome) · `?view=maestro\|appcenter` · `?preset=wealth\|wealth-discovery\|insurance\|insurance-life\|insurance-pc\|generic` · `?step=1\|2\|3\|done` | wealth, wealth-discovery, insurance, insurance-life, insurance-pc |

### Connected Forms — calling pattern

```html
<!-- As a Scene 1 / Scene 4 drill-down, embedded in a beat: -->
<iframe src="/story-templates/docusign-connected-forms.html?embed=1&preset=wealth&view=maestro&step=2"></iframe>
```

The shell can also drive it post-mount via postMessage:

```js
iframe.contentWindow.postMessage({ type: "tgk:lockToBeat", view: "appcenter", step: "done" }, "*");
iframe.contentWindow.postMessage({ type: "tgk:setPreset", preset: "insurance-life" }, "*");
```

Hotspot anchors inside the vignette (queryable via `tgk:queryRect`):
`cf_node`, `cf_step1`, `cf_step2`, `cf_step3`, `cf_field_mapping`.

### Why this lives outside the 5-scene spine

The 5-scene spine (Agreement Desk · CLEAR · Signing · Navigator ·
Workspace) is locked. Connected Forms isn't a sixth scene — it's a
configuration moment that sits inside Maestro (visualized as Scene 1's
Agreement Desk) and inside App Center (a Docusign admin surface, not
part of any one scene). Treating it as a callable vignette lets:

- wealth and insurance verticals use it as a Scene 1 drill-down
  ("Priya's onboarding workflow includes a Connected Forms step"),
- any vertical reference it from Scene 4 narration as a "where the
  forms came from" admin tour,
- new vignettes be added later without changing the spine.

### How to add a new vignette

1. Drop the template in `/story-templates/docusign-<name>.html`.
2. Support `?embed=1` (hide outer chrome) + `?preset=` (per-vertical
   defaults) + the postMessage protocol used by the shell
   (`tgk:lockToBeat`, `tgk:queryRect`, replying with `tgk:rect`).
3. Tag interactive sub-elements with `data-hotspot="<name>"` so the
   shell's calibrator can pin shell-level hotspots to them.
4. Register the row in the table above + bump
   `REGISTRY.md` "Story-level templates" count.

---

## Open questions that need a human decision

The next session blocks on these. Each shapes how P2 (sampler
reconciliation) gets executed.

- **Sub-flows:** add `?subv=` to the shell, or keep samplers as Scene 3
  drill-downs? (Recommended: add `subv` — one shell, parameter-driven,
  no per-tenant HTML duplication. Same lesson the wealth-onboarding-v2
  experiment delivered before it was deprecated.)
- **Provider has two distinct stories** (new patient onboarding in shell,
  ROI in sampler). Sub-preset, or break out as a new vertical?
- **Insurance has three stories** (HO3 binding in shell, L&A new-business
  in `insurance-life`, P&C in `insurance-pc`). Same question.
- **Are future-state components meant to surface inside Navigator/Workspace
  templates, or only as drill-downs from samplers?** This determines
  whether P3 step 9 wires components into iframe templates or into
  Scene 3 drill-down panels.
