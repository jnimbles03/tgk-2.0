# TGK 2.0 — Story Stack Handoff

**Purpose:** Hand-off reference for "I need to change a vignette in story X — where in the code do I open the file?" This is the schema, not the strategy. For strategy / state, read `CANONICAL.md` first.

**Last verified against the repo:** 2026-05-07.

**Audience:** Steven, Jesse, and anyone else taking over the codebase from Patrick. This is what you need to navigate on day one.

---

## TL;DR (read this first, ~2 minutes)

**Mental model — the lego framework.** A demo is built by stacking three things:

```
COMPONENTS  →  SCENES  →  STORIES
(28 building       (visual UI moments    (5-scene arcs that
 blocks: Web        like Agreement Desk,  tell a complete
 Forms, IDV,        CLEAR, Signing,        end-to-end use
 Maestro,           Navigator, Workspace)  case)
 Workspaces,
 Headless, etc.)
```

**The whole thing is parameter-driven HTML.** No JSON config, no database, no build step at runtime. Every demo URL is `story-shell.html?vertical=<key>&usecase=<flow>`. The shell reads `VERTICALS[<key>]` from inside the same file, picks scene-keys per usecase, and iframes the matching scene template with `?preset=<key>`. Variables get injected like ad libs (tenant name, color, customer name, logo).

**The canonical taxonomy.** Every sub-vertical exposes exactly 5 demos — Onboarding, Maintenance, Fraud Fabric, Headless IAM, Workspaces. 4 clusters × 3 sub-verticals × 5 demos = a 60-cell grid. The picker (`picker.html`) navigates exactly this grid.

```
                    Onboarding   Maintenance   Fraud Fabric   Headless   Workspaces
FINS · Wealth         ✓             ✓             ✓             ✓          ✓
FINS · Banking        ✓             ✓             ✓             ✓          ✓
FINS · Insurance      ✓             ✓             ✓             ✓          ✓
HLS  · Provider       ✓             ✓            (build)         ✓          ✓
HLS  · LifeSci        ✓           (build)        (build)         ✓          ✓
HLS  · Payor          ✓           (build)        (build)         ✓          ✓
PS   · FedGov         ✓           (build)        (build)         ✓          ✓
PS   · SLGov          ✓             ✓             ✓             ✓          ✓
PS   · Education      ✓           (build)        (build)         ✓          ✓
Cross · Nonprofit     ✓           (build)        (build)       (build)      ✓
Cross · Sales         ✓             —             —             —          ✓
Cross · Procurement   ✓             ✓             —             —          ✓
```

**(build) = needs content. 17 cells outstanding.** Mapping at `_audits/sub-vertical-mapping.md`.

**Three things the team should know on day 1:**

1. **No JSON. No database. Just HTML + Python.** Python is build-time only (extract frames from MP4s, scaffold flipbooks, build vignette manifests). Runtime is plain HTML + JS + CSS.
2. **Patrick's code has redundancy.** Most templates have hard-coded CSS per file. Don't refactor on day one — harvest valuable components (especially flipbooks) first; standardize CSS as a longer-term improvement.
3. **Two surfaces are admin-gated:** `/builder.html` (Stage 4 admin tools) and `/admin/audit` both want `Welcome01!` via `/assets/admin-auth/`. Cookie name `x-tgk-admin`.

**First-week target:** IAM for Sales use case wired into Cross-org · Sales by next Friday.

**Where to look:**

| To do this | Open this file |
|---|---|
| Edit a beat's headline or lede | `stories/_shared/story-shell.html` → `VERTICALS[<key>]` |
| Edit the workspace surface for a vertical | `story-templates/docusign-workspace.html` → `PRESETS[<key>]` |
| Bulk-edit narration across all stories | `/audit-grid.html` (sortable + filterable + inline edit) |
| Build a custom-branded demo | `/builder.html` (the "Demo iMovie") |
| Add a new vignette from MP4 | `/builder.html` → topbar Admin → Stage 4 → Card A |
| Wire into the picker | `/picker.html` — 4-cluster nav |

---

## 1. The five-piece stack (read top to bottom)

A rendered story = **5 files cooperating via URL params and `?preset=` iframes**. Every story in the system uses the same five pieces. There is no per-vertical HTML for narration — narration is JSON-shaped data inside one shell.

```
[ Picker / direct link ]        ← entry surface
        │  (user chooses a vertical + flow)
        ▼
/stories/story-<vertical>/index.html
        │  (1-line meta-refresh redirect — never edit narrative here)
        ▼
/stories/_shared/story-shell.html?vertical=<key>&usecase=<flow>&splash=0|1
        │  reads the URL, looks up VERTICALS[<key>], renders 5 scenes worth of
        │  sidebar copy + headlines + hotspots + persona chips + beat strip.
        │  For each scene, it iframes one scene template:
        ▼
/story-templates/docusign-<scene>.html?preset=<key>&embed=1[&mode=…]
        │  the visual UI moment (Agreement Desk, CLEAR, Signing, Navigator,
        │  Workspace). Honors ?preset= via its own internal PRESETS map.
        ▼
PRESETS lookup inside the scene template
        (e.g. workspace.PRESETS["wealth"] = tenant + email + sections + agent rail)
```

**Key insight:** narration (sidebar copy, headlines, beats, persona chips) lives in **one place** — the `VERTICALS` map inside `story-shell.html`. The scene templates are visual furniture; they don't know which vertical they're rendering until the shell hands them a `?preset=`.

---

## 2. The URL contract

Everything is parameter-driven. The URL fully determines what renders.

| Param | Values | Effect |
|---|---|---|
| `?vertical=` | `wealth`, `banking`, `insurance`, `provider`, `lifesciences`, `payor`, `fedgov`, `slgov`, `education`, `nonprofit`, `insurance-life`, `insurance-pc`, `provider-roi`, `slgov-311`, `slgov-benefits`, `slgov-recertification`, `slgov-vendor-compliance`, `slgov-employee-onboarding`, `slgov-licensing`, `banking-deposits`, `wealth-discovery` | Which `VERTICALS[k]` block the shell reads — drives all narration, tenant name, color, customer name. |
| `?usecase=` | (omitted) = onboarding · `maintenance` · `fraud-fabric` (alias `auth-fabric`) · `intake-3` · `intake-4` · `workspaces` · `sales-deepdive` · `procurement-deepdive` | Picks a different scene-keys array (and therefore a different set of iframed scene templates). See section 4. |
| `?splash=` | `0` or `1` | Forces the MasterCard-style Workspace splash on Scene 5 on or off. Omit to use the per-vertical `splashOk` default. |
| `?preset=` | (set by shell, not the human) | What each scene template uses to look up its own per-vertical content. |
| `?embed=1` | (set by shell) | Tells a scene template to hide its outer chrome because it's inside an iframe. |
| `?mode=` | template-specific | Variant inside one template (e.g. portal-shell `clear-idv-login` vs `action-webform`; agreement-desk `chain-of-custody` vs `approval-queue`). |

---

## 3. The five canonical scenes (default usecase)

Loaded in fixed order by the shell when no `?usecase=` is set:

| # | Scene key | Iframe loaded | What it shows |
|---|---|---|---|
| 1 | `agreement_desk` | `/story-templates/docusign-agreement-desk.html` | Sender webform / Maestro intake. Visualizes invisible Maestro orchestration. |
| 2 | `clear_idv` | `/story-templates/docusign-clear-idv.html` | Identity verification — desktop consent → mobile ID + selfie → biometric match. |
| 3 | `signing` | `/story-templates/docusign-signing-ceremony.html` | Branded email, START tab, Adopt Signature, multi-recipient routing, certificate. |
| 4 | `navigator` | `/story-templates/docusign-navigator.html` | Agreement Repository — extraction columns, AI assistant Q&A with citations. |
| 5 | `workspace` | `/story-templates/docusign-workspace.html` | Shared multi-party workspace — overview, tasks, activity, agent rail. Hosts the optional splash. |

The hotspot coordinates that pin the shell's tooltips to spots inside the iframes are **scene-keyed, not vertical-keyed** — they're shared across all 21 verticals because the visual furniture doesn't move per vertical.

---

## 4. The five flows per vertical

Same shell, different scene-keys array:

| Flow | URL | Scenes | Templates loaded |
|---|---|---|---|
| **Onboarding** (canonical) | `?vertical=<k>` | 5 | agreement-desk · clear-idv · signing · navigator · workspace |
| **Maintenance** | `?vertical=<k>&usecase=maintenance` | 3 | portal-shell (login mode) · webform-intake · agreement-desk (approval-queue mode) |
| **Fraud Fabric** | `?vertical=<k>&usecase=fraud-fabric` | 3 | portal-shell (login mode) · webform-intake · agreement-desk-chain-of-custody |
| **Intake** | `?vertical=<k>&usecase=intake-3` or `intake-4` | 3 or 4 | webform-intake · maestro-package · signing-ceremony [· workspace] |
| **Workspaces** | `?vertical=<k>&usecase=workspaces` | 1 | workspace only |
| **Headless IAM** | `/headless-iam/{fins,hls,ps}.html` | n/a | tenant-branded portal (separate file, not the shell) |

The three lookup tables that define this live near each other in `story-shell.html`:

- `USECASE_SCENE_KEYS` — which scene keys to render, in order.
- `USECASE_TEMPLATE_FILES` — which template HTML each scene loads.
- `USECASE_TEMPLATE_MODES` — optional `?mode=` per scene per usecase.

Find them around **line ~2073** in `stories/_shared/story-shell.html`.

---

## 5. Where narration lives — `VERTICALS` map

File: `stories/_shared/story-shell.html`. The `VERTICALS` constant starts at **line ~809**. One block per vertical. Shape:

```js
wealth: {
  label: "Wealth",
  tenant: "Hillside",
  subtitle: "× TGK Capital — Sub-Advisor Onboarding",
  tenantColor: "#3FDA99",
  preset: "wealth",            // ← key handed to scene templates as ?preset=
  category: "onboarding",
  splashOk: true,              // splash shows by default on Scene 5

  scenes: [                    // exactly 5, in canonical order
    {
      tag: "SCENE 1 OF 5 · INTAKE · SENDER WEBFORM",
      head: "Cathie Woods at Hillside is bringing TGK Capital onboard…",
      persona: { side:"advisor", name:"Cathie Woods", role:"Director of Advisor Onboarding · Hillside" },
      lede:  "<p>Cathie opens a new sub-advisor engagement…</p>",
      beats: [                 // exactly 5, one per hotspot
        { head:"…", lede:"<p>…</p>" },
        { head:"…", lede:"<p>…</p>", persona:{…} },  // optional per-beat persona override
        …
      ]
    },
    …4 more scenes…
  ],

  // optional: replaces scenes when ?usecase=<key>
  usecases: {
    maintenance:   { scenes: [ /* 3 scenes */ ] },
    "fraud-fabric":{ scenes: [ /* 3 scenes */ ] },
    workspaces:    { scenes: [ /* 1 scene  */ ] }
  }
}
```

**Quick line index** (verticals appear in this order in the file):

| Vertical | `scenes:` line |
|---|---|
| `wealth` | 813 |
| `banking` | 878 |
| `insurance` | 934 |
| `provider` | 986 |
| `lifesciences` | 1040 |
| `payor` | 1094 |
| `fedgov` | 1148 |
| `slgov` | 1201 |
| `education` | 1253 |
| `nonprofit` | 1305 |
| `insurance-life` | 1357 |
| `insurance-pc` | 1408 |
| `provider-roi` | 1459 |
| `slgov-311` | 1513 |
| `slgov-benefits` | 1564 |
| `slgov-recertification` | 1615 |
| `slgov-vendor-compliance` | 1666 |
| `slgov-employee-onboarding` | 1717 |
| `slgov-licensing` | 1768 |
| `banking-deposits` | 1819 |
| `wealth-discovery` | 1870 |

(These shift when the file is edited — re-grep `^\s*<key>:` to refresh.)

---

## 6. Where workspace presets live

File: `story-templates/docusign-workspace.html`. The `PRESETS` constant starts at **line ~544**. One entry per vertical key — drives the right-hand workspace surface (tenant brand, email subject, summary card, sections list, activity log, Iris callouts, agent rail, splash descriptor).

This is the **only** scene template that carries narration data of its own. The other four scene templates are mostly visual; they accept `?preset=` for tenant branding and a few labels but their content is largely shared.

---

## 7. Decision tree — "I want to change X. Where do I edit?"

Follow the first match.

**1. Change the words a persona is saying / a beat headline / a sidebar paragraph in a story.**
   → Open `stories/_shared/story-shell.html`. Find `VERTICALS.<key>.scenes[<sceneIdx>].beats[<beatIdx>]`. Edit `head` or `lede`.

**2. Change the customer name, tenant name, color, or splash default for a vertical.**
   → Same file. Edit the top-level fields on the `VERTICALS.<key>` block (`tenant`, `subtitle`, `tenantColor`, `splashOk`).

**3. Change something in the workspace surface for a vertical** (sections, activity log, agent-rail tasks, splash descriptor).
   → `story-templates/docusign-workspace.html`, `PRESETS.<key>`.

**4. Change the visual furniture of a scene** (the iframe content itself, e.g. how the Signing ceremony looks for everyone).
   → The relevant `story-templates/docusign-<scene>.html`. Note this changes the scene for **every** vertical at once — visual furniture is shared.

**5. Change the *flow* — which scenes/templates load for a usecase.**
   → `story-shell.html`, the `USECASE_SCENE_KEYS` + `USECASE_TEMPLATE_FILES` + `USECASE_TEMPLATE_MODES` triplet near line ~2073.

**6. Change the in-iframe internal scene that a beat advances to** (e.g. "beat 3 of Signing should jump the iframe to internal `s4`, not `s3`").
   → `BEAT_TO_INTERNAL` map in `story-shell.html` near line ~2155.

**7. Change a use-case-specific narration block** (maintenance / fraud-fabric / workspaces copy that differs from canonical).
   → `VERTICALS.<key>.usecases.<usecase>.scenes[…]` inside `story-shell.html`. If a vertical doesn't author one, the shell falls back to canonical Scene 5 for `workspaces` and produces empty/generic for the others.

**8. Add a new vertical.**
   → Three edits: (a) add `VERTICALS.<key>` block with full 5 scenes; (b) add a matching `PRESETS.<key>` block in `docusign-workspace.html`; (c) create `stories/story-<key>/index.html` as a 1-line meta-refresh redirect.

**9. Add a new flow that's neither onboarding/maintenance/fraud/intake/workspaces.**
   → Add a key to `USECASE_SCENE_KEYS` + `USECASE_TEMPLATE_FILES` (+ optionally `USECASE_TEMPLATE_MODES`). Author per-vertical narration under `v.usecases.<newkey>.scenes`.

**10. Add a callable vignette** (a Docusign moment that any vertical can iframe in as a drill-down — see Connected Forms in `CANONICAL.md` § Callable Vignettes).
   → New file at `/story-templates/docusign-<name>.html` honoring the `?embed=1`/`?preset=`/postMessage contract. Doesn't touch the shell unless you want a vertical's beat to call it.

---

## 8. Beat → internal-scene choreography

Each shell beat (5 per scene) tells the iframed template to advance to a specific internal scene id via postMessage. The mapping lives in `BEAT_TO_INTERNAL` in `story-shell.html`:

```js
agreement_desk: ["s1","s2","s2","s3","s3"],   // submit → arrives → click row → docs tab → send
clear_idv:      ["s1","s2","s3","s6","s7"],   // consent → identity → phone → mobile selfie → verified
signing:        ["s1","s2","s3","s4","s5"],
navigator:      ["s1","s2","s3","s4","s4"],
workspace:      ["s1","s2","s3","s4","s5"],
webform_intake:    ["s1","s2","s3","s4","s5"],
portal_clear_idv:  ["s1","s2","s3","s4","s5"],
sales_deepdive:    ["s1","s2","s3","s4","s5"],
procurement_deepdive:["s1","s2","s3","s4","s5"]
```

Override per-vertical via the admin localStorage key `tgkAdmin.beatToInternal` if a vertical wants different beat semantics — no shell edit required for one-offs.

---

## 9. Entry surfaces (where users land)

| Surface | File | Notes |
|---|---|---|
| Picker (canonical) | `/picker.html` | Function-first (Procurement / Sales / CX). CX expands inline to vertical wizard. |
| Geos (legacy) | `/geos.html` | Now a redirect to picker, forwarding `?cluster=`. |
| Index-unified (legacy) | `/index-unified.html` | Now a redirect to picker, forwarding `?mode=`. |
| Per-vertical entry | `/stories/story-<key>/index.html` | 1-line meta-refresh to shell. **Do not edit narrative here** — these are deliberately thin. |
| Headless IAM | `/headless-iam/{fins,hls,ps}.html` | Tenant-branded portals; not the shell. |

---

## 10. What lives outside the shell (don't accidentally edit it expecting a shell change)

- **Audit toolkit** — `/_audits/`, `/audit.html`, `/admin/audit`. Persona × fiction audit + contributor edit queue. Run `bash _audits/_persona_audit_build.sh` to refresh.
- **Wizard primitive** — `/assets/wizard/{wizard.css,wizard.js}`. Generic "stage 1..N + back button" wizard. Used by picker.
- **Demo-stage primitive** — `/assets/demo-stage/{css,js}`. Virtual clock + beat-snap scrubbing for sales/procurement deep-dives.
- **Flipbooks** — `/flipbooks/`. MP4 → stills → HTML pipeline (`_extract_frames.py`, `_new_flipbook.py`). The sales-deepdive and procurement-deepdive usecases iframe stages from here.
- **Future-state component mocks** — `/components/future-state/` (~100 files). Not yet wired into Navigator surfaces — see CANONICAL.md P3.

---

## 11. Hosting model (so edits don't break in one target)

Two targets, one source:

- **Replit** (`server.js` + Express) — live working environment. Backend routes only work here.
- **GitHub Pages** (`jnimbles03.github.io/tgk-2.0/`) — static-only mirror. Auto-deploys on push to `main`; the workflow's `rewrite-paths.mjs` prepends `/tgk-2.0/` to every root-relative path.

**Source files use root-relative paths** (`/assets/…`, `/story-templates/…`, `/api/feedback`). Don't convert to relative — both targets depend on the absolute form.

GitHub repo: `jnimbles03/tgk-2.0` (private). Mac working copy: `/Users/patrickmeyer/Documents/Claude/Projects/TGK 2.0`. **Never edit in the Repl** — Mac is the source, GitHub is truth, Replit deploys.

---

## 12. The 30-second lookup recipe

Someone asks: *"Change the lede on the third beat of Scene 2 in the banking-deposits maintenance flow."*

1. Open `stories/_shared/story-shell.html`.
2. Search for `"banking-deposits"` (line ~1819).
3. Inside that block, find `usecases.maintenance.scenes[1].beats[2]`.
4. Edit `lede:`.
5. Save. Reload `/stories/_shared/story-shell.html?vertical=banking-deposits&usecase=maintenance`.
6. Done. No other file touched.

If the change is to **what** is shown in the iframe (not the words around it), step 1 is `story-templates/docusign-<scene>.html` instead — and the change applies to every vertical that uses that scene template.
