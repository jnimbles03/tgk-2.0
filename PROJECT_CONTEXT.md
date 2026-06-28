# TGK 2.0 — Project Context for AI Agents

A reskinnable **Docusign IAM (Intelligent Agreement Management) demo experience**
for AEs. The deliverable is a set of self-contained HTML demos plus a **builder**
that lets an AE pick/brand/generate a demo to share with a customer. Almost
everything is static, inlined HTML/CSS/JS — no build step, no framework.

> This file is the durable, hard-won context. Pair it with the rules in the
> root `CLAUDE.md` (graphify + product-naming) which still apply.

---

## 1. Environments & deployment (READ FIRST — explains most "bugs")

- **GitHub Pages** — `https://jnimbles03.github.io/tgk-2.0/`. **Static, no backend.**
  Auto-deploys on push to `main`. This is the preview most people see.
- **Replit** — `https://tgk-deux.replit.app`. **Live, has the backend** (link
  generation `/api/...`, audit hydration, editor allowlist commits).

**Implication:** anything that needs the backend **fails on the static Pages
mirror** — Bespoke "Generate URL" (mints share links), "Customize in Bespoke"
audit hydration, and the `/api/verticals/...` editor saves. On Pages these throw
network errors (e.g. `HTTP 0`). That is the usual explanation for "the builder is
broken/buggy" reports — confirm which URL before chasing a code bug.

## 2. Workflow

- Develop on the feature branch (this session: `claude/eager-brown-pdqsfx`),
  open **draft PRs to `main`**. The repo has **no PR CI configured** — `get_check_runs`
  returns empty; the "pending" status is just an empty status set.
- Pages deploys from `main`, so merged work is live within a minute or two.

## 3. Product naming (see root CLAUDE.md for the full rule)

**Display text only:** "Maestro" → "Workflow Builder", "Navigator" → "Agreement
Manager". **Filenames, URLs, demo-catalog keys, CSS classes, IDs keep the old
slugs** (`demos/maestro.html`, `demos/navigator.html`,
`docusign-maestro-address-change.html`, keys `'maestro'`/`'navigator'`, the
shell's `path.indexOf("maestro-address-change")`). The browser `navigator` API
(`navigator.clipboard`, etc.) is **unrelated** — never touch it. `demos/agreement-manager.html`
is a *separate* AI-worksheet demo, distinct from `demos/navigator.html`.

## 4. The three top-level surfaces

| Surface | File | Notes |
|---|---|---|
| Builder (canonical entry) | `builder.html` | OotB + Bespoke + Advanced timeline |
| Story player | `stories/_shared/story-shell.html` | canonical 5-scene story, 21 verticals |
| Standalone demos | `demos/*.html` | direct-link product vignettes |

`index.html` (root `/`) and `picker.html` both **redirect to `/builder.html`**
(picker was retired). Don't reintroduce links to the picker.

## 5. `builder.html` internals

Two pickers + an advanced editor, all in one file (~5000 lines, two inline
`<script>` blocks). Validate edits with the parse harness in §9.

- **Out of the Box (OotB)** — TurboTax-style 3-question wizard:
  vertical → sub-vertical → archetype → launch card. IIFE `initOotbMode`.
  - `OOTB_MAP` (verticals → subs → `demos`), `ARCHETYPES` (6 keys:
    `full, maintenance, fraud, docintel, workspaces, headless`).
  - `renderStep(1..3)`, `cards()`, `renderLaunch(archetypeKey)` (the launch
    card — guard `state.sub.demos[key]` before reading `.title`).
  - `renderFinsAccel()` adds the 3 FINS "BET" cards on step 3 when vertical=`fins`.
- **Guided Bespoke** — 4-step wizard (Start → Scenes → Brand → Generate).
  IIFE `initGuidedBespoke`. `START_OPTS`, `renderStart/renderScenes/renderBrand/
  renderGenerate`, drives the real timeline via `window.__timeline` and the real
  `f-*` form fields. Exposes `window.__guidedBespoke = { apply, setView }`.
  - **Generate** clicks the real `#btnGenerate` and polls `#resultUrl`/`#errorPanel`
    — needs the backend (see §1).
- **Advanced timeline** ("iMovie") — the full scene/timeline editor (`.mid` grid,
  `#seqSelect`, `window.__timeline`). Reached via `setView('advanced')`; there's
  now an always-visible **"Advanced timeline"** topbar button (`#advTimelineBtn`)
  that does `pillBespoke.click()` then `__guidedBespoke.setView('advanced')`.
- **Two mode systems on the same pills** (`#modeOotb`/`#modeBespoke`), both fire
  on click — System 1 `initOotbMode` (`body.is-ootb` / `body.is-gb`, pill
  `.is-active`) and System 2 `initBuilderMode` (`body.mode-ootb`/`mode-bespoke`,
  pill `.active`). `.mid` shows the panels when `is-ootb`/`is-gb`, and the
  timeline grid when `mode-bespoke && !is-gb`. `.ootb-wizard` (#ootbWizard) is the
  **retired static picker** — hidden in both modes, effectively dead. The live
  panels `#ootbPanel`/`#gbPanel` live inside `.mid`.
- `agenticBadge()` is a shared helper defined at script scope **between** the two
  IIFEs, used by both `cards()`/`finsBetCard()` (OotB) and `startCard()` (Bespoke).
- **Apostrophes:** JS single-quoted title strings use the unicode `’` (U+2019),
  not a straight `'`, to avoid breaking the string.

## 6. `story-shell.html` + scene templates

- Canonical **5-scene story**, 21 verticals, driven by `?vertical=<key>` (+
  `?usecase=`, `?splash=1`). Scenes are `story-templates/*.html` loaded as
  **iframes**; the shell drives them by `postMessage({type:'tgk:lockToBeat',
  sceneId:'s1'..'s5'})`. Each template has `showState(sceneId)` / `replayState`
  and `data-hotspot` anchors the shell's hotspots point at. **Preserve these
  exactly when editing a template** or you break autoplay/calibration.
- Config maps: `SCENE_KEYS`, `USECASE_SCENE_KEYS`, `USECASE_TEMPLATE_FILES`,
  `USECASE_TEMPLATE_MODES`, `BEAT_TO_INTERNAL`, `SCENE1_TEMPLATE_OVERRIDE`.
- `?usecase=auth-fabric` aliases to `fraud-fabric`.
- `?usecase=bookend-los` is **FINS Bet 1** ("Customer Experience Platform"): the
  `banking` (Meridian) story re-lensed so each of the 5 canonical scenes shows
  Docusign modernizing the CX **around nCino**. nCino is framed as the *brains*
  that decide which loan documents to generate and sign — **not** a generic
  system-of-record we write back to: Web Forms + **docgen** generate nCino's
  document package, the **workflow builder** orchestrates identity and then
  *finalizes the loan beyond what nCino offers natively*, eSignature completes,
  Workspaces for everything else. Reuses the default templates/visuals
  (narration-only override in the `tgk-usecases` bundle) and shows a persistent
  `#bet1-bookend` thesis rail (clones `#ff-thesis`). The builder's **BET 1 ·
  Best-in-class CX** card launches it.
- **Fraud-fabric** (and **BET 2**, = `?usecase=auth-fabric` → fraud-fabric) = a
  **4-scene change-of-address** flow (standardized across all verticals):
  portal-shell (CLEAR/IDV at entry) → **industry portal** → webform-intake (no
  signature, inherits the biometric proof) → `docusign-maestro-address-change.html`
  (the "Workflow Builder" vignette). **Scene 2 (industry portal)** embeds the real
  **headless-iam** page for the vertical's industry (`fins`/`hls`/`ps`, mapped in
  `_headlessPortalFor`) via `?story=1`; that page's story-embed bridge shows a
  **"Start request"** CTA (`data-hotspot="portal_action"`) that posts
  `tgk:portalContinue`, advancing the story to the webform. The portal scene is
  **synthesized + spliced in** (not in the bundle) by `spliceFraudFabricPortal`,
  called from BOTH the initial scene resolution AND the async-rebuild path (the
  one that actually loads the bundle — easy to miss); it renumbers the bundle's
  `OF 3` tags to `OF 4`. Thesis (persistent rail callout `#ff-thesis`): a
  low-risk-looking action still needs **portal auth bound to portal action**.
- **Narration rail** = persona chip + `step-label` + `headline` + `lede`
  (multi-paragraph ledes recede via `.lede p + p`). `?splash=1` shows the
  MasterCard-style intro splash (`.mc-splash`, in `docusign-workspace.html`).
- `story-templates/*` are a **separate system** from `demos/*` — don't confuse
  them. Dead templates already removed/ignored: `docusign-webform.html` (deleted),
  `portal.html`, `docusign-maestro-loop.html`, `docusign-ehr-desktop.html` (only
  referenced by the admin tool).

## 7. Demos & engines (`demos/`)

- Engine: `demos/engine/demo-engine.{js,css}` + `demos/engine/agent-chat.{js,css}`.
- `DemoEngine.init({...})` = autoplay timeline/cursor demo. `DemoEngine.interactive
  ({ ..., setup(pack, root, api) })` = interactive; `api` has `narrate/progress/
  done/auto/after`.
- `AgentChat.mount({ chatEl, chipsEl, intro?, hint?, speed?, exchanges:[{label,
  user, answer, card?, after?(api)}] })` — clickable canned questions → typing
  indicator → **typewriter answer** → optional reveal card. Re-callable on reskin.
- **Every agent demo is interactive** (click a canned question → typewriter
  answer): `navigator, agreement-manager, agreement-intel-ma,
  agreement-intel-sf-draft, clm, agreement-desk, ai-review, search, agentforce`.
- **In-story agent moments** use a *different* bespoke pattern (not AgentChat):
  `renderIrisQA` / `askIris` / `typeIris` (+ `.iris-q` / `.iris-answer-panel` /
  source chips) — present in `docusign-workspace.html`,
  `docusign-navigator-worksheet.html`, `docusign-agents.html`. When adding agent
  interactivity to an in-story template, **replicate the workspace Iris pattern**,
  keep it additive, and don't disturb the beat-sync.
- `builder/lib/demo-catalog.js` maps demo keys → files/labels (keys keep old slugs).

## 8. Headless IAM (`headless-iam/{fins,hls,ps}.html`)

Customer-portal pages with Docusign IAM moments as in-context drilldowns
(`openDemo`/`IAM_DEMOS`). They share an additive **Approvals & Action Queue**
(`.apv-*`) where each item expands on click to reveal details (requester / action
/ amount / risk / linked agreement / next step) and hands off to live demos.
These files contain a real browser `navigator.*` — leave it alone.

## 9. Verifying changes (no test runner)

- **Inline-JS parse check** (run after editing any HTML with inline scripts; skips
  `application/json` data blocks):
  ```
  node -e 'const fs=require("fs");const h=fs.readFileSync("FILE","utf8");const b=[...h.matchAll(/<script(?![^>]*(?:src|application\/json))[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);let ok=true;b.forEach(x=>{try{new Function(x)}catch(e){ok=false;console.log("ERR",e.message)}});console.log(ok?"OK":"FAIL")'
  ```
- **Headless flow simulation** — `jsdom` is **not** installed by default but
  installs cleanly (`npm install jsdom --no-save --prefix /tmp/jsdom-test`). Load
  `builder.html` with `runScripts:'dangerously'` and a `beforeParse` that stubs
  `fetch` (return `{ok:false,status:0,json:..}`), `open`, `prompt`, `scrollTo`,
  `IntersectionObserver`, `ResizeObserver`, `matchMedia`, `navigator.clipboard`,
  then click `.ootb-card`s / pills to drive OotB & Bespoke and assert no thrown
  errors. This caught/cleared the builder-flow concerns this way.
- When editing scene/workspace templates, also grep-confirm the preserved
  `showState`/`showWorkspaceState`, `s1..s5`, `tgk:lockToBeat`/`tgk:queryRect`,
  and the `data-hotspot` anchors are still present.

## 10. graphify

Knowledge graph in `graphify-out/`. For codebase questions run
`graphify query "<q>"` first (or `path`/`explain`); use `graphify-out/wiki/` for
navigation. After modifying code, run `graphify update .` (AST-only, no API cost).

## 11. Subagent caution

Subagents are useful for parallel template work but **do not let them run
`git reset`/commit** — one reset un-committed pushed work this session and
diverged the branch. Tell them explicitly: edit + verify only, never touch git.
Recover a divergence with `git reset --mixed origin/<branch>` (keeps the worktree)
then re-commit the deltas.
