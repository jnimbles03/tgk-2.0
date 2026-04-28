# Headless IAM for X — Planning Doc

**Date:** 2026-04-28
**Status:** Plan, not yet built
**Verticals:** Financial Services (FINS) · Healthcare & Life Sciences (HLS) · Public Sector (PS)

---

## The Concept

A **single immersive tenant-branded portal per vertical** that demonstrates how Docusign IAM (Intelligent Agreement Management) plugs into a customer's own product UI — *without showing Docusign chrome* in the customer experience.

The pitch: "When prospects say 'we don't want Docusign branding in our customer flow,' here's what they actually get." Every IAM capability is visible and working, embedded into a portal that wears the tenant's brand end-to-end. The 13 flipbook demos become *components* of one larger experience per vertical, not 13 separate stories.

This is distinct from the current `?vertical=X` shell, which tells a *narrative* through 5 scenes. The Headless IAM portals are *persistent, exploratory* — the prospect walks the tenant portal at their own pace and clicks any IAM moment to drill in.

---

## URL + file structure

```
/headless-iam/
  fins.html          # Headless IAM for Financial Services
  hls.html           # Headless IAM for Healthcare & Life Sciences
  ps.html            # Headless IAM for Public Sector
  _shared/
    portal-shell.css     # Common chrome layout (header, sidebar, content, drilldown)
    portal-shell.js      # Common drilldown + section-routing JS
```

Each `fins.html` / `hls.html` / `ps.html` is its own self-contained portal — tenant chrome, sections per IAM moment, drill-downs that iframe existing demo templates.

---

## Tenant choices per vertical

Each portal needs ONE tenant whose product reasonably touches every IAM component. Picking one tenant per vertical (rather than a multi-tenant catalog) keeps the demo experience coherent — visitor stays in one branded surface throughout.

### FINS — **Hillside Financial**
Fictional unified financial-services tenant covering retail banking, commercial lending, and wealth management. Hillside is already in the existing shell as the wealth tenant; expand its scope here.
- Customer onboarding (joint accounts) — touches webforms + identity + signing
- Wealth management (Aster Capital relationship) — touches workspaces + Navigator
- Commercial credit (Atlas working capital) — touches Maestro fan-out + signing
- Fraud monitoring (high-value wires) — touches Monitor + chain-of-custody
- Sales agentic flow (Salesforce + Agentforce) — touches IAM for Sales

### HLS — **Riverside Health Network**
Fictional integrated health system covering patient care, claims, and clinical research.
- New patient intake — webforms + identity + signing
- Records release (ROI to Silver Mountain) — Maestro + redaction
- Site activation (HX-2104 trial via Helix as sub-tenant) — multi-party Maestro
- Member coordination (Unity HMO benefits) — workspaces
- AI-assisted review of clinical agreements — AI-Assisted Review in IAM

### PS — **Cascade County**
Fictional county government covering citizen services, benefits, licensing, and vendor compliance.
- Citizen 311 (Greenhaven adapted as a department) — webform + dispatch
- Benefits intake (SNAP / Medicaid recert) — webform + auto-determination
- Vendor compliance (Apex annual recert) — webform + identity + Monitor
- New-hire onboarding (Marcus Lee as caseworker) — Maestro fan-out
- Procurement (CLM-style vendor agreements) — Navigator + workspaces

---

## Demo-moment structure per portal

Each portal shows the same six moments, themed per vertical. Visitor sees a tenant home page with section cards; clicking a card drills into that moment.

| # | Moment | What IAM provides | Backing flipbook(s) |
|---|---|---|---|
| 1 | **Intake** | Webform + Maestro packaging | Web Forms (Tally Bank), Maestro Workflow Templates |
| 2 | **Identity** | CLEAR / ID.me / IDVerse step-up | CLEAR IAL2, ID.me Member Authentication, IDVerse |
| 3 | **Signing** | Tenant-branded signing ceremony | (already in `docusign-signing-ceremony.html`) |
| 4 | **Search & Ask** | Navigator + Iris on past agreements | Navigator Demo, AI-Assisted Review in IAM |
| 5 | **Workspace** | Multi-party persistent collaboration | Workspaces Demo |
| 6 | **Audit & Monitor** | Risk surveillance, anomaly detection | Docusign Monitor, Data Verification External |

Optional 7th moment per vertical:
- **FINS** → IAM for Sales / Agentforce (CRM-driven origination)
- **HLS** → CLM Procurement (clinical agreement procurement)
- **PS** → Vendor Agreement Renewals (vendor compliance)

---

## Build approach

### Phase 1 — One portal as proof (1 week effort)

Pick **FINS / Hillside Financial** as the first build. Justification:
- The existing wealth + banking + insurance verticals already share Hillside-adjacent narrative
- Most existing flipbook content (CLEAR, Maestro, Navigator, Workspaces, Web Forms, Monitor, IAM for Sales) maps cleanly
- Highest demo-cycle ROI

**Deliverables:**
- `/headless-iam/fins.html` — Hillside-branded portal
- Portal home with 6 section cards (one per moment)
- Drill-downs that iframe existing demo templates with `?preset=` params
- All chrome is Hillside (no Docusign mark in the customer-visible surface)
- Tiny "Powered by Docusign IAM" footer concession only

### Phase 2 — Replicate to HLS + PS (1 week each)

Once FINS proves the pattern, copy to `hls.html` (Riverside Health Network) and `ps.html` (Cascade County). Same six moments, vertical-themed content, vertical-specific tenant chrome.

### Phase 3 — Connect drill-downs to flipbook stills

For moments where we have flipbooks (Navigator Demo, Monitor, AI-Assisted Review), use the flipbook stills as the drill-down content in addition to the existing iframe templates. Two-mode drill-downs: live iframe (interactive) or flipbook (high-fidelity stills walked through).

---

## Architectural notes

**No conflict with the existing shell.** The current `?vertical=X` shell is a narrative tool — 5 scenes told in order. The Headless IAM portals are exploratory — the visitor self-navigates. They live at separate URLs and serve different audiences:
- `?vertical=X` — sales pitch / narrative walkthrough (sequential)
- `/headless-iam/X` — proposal-stage / "what does this look like in our portal?" (exploratory)

**Embed strategy.** Each Headless IAM section drills into an existing template (`docusign-clear-idv.html`, `docusign-webform-intake.html`, etc.) via iframe with `?preset=<tenant-slug>`. The IAM templates already accept tenant presets, so most of the per-vertical theming work is already done — we just point at the right preset.

**Chrome mismatch problem.** Docusign templates today render with a small Docusign logo + "Powered by Docusign" footer. For Headless IAM, we want the *tenant's* chrome to dominate. Two options:
- **(a)** Add a `?chrome=headless` param to each template that hides the Docusign branding when set
- **(b)** Iframe the templates inside an outer Hillside chrome shell that visually frames them

(a) is cleaner; (b) is faster. Probably (b) for Phase 1, refactor to (a) in Phase 2.

**Reusable drill-down component.** Build a `_shared/portal-shell.js` that handles section routing + drill-down open/close + back-navigation. Reuse across all three portals.

---

## What this is *not*

- **Not a story.** No 5-scene narrative arc; no per-beat hotspots. The visitor explores.
- **Not in the shell.** Doesn't go through `/stories/_shared/story-shell.html`. Independent files.
- **Not white-labeled stock.** Each portal has a specific fictional tenant with a real story arc behind it (Hillside, Riverside Health Network, Cascade County). Not generic "Acme Bank."

---

## Open questions

- Does Phase 1 (FINS) need to fully replace the existing narrative shell for FINS prospects, or live alongside it?
- Should the 7th vertical-specific moment (IAM for Sales / CLM Procurement / Vendor Renewals) be a peer to the six core moments, or a sub-page within an adjacent moment?
- For the HLS portal, do we want one tenant (Riverside Health Network) or two (Riverside + Helix as sub-tenants for the trial scenario)?
- Should Headless IAM portals also support a `?usecase=` deep-link so a sales rep can land directly on a specific moment (e.g., `/headless-iam/fins.html#identity`)?
