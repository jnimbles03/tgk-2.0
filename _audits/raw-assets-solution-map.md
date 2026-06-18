# RAW ASSETS → Solution Map & Demo-Fidelity Audit

**Date:** 2026-06-07
**Source material:** `Google Drive/AI Machine/TGK/RAW ASSETS/{enable, demo}`
**Gating rule (per Jimmy):** a capability is usable for solutioning only if it
appears in an `enable/` enablement deck or the **H1 2026 Product Roadmap**.
Recommendations are deliberately conservative — keep coverage at roughly its
current size; only add what was *obviously* missing. A "Skip" list is included
to show what was considered and rejected as redundant/shoehorned.

---

## Part 1 — What `enable/` actually authorizes

22 PDFs. The **H1 2026 Product Roadmap** is the spine; its "Use Case Scenarios"
section (slides 65–77) is Docusign's *own* vertical→solution map and aligns
almost 1:1 with the TGK grid. The other decks (eSignature, CLM, CLM+, Web Forms,
Agreement Desk, Identify, Apple Wallet, Risk Assessment in Workflow Builder, the IAM
"TOP features" series, NYCRR-500 IDV, CLM connectors for Coupa/Workday) just
confirm the individual capabilities exist and are sellable.

**Roadmap capabilities now in-bounds for storylines (with timing):**

| Pillar | Capability | Status / timing |
|---|---|---|
| Create | Agreement Desk: **AI Contract Agents** | GA US May 2026 |
| Create | Agreement Desk: Commenting, Document Compare | GA US Jan–Feb 2026 |
| Create | **AI-Assisted Review** (Chat, playbooks, MS Word web, ES/PT) | GA Q1–Q2 2026 |
| Create | **Agreement Prep** (type detection, suggested fields) | GA Global Feb 2026 |
| Create | **AI-Assisted Web Forms** | GA Global Jun 2026 |
| Commit | **IDV: Apple Wallet mDL** | LA Jun 2026 / GA Nov 2026, **US-only** |
| Commit | IDV: Admin standardization, **pre-built FedRAMP IAL2** workflow | GA Apr–May 2026 |
| Commit | eSignature: **PIV/CAC mobile**, PDF editing, Conversions bundle | LA/GA/Beta Q1–Q2 2026 |
| Commit | **Workspaces: PubSec** (FedRAMP/GovRAMP) | GA US Mar 2026 |
| Manage | **Agreement Manager** (live analysis, hierarchy, conditional rules, API) | EA/GA May–Jul 2026 |
| Manage | **Monitor for IAM** | GA Global Jan 2026 |
| Platform | **Custom Agents & Agent Studio**, **Workflow Builder Agentic Workflows** | EA US May 2026 |
| Platform | **MCP Server**, Payment Extensions (Stripe), Web Extensions | Beta/GA Q1–Q2 2026 |
| Platform | **IAM Homepage**, Dev Console, IAM for HR / Sales / Procurement | GA 2026 |
| Platform | **Joint Agreements — IAM for Wealth Management** | Q2 2026 |

---

## Part 2 — Vertical × Solution stack (from roadmap Use Case Scenarios)

The TGK grid is **4 clusters × sub-verticals × 5 demos** (Onboarding,
Maintenance, Fraud Fabric, Headless IAM, Workspaces), all riding the locked
5-scene spine. The roadmap scenario that backs each cell:

| TGK cluster · sub-vertical | Roadmap-authorized solution stack |
|---|---|
| **FINS · Banking** (Account Opening / Maintenance) | AI-Assisted Web Forms → **Apple/Google mDL** → Workspaces → **Data Verification** → App Center → AI Summary + eSignature → Workflow Builder. *SoR: nCino.* |
| **FINS · Wealth** | Same FINS spine + **Joint Agreements (IAM for Wealth, Q2)** for multi-party household signing. |
| **FINS · Insurance** | AI-Assisted Web Forms (claim PDFs → guided forms) → IDV → Workflow Builder conditionality → eSignature → App Center. *SoR: Guidewire PAS.* |
| **HLS · Provider / Payor** (Patient Intake) | AI-Assisted Web Forms → **Apple mDL** (HIPAA-friendly consent) → Workflow Builder advanced conditionality → eSignature → **Payments (Stripe)** → App Center. |
| **HLS · Life Sciences** | Agreement Prep → IDV → Workspaces (site activation) → eSignature → Agreement Manager. |
| **PubSec · FedGov** (Federal services) | Workflow Builder → Web Forms → **IAL2 IDV** → **Mobile PIV + eSignature** → App Center → Workspaces. |
| **PubSec · SLGov / Education** (State/local services) | Workflow Builder → Web Forms → IAL2 IDV → eSignature → App Center → Workspaces (PubSec). |
| **Cross-org · Sales** (B2B agreement gen) | **Docusign for Agentforce + Agreement Prep** → Agreement Desk → AI-Assisted Review → **eSignature for Slack** → Agreement Manager in Salesforce. |
| **Cross-org · Procurement** (Intake / Vendor mgmt) | AI-Assisted Web Forms → Workflow Builder → Agreement Manager → AI-Assisted Review → eSignature; vendor side adds **Agreement Manager API** + Coupa/SAP/ServiceNow. |
| **Cross-org · Nonprofit** | Web Forms → IDV → Workspaces (grant cycle) → eSignature → Agreement Manager. |
| **Legal motion (cuts across clusters)** | Requests/Review/Redlining = Agreement Prep → AI-Assisted Review → **Agreement Desk** (Contract Agents, Commenting, Doc Compare). Search/Storage = **Agreement Manager** (assistant, hierarchy, conditional rules) + Notification Center. |

This is consistent with what the shells already invoke — no vertical is using a
solution that *isn't* roadmap-backed. No corrections needed to the existing maps.

---

## Part 3 — Demo-fidelity audit (`demo/` vs existing flipbooks)

**Current baseline:** 15 flipbooks / 908 frames (`flipbooks/manifest.json`),
frame-grounded from real product MP4s. Covered today: Web Forms (Tally Bank),
Workflow Builder Templates, CLM Procurement, Monitor, AI-Assisted Review (IAM), IAM for
Sales + Agentforce, ID.me IAL2, IDVerse, Agreement Manager, Search Agent, Search Demo,
Vendor Agreement Mgmt, Workspaces, CLEAR IAL2, Data Verification.

The `demo/` folder holds 24 MP4s + 6 IDV clickthrough PDFs. Cross-referenced
against the 15 existing flipbooks and the roadmap, here is the verdict.

### ✅ Recommended adds — obviously missing, roadmap-backed (5)

| Asset (`demo/`) | Fills which gap | Why it's not shoehorning |
|---|---|---|
| **App Center Demo.MP4** | App Center has **no** flipbook, yet it is the "activation & handoff" step in *every* roadmap use-case scenario (FINS, HLS, PubSec, CX). | The most-referenced product with zero product-accurate footage. |
| **NDA demo 2x with Legal.MP4** | The **Legal Requests/Review/Redlining** motion (Agreement Desk + AI-Assisted Review redline) — currently only hand-built template, no flipbook. | Legal redlining is its own roadmap use-case (slide 72) and recurs in Sales/Procurement negotiation beats. |
| **ID Verification: Apple Wallet – Clickthrough.PDF** | **Apple Wallet mDL** — headline Commit-pillar roadmap item; appears in FINS, HLS, CX & HR scenarios; today unbuilt. | Roadmap-confirmed (LA Jun '26). Clickthrough gives product-accurate frames instead of a guessed mock. *Flag US-only in copy.* |
| **Workflow Builder Workflow Start Methods.MP4** | Raises fidelity of **Scene 1 archetypes** (the 4 trigger methods) — the most-reused scene across all 60 cells. | Distinct from the existing Workflow Builder *Templates* flipbook; it shows the trigger surface the archetype framework narrates. |
| **Docusign Agent in Microsoft 365 Copilot – Demo.MP4** | The **agentic** story (Custom Agents / Agent Studio / MCP, EA May '26) is hand-built today. | Real agent-in-Copilot footage backs the Headless-IAM / agentic vignette with product truth. |

### 🔧 Fidelity-only refs — extend existing IDV flipbooks, don't add scope

| Asset | Use |
|---|---|
| **Risk-Based Verification – Clickthrough.PDF** | New IDV mode (step-up) — backs Fraud-Fabric step-up beats & HR Talent-Acq risk-based IDV. Add only if/when a Fraud-Fabric cell needs it. |
| **CLEAR – Clickthrough / ID.me – Clickthrough 2 / Liveness – Clickthrough** | Reference frames to extend the existing CLEAR & ID.me flipbooks with returning-user / liveness states. Reference, not new flipbooks. |

### ⏸️ Optional, niche — only if those build-queue cells get built

| Asset | Maps to |
|---|---|
| **DocuSign for Financial Aid – Dependent Verification.MP4** | Education **Fraud-Fabric** build-queue cell (financial-aid impersonation). |
| **DocuSign CLM Demo for Advancement.MP4** | Nonprofit cluster (advancement/grants) — only if Nonprofit Maintenance cell is built. |

### ⏭️ Skip — redundant or out of scope (shows what was rejected)

- **Data Verification Product Demo** — **verified byte-identical** to the
  existing *Data Verification External Demo* flipbook source (both 1920×1080,
  69.63s, 2089 frames). Pure duplicate. Skip.
- **Docusign for Agentforce Promo** — **verified distinct** from the flipbooked
  *IAM for Sales and Agentforce Demo* (promo = 62s / 1080p; full demo = 4.6min /
  4K). But frame inspection shows the promo is mostly **brand-motion marketing**
  (floating chat bubbles on purple — "Did you send that NDA?", "I need the Atlas
  MSA stat!") with only a brief Agentforce-panel moment (~0:30). The full demo
  flipbook already carries the real product UI at higher resolution, so skip for
  *product fidelity*. **One legit alt use:** the montage's "Atlas MSA / NDA /
  Legal·Sales·Finance status pills / Slack" motif maps cleanly onto the Sales
  (TGK × Black Mesa MSA) and Banking-Atlas storylines — it could serve as a
  Scene-1 **cold-open hook**, which is a different job than the product demo.
- **AI-Assisted Review for CLM Promo** — redundant with *AI-Assisted Review in IAM* flipbook.
- **Workflow Builder Demo Video / Workflow Builder and App Center** — core Workflow Builder already covered; *Start Methods* is the only distinct value.
- **DocuSign for Salesforce EFS** — eSignature integration is already pervasive across the spine.
- **Comments Accessibility Demo** — minor Agreement Desk sub-feature.
- **Docusign Momentum NYC Keynote (May 2026)** — keep as roadmap/narrative reference, not a flipbook.

---

## Net effect

Five new flipbooks (App Center, Legal/NDA redline, Apple Wallet mDL, Workflow Builder
Start Methods, M365 Copilot agent) take the baseline from **15 → 20**, plus a
small set of IDV clickthroughs to lift fidelity on flows that already exist.
Everything recommended traces to a roadmap line item *and* an actual file in
`RAW ASSETS/demo/`. No vertical's solution stack needed correcting — the shells
are already solutioning within what `enable/` authorizes.
