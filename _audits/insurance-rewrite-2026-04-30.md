# Insurance family rewrite proposal — 2026-04-30

**Status**: Proposal for review · 2026-04-30  
**Scope**: Three related verticals (`insurance`, `insurance-pc`, `insurance-life`) share a common tenant universe and need coherent named personas across all five flows per vertical.

---

## Cast

### Tenant firms
- **Sentinel**: P&C homeowners carrier (HO3 binder default story)
- **Northgate Mutual**: Commercial P&C carrier (auto/commercial lines, used in insurance-pc flows)
- **Beacon Mutual**: Life insurance carrier (death claims, policy service, used in insurance-life flows)

### Sender personas (advisor-side, originate intake)
- **Marisol Vega** · Senior Underwriter · Sentinel · advisor
  - Appears in: `insurance` default, intake, maintenance
  - Role: Issues homeowners binders from underwriting system; reviews renewals and endorsement requests
  - Characteristics: Experienced in property underwriting, knows policy limits and rating

- **Andre Sokolov** · Claims Adjuster / FNOL Handler · Northgate Mutual · advisor
  - Appears in: `insurance-pc` default (implied), intake, maintenance
  - Role: Processes claims (First Notice of Loss), manages claim packages, investigates; reviews claim documentation
  - Characteristics: Field-based claims expertise, familiar with liability vs. property evidence chains

- **Camille Boutros** · Senior Claims Analyst · Beacon Mutual · advisor
  - Appears in: `insurance-life` default (implied), intake, maintenance
  - Role: Manages death claims (FNOL), proof of loss, beneficiary communications, settlement directives
  - Characteristics: Empathetic claims handling, policy contestability expertise, beneficiary relations

### Counterparty personas (client-side, receive and sign)
- **Elena Ramirez** · Homeowner (insured) · client
  - Appears in: `insurance` default, (intake variant: applicant), maintenance
  - Documents: HO3 application, binder, declarations, mortgagee notice
  - Signature scenes: Scene 3 (Signing), Scene 5 (Workspace access)

- **Theresa Whitfield** · Beneficiary (life insurance claim) · client
  - Appears in: `insurance-life` default, intake (variant), maintenance (policy update)
  - Documents: Proof of loss, payment election, beneficiary attestation
  - Signature scenes: Scene 3 (Signing), Scene 5 (Workspace access)

- **Patel Logistics** · Claimant (commercial auto) · client
  - Appears in: `insurance-pc` default, intake, maintenance
  - Documents: FNOL package, claim authorization, lien/subrogation waiver
  - Signature scenes: Scene 3 (Signing), Scene 5 (Workspace access)

### Document signings per vertical
- **insurance** (homeowners): HO3 Application · Binder · Prior-Claims Disclosure · Mortgagee Notice
- **insurance-pc** (commercial): FNOL Report · Claim Authorization · Liability Waiver · Subrogation Waiver
- **insurance-life** (death claim): Proof of Loss · Payment Election Form · Beneficiary Attestation

---

## Per-flow rewrite

### insurance · default (5 scenes) — Homeowners Binder

**Current state**:
- S1 Sender: "Marisol issues the HO3 binder for the Ramirez family from Sentinel's underwriting webform."
- S1 Persona: MISSING → Need to name the underwriter
- Verdict: AMBIGUOUS (no sender persona)

**Issues flagged**:
- S1 sender lacks a named persona. Underwriting action (issuing a binder) clearly demands an advisor-side underwriter, not compliance or legal.

**Proposed fix**:
- **S1 Persona**: Marisol Vega · Senior Underwriter · Sentinel · advisor
- Scene 1 lede already correctly frames her action (binder issuance). Lock in the persona definition.
- No beat-level changes; S1 narration is already coherent.
- **Verdict change**: AMBIGUOUS → OK (once persona is locked)

---

### insurance · intake (4 scenes) — Homeowners Application

**Current state**:
- S1 Sender: Self-service or webform entry from applicant
- S1 Persona: MISSING
- Verdict: AMBIGUOUS (no sender persona)

**Issues flagged**:
- S1 lacks a sender persona. In intake archetype, the applicant (Elena Ramirez) is the self-service actor, not an advisor. Narration should clarify that Elena originates the application.

**Proposed fix**:
- **S1 Persona**: Elena Ramirez · Applicant / Homeowner · Sentinel · client
- (Intake shifts the side: the applicant self-serves rather than waiting for an agent to issue a pre-built binder.)
- Reframe S1 lede to: "Elena Ramirez, a homeowner seeking HO3 coverage, completes Sentinel's online application — property address, coverage preferences, prior claims."
- S2–S4 remain unchanged (Elena verifies, signs, repository extracts).
- S5 (Workspace): Marisol joins as advisor-side reviewer; Elena and Marisol see underwriting progress in shared Workspace.
- **Verdict change**: AMBIGUOUS → OK

---

### insurance · fraud-fabric (3 scenes) — CLEAR + Chain of Custody

**Current state**:
- S1: Pre-binder CLEAR check; underwriter initiates high-risk workflow
- S1 Persona: MISSING
- Verdict: OK (no persona required; CLEAR is a system-driven gate)

**Issues flagged**:
- None. The system actor (Agreement Desk / Maestro proxy) handles the gate; human persona not needed.

**Proposed fix**:
- No change. Verdict stands: OK
- If narration exists, frame S1 as: "Sentinel's Agreement Desk triggers CLEAR verification for the Ramirez family's high-risk profile (prior claims, new build in fire zone)."
- Human review (Marisol) happens post-CLEAR at S2.

---

### insurance · maintenance (3 scenes) — Renewal / Endorsement

**Current state**:
- S1: Renewal notice or endorsement request; underwriter initiates
- S1 Persona: MISSING
- Verdict: OK (framework is sound, persona just needs naming)

**Issues flagged**:
- No persona conflicts. Maintenance flow is initiated by Marisol (advisor side) reviewing renewal/endorsement from Sentinel's portal.

**Proposed fix**:
- **S1 Persona**: Marisol Vega · Senior Underwriter · Sentinel · advisor
- Lede: "Marisol opens Sentinel's renewal queue and selects the Ramirez family's HO3 renewal — property data, coverage history, and prior claims already pre-loaded. Coverage remains unchanged, premium increases 8% year-over-year due to claims."
- S2 (Document signature): Elena receives renewal notice and signs acknowledgment / updated declarations.
- S3 (Data): Marisol asks AI assistant about coverage changes from prior year; repository confirms no changes.
- **Verdict**: OK (Marisol is the consistent advisor-side actor across all insurance flows)

---

### insurance-pc · default (5 scenes) — Commercial Auto FNOL

**Current state**:
- S1: First Notice of Loss from claimant (Patel Logistics)
- S1 Persona: MISSING (should be Andre Sokolov, Northgate field adjuster)
- Verdict: OK in structure, but persona undefined

**Issues flagged**:
- None structural; the flow is sound (inbound claim → identity verify → sign proof of loss → adjuster reviews). Just need to name the adjuster.

**Proposed fix**:
- **S1 Persona**: Andre Sokolov · Claims Adjuster · Northgate Mutual · advisor (implied; receives the claim)
- Lede: "An auto claim for Patel Logistics' commercial vehicle — underinsured motorist liability — arrives at Northgate's Agreement Desk. Andre Sokolov in Claims opens the file; the FNOL package is pre-assembled and routed to Patel."
- S2–S5: Patel (claimant) verifies, signs proof of loss + authorization; Andre manages from Claims side via Workspace.
- **Verdict**: OK (once persona is named)

---

### insurance-pc · intake (4 scenes) — Commercial Line Application

**Current state**:
- S1: Applicant self-serves or advisor issues quote
- S3 Signing: **MISMATCH** — persona side = "advisor" but canonical side = "client"
- Verdict: MISMATCH (wrong signer at S3)

**Issues flagged**:
- S3 (Signing) has the advisor signing instead of the client. The claimant (Patel Logistics) should sign the application/authorization; Andre (adjuster) reviews post-signature.
- Root cause: confusing "intake" (self-service applicant) with "advisor-issues quote" (advisor-initiated).

**Proposed fix**:
- **Clarify the archetype**: This is a **B (Self-service)** or **A (Sender-webform)** flow, not A-trig Maestro.
- If **self-service (B)**: Patel Logistics' operations manager fills out the commercial auto application online. Verdict: Patel (client) at S1 and S3. OK.
- If **advisor-initiates (A)**: Andre issues the application/endorsement from Northgate's desktop. Patel (client) reviews and signs at S3. OK.
- **Recommended resolution**: Frame as **A (Sender-webform)**.
  - **S1 Persona**: Andre Sokolov · Claims Adjuster / Coverage Specialist · Northgate Mutual · advisor
  - S1 Lede: "Andre issues a coverage update for Patel Logistics — adding a leased vehicle to their commercial auto policy. He fills the coverage form, confirms limits, and routes the package to Patel."
  - **S3 Persona**: Patel Logistics representative · client (not advisor)
  - S3 Head: "Patel reviews and signs the coverage authorization."
- **Verdict change**: MISMATCH → OK (once sides are corrected)

---

### insurance-pc · fraud-fabric (3 scenes) — CLEAR + Claims Liability Check

**Current state**:
- S1: High-value liability claim; CLEAR check triggers before fund release
- S1 Persona: MISSING (system actor OK)
- Verdict: OK

**Issues flagged**:
- None. CLEAR is a gate; no human persona required at S1.

**Proposed fix**:
- No change. Verdict stands: OK
- Narration: "Northgate's Agreement Desk triggers CLEAR verification for the Patel Logistics claim ($250k+ liability exposure). Post-CLEAR, Andre expedites the settlement conversation."

---

### insurance-pc · maintenance (3 scenes) — Policy Endorsement / Update

**Current state**:
- S1: Advisor (Andre) opens endorsement; **MISMATCH** — persona side = "advisor" but canonical = "client" (Portal Entry)
- Verdict: MISMATCH (wrong initiator at S1)

**Issues flagged**:
- S1 has the advisor initiating from a portal (which is a client-side action). Confusion between "advisor reviews outstanding items" vs. "client updates policy online."

**Proposed fix**:
- **Clarify the archetype**: Is this **maintenance by advisor** or **maintenance by client**?
- **Recommended resolution**: Frame as **advisor-driven maintenance (Marisol/Andre review cycle)**.
  - **S1 Persona**: Andre Sokolov · Claims Adjuster / Coverage Specialist · Northgate Mutual · advisor
  - S1 Head: "Andre opens Patel Logistics' policy file to process an endorsement request — adding coverage for newly leased equipment."
  - S1 Lede: "Andre's queue shows the endorsement request flagged by Patel. He fills the form, confirms the additional premium, and routes the package to Patel for approval."
  - **S3 Persona**: Patel Logistics representative · client
  - S3 Head: "Patel reviews the endorsed policy and signs the update."
- **Verdict change**: MISMATCH → OK (side corrected)

---

### insurance-life · default (5 scenes) — Death Claim Processing

**Current state**:
- S1: Inbound death notice from funeral director; system parses and queues
- S1 Persona: MISSING (system actor correct, but Camille should be named for S2–S5)
- Verdict: OK in structure

**Issues flagged**:
- No persona conflicts. Flow is inbound (C archetype); Camille is the natural advisor-side actor who manages the empathetic claim workflow.

**Proposed fix**:
- **S1 Persona** (system/Desk): No change; system-driven gate is correct.
- **S2+ Persona**: Camille Boutros · Senior Claims Analyst · Beacon Mutual · advisor
- S2 Lede: "Camille Boutros in Claims opens the Whitfield claim file. The FNOL package is pre-assembled — proof of loss, payment election, beneficiary attestation — in empathy-toned framing."
- S3–S5: Theresa (beneficiary) verifies, signs; Camille manages settlement from Claims Workspace.
- **Verdict**: OK (once Camille is named)

---

### insurance-life · intake (4 scenes) — Policy Application / New Issue

**Current state**:
- S1: Applicant completes life insurance application online
- S1 Persona: MISSING
- Verdict: AMBIGUOUS (no sender persona)

**Issues flagged**:
- Self-service intake should name the applicant (e.g., a family member applying for coverage). Unclear who is taking the action.

**Proposed fix**:
- **Determine the applicant** (recommend: Marcus Whitfield himself, or a beneficiary e.g., Theresa applying on Marcus's behalf).
- **S1 Persona**: Marcus Whitfield · Applicant · Beacon Mutual · client (or Theresa Whitfield · Beneficiary / Applicant · Beacon Mutual · client)
- S1 Head: "Marcus Whitfield completes Beacon Mutual's life insurance application online — age, health history, coverage amount, beneficiary designation."
- S1 Lede: "Marcus fills out the health questionnaire on Beacon's portal. Coverage amount ($500k), term (20-year), and beneficiary (Theresa, spouse) are selected based on his needs. Submit triggers underwriting."
- S2–S4: Standard (Marcus verifies, signs, repository extracts).
- S5: Camille joins Workspace to manage underwriting; Marcus and Camille track approval status.
- **Verdict change**: AMBIGUOUS → OK

---

### insurance-life · fraud-fabric (3 scenes) — MIB + Contestability Check

**Current state**:
- S1: Policy application routes through MIB (Medical Information Bureau) check; high-risk flags require underwriter review
- S1 Persona: MISSING (system actor OK)
- Verdict: OK

**Issues flagged**:
- None. MIB check is a system gate; no human persona required at S1.

**Proposed fix**:
- No change. Verdict stands: OK
- Narration: "Beacon's Agreement Desk runs the applicant (Marcus) through MIB queries and contestability screening. High-risk flags surface for Camille's underwriting review before approval."

---

### insurance-life · maintenance (3 scenes) — Beneficiary Update / Policy Service

**Current state**:
- S1: Beneficiary update request (Theresa updates her address or bank account on a policy)
- S1 Persona: MISSING
- Verdict: OK in structure

**Issues flagged**:
- No persona conflicts. Theresa (beneficiary) self-serves to update her information on an existing policy. Camille reviews from Claims side.

**Proposed fix**:
- **S1 Persona**: Theresa Whitfield · Beneficiary · Beacon Mutual · client
- S1 Head: "Theresa Whitfield updates her beneficiary bank account on Marcus's life insurance policy — she's relocating and changed financial institutions."
- S1 Lede: "Theresa logs into her portal and selects 'Update Beneficiary Information.' Current account on file is shown; Theresa enters her new bank details and submits."
- S2: Theresa verifies identity (to gate sensitive banking changes).
- S3: Theresa signs authorization for the account change.
- **Verdict**: OK (Theresa is the consistent beneficiary across all insurance-life flows)

---

## Summary of persona assignments

### Insurance (P&C Homeowners)
| Flow | Advisor | Claimant | Documents |
|---|---|---|---|
| default | Marisol Vega (Underwriter) | Elena Ramirez | HO3 Binder + Application |
| intake | Elena Ramirez (self) | Elena Ramirez | HO3 Application |
| fraud-fabric | — (system gate CLEAR) | Elena Ramirez | Binder |
| maintenance | Marisol Vega (renewal) | Elena Ramirez | Renewal Notice |

### Insurance-PC (Commercial Lines)
| Flow | Advisor | Claimant | Documents |
|---|---|---|---|
| default | Andre Sokolov (Adjuster) | Patel Logistics | FNOL Report |
| intake | Andre Sokolov (coverage form) | Patel Logistics | Coverage Authorization |
| fraud-fabric | — (system gate CLEAR) | Patel Logistics | Liability Release |
| maintenance | Andre Sokolov (endorsement) | Patel Logistics | Endorsement |

### Insurance-Life (Death Claims / Policy Service)
| Flow | Advisor | Claimant | Documents |
|---|---|---|---|
| default | Camille Boutros (Claims Analyst) | Theresa Whitfield (beneficiary) | Proof of Loss + Payment Election |
| intake | Applicant (Marcus or Theresa) | Applicant | Life Application |
| fraud-fabric | — (system gate MIB) | Applicant | Application |
| maintenance | Theresa Whitfield (self) | Theresa Whitfield | Beneficiary Update |

---

## What this changes downstream

- **Audit detector**: Extend the side/role coherence rule from Hillside to flag all (vertical, usecase, scene) tuples where advisor-side roles are non-advisor (Compliance, Legal, Operations, Finance). Insurance family now passes after naming.
- **Hotspot copy**: Each vertical's S1 webform is already tenant-branded; persona names in narration carry the role clarity.
- **Workspace access S5**: All S5 lede copy should show both parties (e.g., "Marisol and Elena continue in one Workspace"). Verify the generated copy on next pass.
- **Splash treatment**: Insurance default opens with splash; verify splash mentions "Sentinel," "Ramirez Family," "HO3 binder" (not generic "homeowners policy").

---

## How to apply this

If approved:

1. **Edit** `stories/_shared/story-shell.html`  
   - Rename and lock persona definitions in scene headers for all 12 insurance flows (3 verticals × 4 usecases).
   - Update S1 lede/head copy for flows marked AMBIGUOUS (insurance/default, insurance/intake, insurance-life/intake).
   - Correct S1 and S3 personas for insurance-pc/intake and insurance-pc/maintenance (swap sides).
   - One commit per vertical.

2. **Re-run audit**  
   - `_audits/_persona_audit_build.sh` to refresh all three insurance vertical rows.
   - Insurance rows should re-classify as OK once personas are locked.

3. **Verify downstream**  
   - Spot-check S5 Workspace narration to confirm both parties are named (Marisol + Elena, Andre + Patel, Camille + Theresa).
   - Confirm splash copy for `insurance:` vertical mentions Sentinel + Ramirez + HO3 Binder (not generic text).

---

## What this does NOT change

- Scene structure (5-scene default, 4-scene intake, 3-scene fraud-fabric, 3-scene maintenance) remains canonical.
- Document packages remain as designed (HO3 binder = 4 docs; FNOL = 4 docs; death claim = 3 docs).
- Identity verification gates, signing ceremonies, repository extraction, Workspace handoff — all workflows unchanged.
- No TGK Capital, no co-branding: Sentinel, Northgate, Beacon are independent carriers; no shared tenant.

