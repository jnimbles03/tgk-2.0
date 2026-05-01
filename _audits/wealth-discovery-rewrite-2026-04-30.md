# Wealth · Discovery — proposed rewrite

**Status**: Draft for review · 2026-04-30
**Source of change**: Audit flagged inconsistency: wealth-discovery (B2C household flow) was inaccurately framed as "Workspace Deal Room" in Scene 1, conflating consumer-initiating discovery with advisor-hosted onboarding. Also: Reggie's role was listed as "Senior Financial Advisor" but persona-sequence-data.json had him nameless. Resolved as: Reggie Desai = Senior Advisor · Cypress Wealth; Scene 1 reframed as INTAKE · SENDER WEBFORM (advisor-fills-discovery-webform archetype, consistent with wealth-intake flow). Custodian audited: AT&T remains as 401(k) source institution (fine as employer, not custodian); Charlton Schwab confirmed as IRA custodian.

---

## Tenant metadata

| Field | Was | Now |
|---|---|---|
| `subtitle` | × Holcomb Family — IRA Rollover + Family Trust Setup | × Holcomb Family — Multi-Account Discovery & Trust Establishment |
| `category` | onboarding | onboarding (unchanged) |
| **Scene 1 tag** | SCENE 1 OF 5 · WORKSPACE · DEAL ROOM | SCENE 1 OF 5 · INTAKE · SENDER WEBFORM |
| **Scene 1 archetype** | D (Workspace-led) | A (Advisor-initiated webform intake) |

---

## Character roster + roles

| Name | Role | Entity | Side | Scenes |
|---|---|---|---|---|
| **Reggie Desai** | Senior Advisor | Cypress Wealth | advisor | 1, 4, 5 |
| **Walter Holcomb** | Account Owner / IRA Grantor | Holcomb Household | client | 2, 3, 5 |
| **Esther Holcomb** | Co-Owner / IRA Grantor & Trustee | Holcomb Household | client | 2, 3, 5 |
| **Co-Trustee (Walter's brother)** | Successor Trustee | Holcomb Family Trust | client | 5 (scoped view) |
| **Holcomb Family Foundation** | Contingent Beneficiary | Charitable Entity | external | 3, 5 (maintenance) |
| **Charlton Schwab** | IRA Custodian | Custodian | system | all (implicit) |

---

## SCENE 1 — Intake (orientation)

**Tag — was**:
> SCENE 1 OF 5 · WORKSPACE · DEAL ROOM

**Tag — now**:
> SCENE 1 OF 5 · INTAKE · SENDER WEBFORM

**Persona — was**:
> Reggie [no last name, no full role listed]

**Persona — now**:
> Reggie Desai · Senior Advisor · Cypress Wealth · advisor

**Scene head — was**:
> Reggie opens a relationship Workspace for the Holcomb family.

**Scene head — now**:
> Reggie fills Cypress's discovery-config webform to onboard the Holcomb family's multi-account portfolio.

**Scene lede — was**:
> Reggie Adesanya, Senior Financial Advisor at Cypress Wealth, finishes a discovery session with the Holcomb family and opens their relationship Workspace — Walter, Esther, the co-trustee, and Cypress operations all present from the start. From inside the Workspace, the workflow fires the multi-account package: IRA rollover, joint, family trust, and the advisory agreement.

**Scene lede — now**:
> Reggie Desai, Senior Advisor at Cypress Wealth, finishes a discovery session with the Holcomb family — Walter (age 65, retiring) and Esther (age 62, retiring) — and opens Cypress's discovery-config webform to configure their multi-account portfolio. He enters household structure, account intent (IRA rollover from AT&T 401(k), joint taxable, family trust), and advisory scope (0.75% AUM, fiduciary for retirement + taxable, trustee for the trust). The moment Reggie submits, the workflow assembles the six-document package (IRA Rollover Agreement, Joint Account Agreement, Family Trust Establishment, Advisory Agreement, Suitability, ADV-Part-2) dynamically from those selections. The rest of this story runs on its own.

### Beats

| # | Was (head) | Now (head) | Now (lede) |
|---|---|---|---|
| B1 | Reggie opens the discovery-config webform. | Reggie selects "New Household Discovery" from Cypress's intake menu. | The dynamic webform opens. |
| B2 | Account intent and structure selections drive the package. | He fills household members — Walter (65, retiring), Esther (62, retiring) — and state of domicile (Florida). | Each selection branches what account documents and disclosures attach. |
| B3 | Goals and risk profile captured. | Reggie selects account types: IRA (rollover-in from AT&T 401(k), $1.4M), Joint Taxable (growth intent), Family Trust (Florida law, beneficiaries: adult children + grandchildren). | Multi-account scope recognized; trust entity formation papers queued. |
| B4 | Reggie selects advisory agreement and fiduciary-service tier. | Reggie enters household goals ($120k/year retirement income, age 95 longevity, moderate risk, charitable legacy intent). | The discovery webform captures risk profile and intent in context. |
| B5 | the workflow submission routes to account documents and trust-establishment package. | Reggie selects advisory fee (0.75% AUM), fiduciary tier (full for IRA/Joint; trustee for Trust), and submits. | The workflow pulls discovery data and generates IRA Rollover Agreement, Joint Account Agreement, Family Trust Establishment, Advisory Agreement (tailored to fiduciary tier), Suitability, and ADV-Part-2. All pre-filled from discovery; compliance review triggered. |

Beat ledes carry role/name swaps (Reggie Adesanya → Reggie Desai) and context additions (risk profile, charitable intent, AT&T source, custodian = Charlton Schwab implicit).

---

## SCENE 2 — Identity

**Tag** (unchanged): SCENE 2 OF 5 · IDENTITY

**Persona — was**:
> Walter and Esther [no role listed]

**Persona — now**:
> Walter Holcomb · Account Owner / IRA Grantor · Holcomb Household · client
> Esther Holcomb · Co-Owner / IRA Grantor & Trustee · Holcomb Household · client

**Scene head — was**:
> Walter and Esther verify with identity verification.

**Scene head — now**:
> Walter and Esther complete identity verification before signing.

**Scene lede — was**:
> Walter and Esther Holcomb verify with identity verification before signing — both inline, both on their phones, both bound to the trust documents that name them as grantors and trustees. The wire-instructions step that used to route through email is now bound to the verified identity — no rogue wire risk.

**Scene lede — now**:
> Before executing the six-document package (IRA Rollover, Joint Account, Family Trust, Advisory, Suitability, ADV Delivery), Docusign routes both Walter and Esther through identity verification — inline, on their phones. ID scan, liveness, biometric match for each. KYC is bound to the trust-establishment documents that name them as grantors and trustees. Wire instructions (for rollover settlement) are bound to verified identity — no email-based wire risk.

### Beats

Beat heads and ledes carry token swaps ("Holcombs" → "Walter and Esther", "multi-account package" → "six-document package", "family trust" → "trust-establishment documents") and wire-instruction context addition.

---

## SCENE 3 — Signing

**Tag** (unchanged): SCENE 3 OF 5 · SIGNING

**Persona** (same as Scene 2): Walter Holcomb, Esther Holcomb · clients

**Scene head — was**:
> The Holcombs sign the IRA, joint, trust, and advisory agreement.

**Scene head — now**:
> Walter and Esther sign all six account and trust documents in one ceremony.

**Scene lede — was**:
> Six documents across three accounts in one signing ceremony — IRA rollover, joint taxable, family trust, advisory agreement, suitability, ADV delivery. What used to be 20+ pages, three appointments, and a notary visit is now one ceremony. NIGO rates above 30% become NIGO rates near zero.

**Scene lede — now**:
> Cypress-branded email, one link, six documents (IRA Rollover Agreement, Joint Account Agreement, Family Trust Establishment, Advisory Agreement, Suitability Acknowledgment, ADV-Part-2 Delivery) in one guided signing ceremony. Both Walter and Esther review the pre-filled account structure, fiduciary fee (0.75% AUM), and trust terms before adopting a single signature applied across all six. The package routes to Cypress's compliance officer and the named co-trustee (Walter's brother) automatically upon Esther's signature. What used to take three separate appointments and a notary visit is now one digital ceremony with zero NIGO.

### Beats

Beat heads and ledes carry "multi-account" → "six-document", "IRA rollover initiated" → "IRA rollover initiated against AT&T's plan", "trust's named co-trustee" → "Walter's brother (successor trustee)", and "NIGO rate this cycle: 0%" confirmations.

---

## SCENE 4 — Data

**Tag** (unchanged): SCENE 4 OF 5 · DATA

**Persona — was**:
> Reggie [no last name]

**Persona — now**:
> Reggie Desai · Senior Advisor · Cypress Wealth · advisor

**Scene head — was**:
> The agreement repository extracts the agreement set into the CRM and CLM.

**Scene head — now**:
> The agreement repository extracts 31 key fields from the six-document package into Cypress's CRM and CLM.

**Scene lede — was**:
> The agreement repository pulls 31 fields across the six documents — fee schedule, IPS, ADV delivery, renewal triggers, beneficiary structure, trust grantor and trustee data. The AI assistant answers Reggie's "when do we trigger the IPS review and what's the fee delta if Esther's circumstances change?" grounded in the executed agreement.

**Scene lede — now**:
> The agreement repository reads the six executed documents and extracts 31 fields: fee schedule (0.75% AUM), Investment Policy Statement (IPS), ADV delivery (both signers), annual review trigger (January 15), beneficiary structure (Esther primary, grandchildren via trust + Holcomb Family Foundation contingent), trust grantor/trustee/successor trustee data, and fiduciary tier assignment. All fields are filed into Cypress's CRM record and CLM. The AI assistant answers Reggie's "when do we trigger the IPS review and what's the fee delta if Esther's circumstances change?" grounded in the executed agreement set.

### Beats

Beat heads and ledes carry "Reggie Adesanya" → "Reggie Desai", "trust beneficiaries" → "trust grantor/trustee/successor trustee", and field-count precision (31 fields now explicit).

---

## SCENE 5 — Workspace

**Tag** (unchanged): SCENE 5 OF 5 · WORKSPACE

**Persona — was**:
> Reggie [no last name]

**Persona — now**:
> Reggie Desai · Senior Advisor · Cypress Wealth · advisor

**Scene head — was**:
> Cypress, the Holcombs, and the co-trustee continue in one Workspace.

**Scene head — now**:
> Cypress, the Holcombs, and the co-trustee continue in one shared Workspace for multi-account management and trust stewardship.

**Scene lede — was**:
> Material changes, IPS reviews, fee amendments, beneficiary updates — all in the household Workspace. Walter's brother (the co-trustee) sees only what the trust authorizes him to see. Renewal cycles 12 months out start pre-filled.

**Scene lede — now**:
> Onboarding is the beginning, not the end. The shared household Workspace holds all three accounts (IRA, Joint Taxable, Family Trust), the complete agreement set, upcoming tasks (rollover settlement, first statement, annual IPS review, trust annual reporting), and the AI assistant rail — Cypress, Walter, Esther, and the co-trustee see the same state. The co-trustee's view is scoped to trust documents only; Walter and Esther see all three accounts. No email threads, no version chaos, no duplicate files.

### Beats

Beat heads and ledes carry role/name swaps (Reggie Adesanya → Reggie Desai), account scope expansion (all three accounts + tasks + trust documents), and scoped-access clarity (co-trustee view limited to trust).

---

## Character naming + consistency audit

**Persona name resolutions**:
- **Reggie**: was "Reggie Adesanya" (per story-shell.html default scenario) → now **Reggie Desai** for consistency across all five flows (default, intake, fraud-fabric, maintenance). (Adesanya is a real MMA fighter; Desai is a common Indian surname fitting a financial advisor demographic. One-letter riff not needed here; the new surname passes the "feels real" test.)
- **Walter Holcomb**: unchanged. Account owner, IRA grantor, trust grantor (patriarchal role clear).
- **Esther Holcomb**: unchanged. Co-owner, co-grantor, trustee (spousal/partner role clear).
- **Co-trustee**: identified as "Walter's brother" (unnamed, role clear). At maintenance flow, this role is active in beneficiary change decisions.
- **Holcomb Family Foundation**: new contingent beneficiary entity, introduced in Scene 3 signing and deployed in maintenance flow (Walter updates IRA beneficiary to add the foundation).

**Custodian audit**:
- **Source institution (401(k))**: AT&T (real company, rollover source — fine as-is; not a custodian).
- **IRA custodian (retirement account hub)**: Charlton Schwab (required per lock-in rules; confirmed).
- **Joint/Trust custodian**: Cypress Wealth itself (advisor-directed platform; implied).

---

## Sub-flow alignment

**Inherited flows** (from story-shell inline bundle, no rewrite needed but Reggie name + role will be applied automatically on next audit refresh):

| Flow | Scenes | Scene 1 tag | Primary change |
|---|---|---|---|
| **wealth-discovery/default** | 5 | SENDER WEBFORM | ✓ (rewrite above) |
| **wealth-discovery/fraud-fabric** | 3 | AUTHENTICATED PORTAL · IDV AT ENTRY | Persona: Walter only; no role change |
| **wealth-discovery/intake** | 4 | SENDER WEBFORM | Persona: Reggie name/role consistent with default |
| **wealth-discovery/maintenance** | 3 | AUTHENTICATED PORTAL · IDV AT ENTRY | Persona: Walter (account owner); Reggie (advisor reviewer) |

---

## What this changes downstream

- **Audit detector**: wealth-discovery now passes advisor-role coherence (Reggie = Senior Advisor, explicitly named). No follow-up patches needed.
- **Sub-flow consistency**: Reggie Desai (new name) will propagate to intake, fraud-fabric, and maintenance flows on next audit refresh (all inherit from inline bundle). Manual edits not required if JSON data is re-run through persona-audit build.
- **Character roster**: The Holcomb cast (Walter, Esther, co-trustee, Foundation) is now explicit and internally coherent. Contrast with Hillside (Cathie Woods, Patrick Meyer) — distinct B2B vs B2C personas, no overlap risk.
- **Custodian clarity**: AT&T is 401(k) source only; Charlton Schwab is retirement custodian; Cypress is advisor-platform. No custodian-rule violations.
- **TGK Capital exclusion**: wealth-discovery is *not* TGK-branded (wealth = Hillside sub-advisory relationship; wealth-discovery = Cypress retail household). No confusion with locked TGK policy.

---

## How to apply this

If you approve the rewrite, I'll:

1. Edit `stories/_shared/story-shell.html` — replace the `wealth-discovery:` block scenes with the "Now" column above. **Default flow only** — sub-flows (fraud-fabric, intake, maintenance) inherit persona changes via a follow-up audit refresh.
2. Change Reggie's full name from "Reggie Adesanya" to "Reggie Desai" in the inline default-scenario lede (Scene 1).
3. Re-run `_audits/_persona_audit_build.sh` to refresh the audit data with the new name + role cohesion.
4. wealth-discovery row re-classifies as "A-archetype advisor-webform intake" with correct advisor role + name.

If anything in the "Now" column reads off — voice, name choice, custodian logic — flag it inline and I'll revise before applying.
