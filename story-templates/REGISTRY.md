# TGK 2.0 — Story Template Registry

This file is the source of truth for what templates exist, what each one
covers, and how to adapt them per vertical. Check this file **before** building
anything new — most "new" surfaces turn out to be an existing template + a
different SoR badge kit.

## Two visual registers (don't mix them up)

**Story-level templates** (this folder) are the polished, animated mocks used
for the signature moments in a demo loop. Browser-chrome fidelity, amber CTAs,
phone mockups, dark CLEAR stages — the stuff that makes the demo feel like a
real product walk-through.

**Component-level mocks** (under `/components/future-state/`) are the 89+
inline scene snippets that use the shared Docusign tenant chrome (`.ds-topbar`
+ `.tenant-bar` + `.scene-head` + per-scene body). Each story arc is built
from a combination of both.

Story-level templates plug **into** a drill-down iframe inside a component
mock, or serve as the anchor moment of a story loop. They are not meant to
replace the component-level mocks — the two coexist.

---

## Templates

### 0. `docusign-workspace.html` — canonical Workspaces template

**Covers:** The full Docusign Workspaces experience. Scene 1 is a
tenant-branded access email that fades after 4s into Scene 2 — the
working Workspace (topbar · tenant bar · tabs · Overview/Tasks views ·
Activity + Ask Iris rail). Clicking a task opens a drill-down with a
document viewer and a vertical-appropriate AI agent running live
checks, then producing a summary.

**Best for:** Scene 4 (MasterCard / Workspaces) across every vertical.
This is what the "For everything else, there's Workspaces" splash
leads into.

**Preset-driven — all tenant content lives in the `PRESETS` registry
at the bottom of the file.** 10 verticals ship: wealth, banking,
insurance, provider (health), lifesciences, payor, fedgov, slgov,
education, nonprofit. Each preset carries tenant brand (name,
wordmark, primary/accent colors, mark SVG), the access email body,
workspace title + participants, Overview summary (hero, tiles, recent
list), two Tasks sections, Activity thread, Iris hero + agreement list,
and the agent's check list + summary.

**Switch verticals:**
- `?preset=banking` URL param
- `#insurance` URL hash
- Click the bottom-right preset chip to cycle

**Bolt on the MasterCard Scene 4 intro:** add `?splash=1` to the URL.
The script loads `/stories/_shared/mastercard-splash.css` + `.js`
automatically and passes a preset-specific `data-descriptor`. The
`.mock` root carries the `workspaces-demo` opt-in marker so the shared
splash module's guard passes.

**Adaptation slots (to add a new vertical/subvertical/process):**
- Append a new entry to `PRESETS` — copy any existing entry and swap
  every field. No DOM edits required.
- Override `--tn-primary` and `--tn-accent` via the preset's tenant
  colors (done automatically in `applyPreset`).
- All element IDs are stable — the tenant wordmark, tiles, activity
  rows, Iris agreements, and agent checks re-render from the preset.

**Brand mark:** topbar uses `/assets/brand/docusign-iam-mark-on-light.png`
via an `<img>` inside `.ds-logo-mark`. Keep that reference; don't
rebuild as SVG.

---

### 1. `docusign-webform.html`

**Covers:** Docusign Web Forms — multi-step data intake with browser-chrome
fidelity (macOS window dots, `docusign.IAM` wordmark, `docusign.com/webforms`
URL bar, yellow/amber primary CTA, green-check success state). Based on the
canonical Web Forms product demo.

**Best for:** any "client fills out a form" moment — insurance claim intake,
benefits application, wealth account opening, patient consent capture.

**Adaptation slots:**
- `.tenant` block — swap the co-brand mark + "For {Tenant}" label on the right
  of the URL bar
- Each `.scene .step-title` + field list — swap per intake topic
- URL path fragments in `.url-text .u-N` — swap to match the form's name

---

### 2. `docusign-clear-idv.html`

**Covers:** Docusign + CLEAR identity verification in a phone mockup — ID
picker → selfie capture → biometric matching → verified. Navy CLEAR
header (`✦ CLEAR`), blue #2A65E3 CTAs, green-check success.

**Best for:** any re-verification / IDV moment that needs to feel high-trust
and biometric — Reg S-P re-verification, wire authorization callback, KYC
refresh, high-value disbursement.

**Adaptation slots:**
- `.context` strip on the left of the phone — swap kicker, title, subtitle, and
  4-item checklist per trigger (only thing that changes per vertical)
- Phone interior stays CLEAR-branded everywhere

---

### 3. `docusign-maestro-loop.html`

**Covers:** Docusign Maestro — parallel workflow orchestration. Three lanes
streaming tokens into position, status chip flip from "Running" to
"Complete", outcome callout on the right, SLA before/after card. Uses the
standard Docusign topbar + tenant bar chrome so it slots into the same
story grammar as component mocks.

**Best for:** any "multiple things happen in parallel" moment — claim
investigation, evidence orchestration, onboarding packet assembly, policy
issuance, recovery workflow. This is the highest-leverage template —
84 of 95 future-state components follow this pattern.

**Adaptation slots:**
- `.ds-product` + `.ds-crumb` text in topbar
- Tenant name + `.t-dot` accent color
- Lane titles + tokens (3 lanes × 4 tokens each)
- Outcome metric in `.ms-cv`
- SLA before/after copy in `.ms-sla`

---

### 4. `docusign-navigator.html`

**Covers:** Docusign Navigator — agreement repository with AI-extracted
columns, document detail with AI-Assisted fields panel + citation
highlights, and Docusign Iris AI chat panel with grounded summarization.
Three-scene 20s loop.

**Best for:** any "search across agreements + AI extraction" moment — M&A
diligence, contract renewal portfolio, compliance review, assignment-clause
audit. Also works for **any repository-style SoR** (Veeva Vault, Workday
Navigator, Salesforce Contracts) via badge swap.

**Adaptation slots:**
- `.rail-custom-dashboards` list — vertical-specific dashboards
- Row data in Scene 1 — file names, parties, values, dates, risk flags
- AI-Assisted fields in Scene 2
- Iris query + Key Terms table + hierarchy in Scene 3

---

### 5. `docusign-agents.html`

**Covers:** Docusign Agents — three surfaces: runtime chat with step
indicators + streaming, agent library with prebuilt + custom cards, Agent
Studio with AI Assistant chat + Instructions/Logic/Test Cases tabs.

**Best for:** any "AI agent does the work" moment — Risk Scoring, Obligation
Tracker, Negotiator Assistant, Contract Reviewer. Positions Docusign as a
domain-specific agent platform, not a generic chatbot.

**Adaptation slots:**
- Scene 1: agent name + user query + response + step labels
- Scene 2: prebuilt/custom agent card grids
- Scene 3: agent-being-edited + capabilities list + instructions +
  guardrails

---

### 6. `docusign-ehr-desktop.html`

**Covers:** EHR clinician desktop (Epic Hyperspace / Cerner PowerChart
pattern). Dense teal top chrome with activity toolbar, navy patient banner,
Admission Navigators with Home-Meds review list, yellow sticky note, blue
"Mark as Reviewed" footer, and an In Basket slide-in panel showing an ROI
request routed from Docusign. Intentionally dense and dated — that's what
makes it instantly recognizable to anyone who's worked in a health system.

**Best for:** any HLS provider-side story where Docusign integrates with the
EHR — Release of Information, cosign workflows, patient-consent capture,
authorization signing for disability / workers' comp / claims.

**Adaptation slots:**
- `.ehr-titlebar .vendor` block — swap Epic / Cerner / Meditech badge
- Patient rail data (name, MRN, room, allergies, vitals)
- Activity toolbar active state
- Main content — swap meds list for Notes / Orders / Imaging / ROI queue
- `.ehr-inbasket` Docusign-routed item (the "hand-off into Docusign" beat)

---

## SoR badge kits

A badge kit is a tiny per-vendor recipe — primary color, secondary color,
logo treatment, URL pattern, chrome rhythm — that lets any of the templates
above read as "running on {SoR}" without a new build. Use the table below
as the swap reference. Where a demo video exists in `/Youtube demos/`, the
filename is noted so you can re-capture colors/logos directly.

### Banking

| Vendor | Primary | Accent | Logo | URL pattern | Best template pair | Demo on file |
|---|---|---|---|---|---|---|
| **nCino** | `#002B5C` navy | `#00A3E1` cyan | "nCino" wordmark, lowercase-n mark | `*.ncino.com` | Maestro LOOP + Navigator | needed |
| **MeridianLink** | `#002B49` navy | `#00A7CF` aqua | Lowercase "meridianlink" | `*.meridianlink.com` | Maestro LOOP (loan orig) | ✓ FirstClose MeridianLink |
| **Fiserv Premier / DNA** | `#FF6600` orange | `#002F5F` navy | "fiserv." wordmark | N/A (legacy client-server) | Maestro LOOP, Component-level tenant bar | ✓ Fiserv ACH Stop-Payments |
| **Q2** | `#003057` navy | `#00BFB3` teal | "Q2" with dot | `*.q2.com` | Navigator (member 360) | needed |
| **Symitar Episys** | `#003E7E` Jack-Henry blue | `#7FB539` green | "Symitar" + JH mark | legacy client UI | Component-level tenant bar only | needed |

### Wealth Management

| Vendor | Primary | Accent | Logo | URL pattern | Best template pair | Demo on file |
|---|---|---|---|---|---|---|
| **Salesforce FSC** | `#0176D3` core blue | `#1B96FF` sky accent | Cloud mark + "Salesforce" | `*.lightning.force.com` | Navigator | ✓ FSC for Wealth |
| **Charles Schwab Advisor Center** | `#00A0DF` Schwab blue | `#0C2340` navy | "charles SCHWAB" | `advisorservices.schwab.com` | Navigator | ✓ Schwab Dashboard |
| **Fidelity Wealthscape** | `#00945F` Fidelity green | `#002147` navy | "Fidelity" pyramid mark | `wealthscape.fidelity.com` | Navigator (advisor view) + Web Forms (onboarding) | ✓ Wealthscape Onboard / Investor / Mobile |
| **Redtail CRM** | `#C8102E` Redtail red | `#7A0B1E` darker red | "redtail" wordmark (lowercase) | `crm.redtailtechnology.com` | Web Forms + CLEAR + eSig + Navigator (material change, self-service) | needed (not yet captured) |
| **Orion** | `#E03C31` red | `#231F20` black | "Orion" wordmark | `portal.orionadvisor.com` | Navigator (client portal) | ✓ JFL Orion Client Portal |
| **Tamarac / Envestnet** | `#F26522` orange | `#2C2E35` near-black | "Tamarac" + Envestnet mark | `advisorxi.tamaracinc.com` | Navigator + Maestro (rebalance) | ✓ Tamarac Advisor Xi |
| **Addepar** | `#003057` navy | `#F6A800` amber | "Addepar" wordmark | `*.addepar.com` | Navigator (HNW reporting) | needed |

### Insurance P&C

| Vendor | Primary | Accent | Logo | URL pattern | Best template pair | Demo on file |
|---|---|---|---|---|---|---|
| **Guidewire InsuranceSuite** | `#1A4E9E` navy rail | `#2469B8` Guidewire blue (action buttons, "Request" pills) | "PolicyCenter™" lowercase with blue square mark | on-prem / Citrix | Navigator (PolicyCenter — navy left rail, main canvas with tabs, status-dot data tables) + Maestro (ClaimCenter) | ✓ HazardHub in PolicyCenter (best capture); Day 2 still broken |
| **Duck Creek** | `#003865` navy | `#FFCD00` yellow | "Duck Creek" with duck mark | `*.duckcreek.com` | Navigator + Maestro | ✓ Duck Creek Technologies |

### Insurance L&A

| Vendor | Primary | Accent | Logo | URL pattern | Best template pair | Demo on file |
|---|---|---|---|---|---|---|
| **Duck Creek Life** | `#003865` navy | `#FFCD00` yellow | "Duck Creek" with duck mark | `*.duckcreek.com` | Workspaces + Web Forms (death claim) + Maestro (LTD) | ✓ Duck Creek Technologies (shared with P&C) |
| **FINEOS** | `#0033A0` royal blue | `#FFC20E` yellow | "FINEOS" all-caps | `*.fineos.com` | Maestro (claims) + Web Forms (FNOL) | needed |
| **Majesco** | `#0093D0` cyan | `#6E2B8C` purple | "Majesco" wordmark | `*.majesco.com` | Navigator + Maestro | needed |
| **Oracle OIPA** | `#C74634` Oracle red | `#312D2A` charcoal | "ORACLE" all-caps | on-prem | Component-level tenant bar (legacy) | needed |

### Payor

| Vendor | Primary | Accent | Logo | URL pattern | Best template pair | Demo on file |
|---|---|---|---|---|---|---|
| **TriZetto Facets / QNXT** | `#005EA2` Cognizant blue | `#10069F` deeper blue | "TriZetto" wordmark | legacy client UI | Component-level tenant bar only (dense form era) | ✓ PracticeAdmin / TriZetto Claim |
| **HealthEdge** | `#1B3E8B` navy | `#E87722` orange | "HealthEdge" wordmark | `*.healthedge.com` | Navigator + Maestro | needed |

### Healthcare Provider (HLS)

| Vendor | Primary | Accent | Logo | URL pattern | Best template pair | Demo on file |
|---|---|---|---|---|---|---|
| **Epic Hyperspace** (clinician desktop) | `#0B4D5F` teal | `#FFD54F` sticky-yellow | "Epic" + bug mark | citrix / thick client | EHR Desktop (default) | ✓ Epic Admit Patient |
| **EpicCare Link** (external provider portal) | `#2D7FBC` lighter blue-teal | `#E2231A` Epic red logo top-right | "Epic" red wordmark + tenant box top-left ("xtensys" in the demo) | `*.carelinknp.*/EpicCareLink/` | Navigator (simpler layout) or a stripped-down EHR Desktop variant | ✓ EpicCare Link Tutorial |
| **Oracle Health (Cerner PowerChart)** | `#1976D2` blue | `#C74634` Oracle red | "Oracle Health" + "Cerner" | `*.oraclecerner.com` | EHR Desktop (swap title bar) | ✓ Cerner Fax / Cerner Training |
| **Meditech Expanse** | `#F37021` coral-orange | `#00263A` navy | "Meditech" wordmark | web UI | EHR Desktop (swap title bar) | needed |

### Life Sciences

| Vendor | Primary | Accent | Logo | URL pattern | Best template pair | Demo on file |
|---|---|---|---|---|---|---|
| **Veeva Vault (eTMF / PromoMats / QualityDocs / RIM / Clinical Study Startup)** | `#172A42` navy top bar | `#F5A623` Veeva amber (active tab underline, highlight borders); `#2468A3` blue links | "V Vault {Suite}" (e.g. "V Vault Clinical") with a small square-V mark | `*.veevavault.com` | Navigator (heavy swap on column names per vault type; Vault Clinical shows 3-card dashboards with pie charts — use Maestro variant for progress dashboards) | ✓ Vault eTMF Series / Unified eTMF+CTMS / PromoMats / SiteVault / eTMF Homepage / Study Startup |
| **Veeva CRM** | `#005CB9` Veeva blue | `#F5A623` amber | "VEEVA" + CRM subproduct label | `*.veevacrm.com` | Navigator (rep home) + Web Forms (call reporting) | ✓ Veeva CRM Homepage |
| **Medidata Rave** | `#5A2D81` purple | `#F5A623` amber | "Medidata" + "Rave" | `*.mdsol.com` | Web Forms (CRF entry) + Maestro (study monitoring) | needed |

### Federal / State / Local Government

| Vendor | Primary | Accent | Logo | URL pattern | Best template pair | Demo on file |
|---|---|---|---|---|---|---|
| **ServiceNow (GRC / ITSM / Public Sector)** | `#62D84E` SN green | `#10069F` deep blue | "servicenow" wordmark | `*.service-now.com` | Navigator (list view) + Maestro (flow) | ✓ ServiceNow GRC |
| **Appian** | `#0F2B5C` navy | `#2563EB` blue | "appian" wordmark | `*.appiancloud.com` | Maestro (case) + Agent Studio (low-code) | ✓ Appian Case Studio / Investor Day |
| **Pega (Blueprint / Customer Service / CDH)** | `#0F1E40` deep navy frame | `#C41E3A` Pega red (action buttons like "Go" pills); `#6B2D8E` purple for AI-agent ✦ star | "PEGA" wordmark + ✦ AI star for Agent surfaces | `*.pegacloud.net` | Agents (chat panel floating on right of workflow) + Maestro (case desk) | partial — Pega Blueprint shows real UI with navy+red+purple-agent palette; Pega Customer Service 8.5 still broken; Signature Aviation / Agentic Fabric are brand films (no UI) |
| **Accela** | `#0087CE` blue | `#F15A22` orange | "Accela" wordmark | `*.accela.com` | Maestro (permitting) + Web Forms (application) | needed |
| **Tyler (EnerGov / Odyssey / Munis)** | `#004990` Tyler blue | `#A8C4E3` sky blue | "Tyler Technologies" | `*.tylerhost.net` | Maestro + Navigator | needed |
| **CGI Advantage** | `#E1261C` red | `#003B5C` navy | "CGI" mark | legacy client UI | Component-level only | needed |

### Education

| Vendor | Primary | Accent | Logo | URL pattern | Best template pair | Demo on file |
|---|---|---|---|---|---|---|
| **Slate by Technolutions** | `#2B5C8A` navy-blue | `#F5A623` amber | "slate" wordmark | `*.technolutions.net` | Navigator (admissions funnel) + Web Forms (app) | ✓ Slate Demo |
| **Canvas (Instructure)** | `#D02B32` Canvas red | `#394B58` slate | "instructure" or "Canvas" logo | `*.instructure.com` | Navigator (course list) | ✓ Canvas First Time |
| **Workday Student** | `#F38B00` Workday orange | `#000000` black | "workday" wordmark | `*.myworkday.com` | Navigator + Web Forms (enrollment) | ✓ Workday Student Experience |
| **Ellucian Banner** | `#007932` Ellucian green | `#1D1D1B` near-black | "Ellucian" wordmark | legacy Oracle-form UI | Component-level only (legacy) | needed |
| **PowerSchool SIS** | `#1E4D8C` navy | `#F5A623` amber | "PowerSchool" stacked mark | `*.powerschool.com` | Navigator (K-12 gradebook) | needed |

### Procurement / CLM (cross-vertical)

Enterprise contract & sourcing platforms used by procurement, legal ops, and
strategic supply teams. Cross-vertical — the same Emptoris instance might
sit behind a pharma sponsor's supply contracts, a federal agency's GWAC
record, or a manufacturer's tier-2 supplier book. Treat as a host portal
that a Docusign drill-down embeds into, not as a vertical of its own.

| Vendor | Primary | Accent | Logo | URL pattern | Best template pair | Demo on file |
|---|---|---|---|---|---|---|
| **IBM Emptoris Contract Management** | `#054ADA` IBM blue (links, primary buttons, active tab underline) | `#EE5396` IBM magenta (env badge, "NEW" pills); legacy Carbon palette throughout | IBM 8-bar mark in white on `#161616` masthead, then "Emptoris" + "Contract Management" suite name | hosted Carbon UI (`*.ibm.com/Emptoris/`); IBM Plex Sans + Plex Mono | Portal: `portals/enterprise-emptoris.html` (Workbench / My Tasks + Contract record detail) + Doc Gen / Web Forms / Workspaces / eSign / AI Review / Navigator / Agreement Desk embeds | needed (no demo on file; built from IBM docs + reference imagery) |
| **Icertis CLM** | `#0A2540` deep navy | `#FF8C00` Icertis orange | "icertis" wordmark | `*.icertis.com` | Same as Emptoris portal — palette swap | needed |
| **SAP Ariba Contracts** | `#0070F2` SAP blue | `#5B738B` slate | "SAP Ariba" stacked | `*.ariba.com` | Same as Emptoris portal — palette swap | needed |

---

## Vertical → template map (cheat sheet)

Quick reference for which combo assembles which story type. Add story arcs
below as they're authored so newcomers can grep and follow.

| Vertical | Story arc | Scene 0 | Scene 1 | Scene 2 | Scene 3 | SoR badge |
|---|---|---|---|---|---|---|
| Wealth · Onboarding | Address change | Advisor modal (component-level) | Web Forms | CLEAR | Navigator | FSC + Northbridge (tenant) |
| Insurance L&A · Death claims | Claim intake → investigation → payout | Component-level | Web Forms | Maestro | Navigator (audit) | FINEOS + carrier tenant |
| Insurance P&C · FNOL | First notice of loss | Component-level | Web Forms (photo upload) | Maestro (evidence) | Navigator (subro) | Guidewire / Duck Creek |
| Banking · Deposits | Account opening | Component-level | Web Forms | CLEAR (KYC refresh) | Maestro | nCino / Fiserv |
| Banking · Lending | Loan origination | Component-level | Web Forms (application) | Maestro (decisioning) | Agents (risk scoring) | MeridianLink / nCino |
| HLS · Provider ROI | Records request | EHR Desktop (In Basket beat) | Web Forms (patient consent) | CLEAR | EHR Desktop (records posted) | Epic / Cerner |
| Life Sciences · Clinical | Site agreement + informed consent | Component-level | Web Forms | CLEAR | Navigator (Vault eTMF) | Veeva Vault eTMF |
| Life Sciences · Commercial | PromoMats MLR approval | Component-level | Navigator (queue) | Agents (reviewer) | Maestro (approval flow) | Veeva Vault PromoMats |
| Payor · Prior auth | PA submission + decision | Component-level | Web Forms | Maestro | Navigator (decision record) | HealthEdge + TriZetto legacy |
| Public Sector · Benefits | Constituent application | Component-level | Web Forms | CLEAR (identity proofing) | Maestro (determination) | Salesforce PSS / Tyler |
| Public Sector · Licensing | Permit application | Component-level | Web Forms | Maestro | Navigator (issued permit) | Accela / Tyler EnerGov |
| Federal · Case work | FOIA / benefits claim | Component-level | Web Forms | Maestro (case triage) | Agents (policy assistant) | ServiceNow / Appian / Pega |
| Education · Admissions | Undergrad application + deposit | Component-level | Web Forms | CLEAR (identity verify) | Navigator (Slate pipeline) | Slate |
| Education · Employee onboarding | New faculty I-9 + policies | Component-level | Web Forms | CLEAR | Maestro | Workday |
| Procurement · CLM | Counterparty contract — author → negotiate → sign → activate | Emptoris Workbench (portal) | Web Forms (counterparty intake) | Workspaces / Agents (AI Review) | Web Forms (signing variant) → Navigator (executed) | IBM Emptoris |

---

## Conventions & notes

- Every template uses a **20-second loop** with **ease-in-out** scene transitions.
- Loop indicator lives at bottom-right (or bottom-left for the EHR template,
  which uses its own dense chrome). Always dark pill + light text.
- `--ds-cobalt` / `--ds-inkwell` / `--ds-ecru` are the shared brand tokens
  used in component-level mocks. Story-level templates sometimes diverge
  (Web Forms uses an amber CTA; CLEAR uses its own navy; EHR uses teal).
  These are intentional — Docusign's surface looks different from the SoR
  chrome it's embedded in.
- When adding a new badge kit, drop an entry in the table above **and** add
  a short note in this section if there's anything unusual (e.g., legacy
  systems with no web UI only use component-level tenant bars).
- When a demo arrives that doesn't fit an existing archetype, verify by
  checking all six templates first. Only build a new template if the
  archetype appears in at least three downstream stories.

---

## Sources

- Web Forms template — derived from the Docusign Web Forms product demo at
  `docu-sign-demo.replit.app`.
- CLEAR IDV template — derived from the CLEAR modal pattern embedded in
  `index-unified.html` around line 3429, plus the AMEX/M&A demo footage.
- Maestro LOOP template — modeled on
  `/components/future-state/component-loop-investigation-insurance-pc-claims.html`
  and 84 sibling components that share the archetype.
- Navigator template — derived from the three AMEX M&A demo recordings
  showing Navigator's list / detail / Iris surfaces.
- Agents template — derived from the "Exploring Docusign Regional
  Availability Agent" + Agent Studio screen recording.
- EHR Desktop template — modeled on real Epic Hyperspace frames and Cerner
  Reporting Portal frames from the YouTube demos folder.

Badge kits reference the demos stored under
`/Users/patrickmeyer/Documents/Claude/Projects/TGK 2.0/Youtube demos/`.
Re-capture colors and logo treatments directly from those files — don't
invent values from memory.

---

## Demo capture status (updated after second extraction round)

### Captured with real product UI (badge-kit ready)

`wealthscape_onboard`, `schwab_dashboard`, `appian_investor`, `duckcreek`,
`cerner_fax`, `meridianlink_loanspq`, `fiserv_ach`, `appian_case_studio`,
`epic_admit`, `veeva_crm_home`, `orion_portal`, `trizetto_claim`,
`cerner_training`, `fsc_wealth`, `servicenow_grc`, `slate_admissions`,
`tamarac_advisor`, `veeva_etmf_ctms`, `canvas_lms`, `veeva_etmf_home`,
`veeva_sitevault`, `veeva_promomats`, `veeva_etmf`, `wealthscape_mobile`,
`wealthscape_investor`, `workday_student`, `epiccare_link`,
`guidewire_hazardhub`, `veeva_vault_ssu`, `pega_blueprint`

### Captured but not useful (brand film / animated concept, no product UI)

- `pega_customer_service` (Signature Aviation x Pega — customer testimonial, no UI)
- `pega_agentic_fabric` — animated conceptual explainer, no UI

### Still broken / incomplete downloads (need re-capture)

- `EPIC In-Basket` — only thumbnail JPG, no video
- `Guidewire PolicyCenter Day 2` — only DASH audio fragment (video part missing)
- `InBasket and Communication` — no video files
- `Tech Talk Live; Pega Customer Service 8.5` — only DASH video fragment (audio missing, can't demux)
- `Veeva Vault Clinical eTMF Online Training (Proexcellency)` — DASH fragments only
- `myTectra - Guidewire` — DASH fragments only
- Three empty `Pegasystems - <numeric>` folders

### High-priority vendors still missing any demo

- **nCino** — still the primary banking SoR, zero demo captured
- **FINEOS** — primary L&A claims SoR, zero demo
- **Accela** — primary permitting SoR, zero demo
- **Tyler (EnerGov / Odyssey / Munis)** — zero demo
- **HealthEdge** — primary modern payor SoR, zero demo
- **PowerSchool** — primary K-12 SIS, zero demo
- **Ellucian Banner** — legacy higher-ed SIS, zero demo
- **Addepar / Envestnet** — wealth reporting, zero demo
- **Majesco** / **Oracle OIPA** — L&A policy admin, zero demo
- **Meditech** — #3 EHR, zero demo

### Multi-tenant story pattern (phase-2 onboarding, Apr 2026)

`stories/wealth-onboarding-v2/` introduces a **tenant-swap** pattern that
lets one story render as different SoR chromes without duplicating HTML.
The portal URL accepts `?tenant=<id>` where `<id>` is one of the tenants
declared in the recipe's `tenants` block; `portal-engine.js` merges that
tenant's brand tokens over the default `brand` block before rendering,
and propagates the param to every iframe drill-down so sibling scenes
stay in the same tenant. Scenes load `tenant-config.js` which overrides
`--tn-primary` / `--tn-accent` and rewrites elements marked with
`data-tenant-*` attributes at DOMContentLoaded.

Current supported tenants: `redtail` (default), `wealthscape`, `schwab`.

To port this pattern to another story:
1. Add a `tenants: { <id>: { primary, primary900, ..., name } }` dict to
   the recipe.
2. Copy `stories/wealth-onboarding-v2/tenant-config.js` into the story
   folder and edit the `TENANTS` object.
3. In every scene, use `data-tenant-letter`, `data-tenant-brand`,
   `data-tenant-sub`, `data-tenant-name`, `data-tenant-footer-tag` on the
   elements that should swap, and load `tenant-config.js` at the bottom.

### Chrome↔capture alignment notes for `/stories/`

The 10 canonical vertical portals are scaffolded with plausible vendor chrome,
but three stories have chrome branded to a vendor *product line* different
from what's actually been captured on video. These are playable standalone;
they will read as mismatched if shown side-by-side with the captured demo.
Accept-as-invented per audit 2026-04-23 — revisit if a capture of the matching
product lands.

| Story | Rendered chrome | Captured demo on file | Status |
|---|---|---|---|
| `payor-healthedge/` | HealthEdge HealthRules Payer | HealthEdge **Source** (claims editing, different product line) | Invented against HRP public brand |
| `federal-servicenow/` | ServiceNow for Government (Benefits / HR / FOIA) | ServiceNow **GRC** (different module) | Invented against ServiceNow core UI |
| `insurance-la-duckcreek/` | Duck Creek **Life** AdminSuite | Duck Creek **Policy / P&C** (Appulate Uplink flow) | Invented L&A chrome (no L&A admin capture exists for any vendor) |

If a demo for any of the matching product lines lands, the chrome should be
retuned against actual frames. Current state is "brand-accurate for the named
vendor, not frame-grounded."

### Folder-to-slug mapping reference

The extraction slug map lives in
`/outputs/extract_chunk.py`. When new YouTube downloads land, either:
1. Prefix the folder name with a recognizable token (e.g. "nCino onboarding demo"
   → auto-generates a sensible slug), or
2. Add a line to `SLUG_MAP` for a consistent slug.

Frames end up at `/outputs/demo_frames/<slug>/f_NN.jpg`.
