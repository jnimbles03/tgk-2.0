# Hillside · default — proposed rewrite

**Status**: Draft for review · 2026-04-30
**Source of change**: User flagged Priya's role + TGK's framing as incoherent. Resolved as: Priya = Director of Advisor Onboarding; TGK Capital = an RIA joining Hillside's network as a sub-advisor; document = Sub-Advisory Agreement.

---

## Tenant metadata

| Field | Was | Now |
|---|---|---|
| `subtitle` | × TGK Capital — New Client Onboarding | × TGK Capital — Sub-Advisor Onboarding |
| `category` | onboarding | onboarding (unchanged — still onboarding flow, just firm-to-firm) |

---

## SCENE 1 — Intake (orientation)

**Tag** (unchanged): SCENE 1 OF 5 · INTAKE · SENDER WEBFORM

**Persona — was**:
> Priya Das · Head of Compliance · Hillside · advisor

**Persona — now**:
> Priya Das · Director of Advisor Onboarding · Hillside · advisor

**Scene head — was**:
> Priya kicks off TGK Capital's onboarding from a Hillside intake webform.

**Scene head — now**:
> Priya Das at Hillside is bringing TGK Capital onboard as a sub-advisor.

**Scene lede — was**:
> Priya Das, Head of Compliance at Hillside Advisors, fills out the new-engagement webform for TGK Capital — entity type, AUM, mandate, custodian. The moment she submits, the workflow assembles the IMA package dynamically from those selections. The rest of this story runs on its own.

**Scene lede — now**:
> Priya Das, Director of Advisor Onboarding at Hillside, opens a new sub-advisor engagement for *TGK Capital* — a boutique RIA joining Hillside's network to manage a sleeve of Hillside client assets. The intake form configures the sub-advisor package: firm profile, fee-share schedule, regulatory disclosures, and the signers on both sides. The moment Priya submits, the workflow assembles the package dynamically and the rest of this story runs on its own.

### Beats

| # | Was (head) | Now (head) | Now (lede) |
|---|---|---|---|
| B1 | Priya selects "New Engagement" from Hillside's intake menu. | Priya selects "New Sub-Advisor" from Hillside's onboarding menu. | The dynamic webform opens. |
| B2 | She fills entity type, mandate, AUM tier. | She fills firm profile — TGK's RIA registration, AUM under management, mandate scope. | Each selection branches what disclosures and exhibits attach. |
| B3 | She selects custodian = Pershing. | She sets the fee-share schedule and asset-mapping rules. | A standard sub-advisor fee-share schedule auto-attaches; Priya tunes the bps split. |
| B4 | Reg BI disclosure auto-attaches. | Form ADV Part 2 exchange and sub-advisor disclosures auto-attach. | Based on TGK's registration profile — no manual lookup. |
| B5 | Priya reviews the configured package summary. | Priya reviews the configured sub-advisor package summary. | 4 documents, 2 signers (Hillside + TGK), sequenced routing. |

---

## SCENE 2 — Identity

**Tag** (unchanged): SCENE 2 OF 5 · IDENTITY

**Persona — was**:
> TGK signatory · Authorized Signatory · TGK Capital · client

**Persona — now**:
> Patrick Meyer · Founder & Managing Partner · TGK Capital · client
> *(name placeholder — to be filled in)*

**Scene head — was**:
> TGK Capital's signatory completes identity verification.

**Scene head — now**:
> Patrick Meyer completes identity verification.

**Scene lede — was**:
> Before anything moves, Docusign routes TGK's authorized signatory through identity verification for identity verification. Desktop consent → mobile ID scan → biometric match → back to the browser. No separate portal, no phone call to compliance.

**Scene lede — now**:
> Before any documents move, Docusign routes Patrick Meyer through identity verification — the principal who's authorized to bind the firm to the sub-advisory agreement. Desktop consent → mobile ID scan → biometric match → back to the browser. No separate portal, no compliance phone call.

### Beats

| # | Was (head) | Now (head) |
|---|---|---|
| B1 | TGK's signatory is asked to verify before signing. | Patrick Meyer is asked to verify before signing. |
| B2 | Identity verification selected as the verification path. | (unchanged) |
| B3 | Mobile handoff begins. | (unchanged) |
| B4 | ID scan and biometric match in progress. | (unchanged — system actor) |
| B5 | Identity verified — IMA ceremony unlocked. | Identity verified — Sub-Advisory Agreement ceremony unlocked. |

Beat ledes carry minor token swaps ("the signatory" → "Patrick Meyer", "IMA" → "Sub-Advisory Agreement") otherwise unchanged.

---

## SCENE 3 — Signing

**Tag** (unchanged): SCENE 3 OF 5 · SIGNING

**Persona** (same as Scene 2): Patrick Meyer · client

**Scene head — was**:
> TGK reviews and signs the Investment Advisory Agreement.

**Scene head — now**:
> Patrick Meyer reviews and signs the Sub-Advisory Agreement.

**Scene lede — was**:
> Tenant-branded email, yellow Sign tab floating over the IMA, Adopt Signature modal, completion with multi-recipient routing. One ceremony, one audit trail — the IMA hands off to Hillside's compliance reviewer automatically.

**Scene lede — now**:
> Hillside-branded email, yellow Sign tab floating over the Sub-Advisory Agreement, Adopt Signature modal, completion with multi-recipient routing. One ceremony covers the agreement, the fee schedule, and the regulatory disclosures — and the package hands off to Hillside's compliance reviewer automatically.

### Beats

| # | Was (head) | Now (head) |
|---|---|---|
| B1 | TGK reviews the IMA in the signing ceremony. | Patrick Meyer reviews the Sub-Advisory Agreement in the signing ceremony. |
| B2 | First signature field highlighted. | (unchanged) |
| B3 | TGK adopts their signature. | Patrick Meyer adopts their signature. |
| B4 | IMA routes to Hillside's compliance reviewer. | The package routes to Hillside's compliance reviewer. *(Now this beat is correct: compliance reviews the executed sub-advisory package — that's actually what Compliance does. The original "Priya = compliance" was wrong because she was at intake; here a separate compliance role takes over.)* |
| B5 | Execution confirmed — certified copy issued. | (unchanged) |

Beat ledes carry "IMA" → "Sub-Advisory Agreement" / "the package" swaps.

---

## SCENE 4 — Data

**Tag** (unchanged): SCENE 4 OF 5 · DATA

**Persona — was**:
> Priya Das · Head of Compliance · Hillside · advisor

**Persona — now**:
> Priya Das · Director of Advisor Onboarding · Hillside · advisor *(consistent with Scene 1)*

**Scene head — was**:
> The agreement repository extracts the IMA and lands it back in Hillside.

**Scene head — now**:
> The agreement repository extracts the Sub-Advisory Agreement and lands it back in Hillside.

**Scene lede — was**:
> The agreement repository reads the executed agreement and pulls out 14 key terms — counterparty, effective date, fee schedule, renewal, liability cap, governing law. All filed into Hillside's agreement repository. The AI assistant is one click away for any follow-up.

**Scene lede — now**:
> The agreement repository reads the executed sub-advisory package and pulls out 14 key terms — counterparty firm, effective date, fee-share schedule, AUM cap, termination triggers, regulatory representations, governing law. All filed into Hillside's agreement repository. The AI assistant is one click away for any follow-up.

### Beats

| # | Was (head) | Now (head) |
|---|---|---|
| B1 | The agreement repository surfaces the executed IMA. | The agreement repository surfaces the executed Sub-Advisory Agreement. |
| B2 | 14 fields extracted from the IMA. | 14 fields extracted from the sub-advisory package. |
| B3 | Key terms ready for downstream systems. | (unchanged — still applies) |
| B4 | Priya asks the AI assistant about the fee structure. | Priya asks the AI assistant about the fee-share split. |
| B5 | The AI assistant answers with inline citations. | (unchanged) |

Beat ledes: "client" → "sub-advisor / counterparty firm", "fee structure" → "fee-share split", "IMA" → "sub-advisory package".

---

## SCENE 5 — Workspace

**Tag** (unchanged): SCENE 5 OF 5 · WORKSPACE

**Persona — was**:
> Priya Das · Head of Compliance · Hillside · advisor

**Persona — now**:
> Priya Das · Director of Advisor Onboarding · Hillside · advisor

**Scene head — was**:
> Hillside, TGK, and the custodian continue in one Workspace.

**Scene head — now**:
> Hillside and TGK continue in a shared Workspace for the sub-advisory relationship.

**Scene lede — was**:
> Onboarding is the beginning, not the end. The client Workspace holds the task list, the agreement set, the Recent activity feed, and the AI assistant rail — everyone sees the same state. No email threads. No version chaos.

**Scene lede — now**:
> Onboarding is the beginning, not the end. The shared Workspace holds the sub-advisory agreement set, ongoing compliance attestations, performance reporting tasks, and the AI assistant rail — Hillside and TGK see the same state. No email threads, no version chaos.

### Beats

| # | Was (head) | Now (head) | Notes |
|---|---|---|---|
| B1 | TGK receives access to the shared Workspace. | Patrick Meyer receives access to the shared Workspace. | Persona on this beat: client (Patrick Meyer) |
| B2 | Both parties see the same real-time state. | (unchanged) | persona = handoff, name = "Hillside × TGK" |
| B3 | The AI assistant is live in the agent rail. | (unchanged) | persona = system (AI assistant) |
| B4 | KYC verification task open. | Sub-advisor compliance attestations open. | Lede swaps KYC/accreditation/custody-confirmation framing for sub-advisor compliance attestations + ADV updates + asset-mapping confirmation. Onboarding Agent persona keeps. |
| B5 | Onboarding complete — relationship in motion. | Sub-advisor onboarding complete — relationship in motion. | (minor swap) |

---

## What this changes downstream

- **Audit detector**: I'll add a side/role coherence rule (`side="advisor"` requires advisor-y role keywords; "Compliance" alone fails) so this category of error gets caught at scale.
- **Other verticals**: scan for the same shape (advisor side + non-advisor role like Compliance/Operations/Legal). Banking · default already passes (Raj = Commercial Relationship Manager). Insurance / HLS / others to check.
- **Hotspot copy in `HOTSPOTS.webform_intake`**: B3's hotspot tip currently says *"Form selector — engagement type"*. After this rewrite the form is selecting *sub-advisor type*, but the underlying iframe template (`webform_intake`) is generic. Likely fine to leave the iframe as-is; the sidebar narration carries the meaning.
- **`splash`**: Hillside opens with a splash; the splash copy may also reference IMA or new-client framing. Worth checking on next pass.

---

## How to apply this

If you approve the rewrite, I'll:

1. Edit `stories/_shared/story-shell.html` — replace the `wealth:` block scene heads, ledes, beat heads, beat ledes, and persona definitions with the "Now" column above. One commit.
2. Re-run `_audits/_persona_audit_build.sh` so the audit refreshes with the new data.
3. The Hillside row should re-classify; the same rewrite pattern (advisor onboarding with appropriate role + sub-advisor framing) becomes the template for any other rows where the same error shape exists.

If anything in the "Now" column reads off — voice, technical fidelity, persona names — flag it inline and I'll revise before applying.
