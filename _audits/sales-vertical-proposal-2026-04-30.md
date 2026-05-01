# Sales · TGK — proposed new vertical

**Status**: Draft for review · 2026-04-30
**Source of change**: New vertical addition. Sales rep (Marc Benoff, TGK) closes MSA + Order Form with procurement contact (Diego Castaneda, Black Mesa Energy). Workflow orchestrated by Salesforce + Agentforce, signed via Docusign, continued in shared Workspace.

---

## Tenant metadata

| Field | Value |
|---|---|
| `key` | "sales" |
| `label` | "Sales" |
| `tenant` | "TGK" |
| `subtitle` | × Black Mesa Energy — Closed Won |
| `tenantColor` | #0066CC (Salesforce blue) |
| `preset` | "sales" (new) |
| `category` | "onboarding" |
| `splashOk` | false |

---

## Cast

- **Marc Benoff** · Sales Rep · TGK · advisor · Works the opportunity in Salesforce; closes the deal with Black Mesa.
- **Diego Castaneda** · Procurement Manager · Black Mesa Energy · client · Decision-maker on the MSA + Order Form; verifies identity and signs.
- **Salesforce + Agentforce** · System actor · Workflow engine · Stage gate triggers agreement auto-launch from CRM data.
- **Docusign** · System actor · Agreement ceremony · MSA + Order Form signing and execution.

---

## Document(s) signed

- Master Service Agreement (MSA) + Order Form + standard service rider (SaaS subscription package)

---

## SCENE 1 — Sender (Marc opens the deal in Salesforce)

**Tag**: SCENE 1 OF 5 · OPPORTUNITY · CRM-DRIVEN INTAKE

**Persona**:
> Marc Benoff · Sales Rep · TGK · advisor

**Scene head**:
> Marc Benoff opens a new opportunity for Black Mesa Energy in Salesforce.

**Scene lede**:
> Marc Benoff, Sales Rep at TGK, creates a new opportunity in Salesforce for Black Mesa Energy's SaaS subscription contract. Opportunity stage, amount, and contact (Diego Castaneda, Procurement) are entered. When Marc moves the opportunity to "Proposal," Agentforce detects the stage gate and auto-launches the agreement generation — pre-filled from CRM data.

### Beats

| # | Head | Lede |
|---|---|---|
| B1 | Marc opens Salesforce and creates a new opportunity. | Account pre-populated from prior Black Mesa interactions; Marc adds the opportunity name and stage. |
| B2 | Marc enters the deal details: opportunity stage, amount, close date. | Deal size ($150k annual SaaS subscription), 3-year term, closes end of Q2. Agentforce watches the stage field. |
| B3 | Marc adds Diego Castaneda as the decision-maker contact. | Diego's email and title (Procurement Manager) are linked to the opportunity. This is who will receive the agreement link. |
| B4 | Marc adds internal stakeholders: Sales VP, Solution Consultant, Customer Success Manager. | All are visible in the opportunity team. When the opportunity advances, all get notified. |
| B5 | Marc moves the opportunity to "Proposal" stage — workflow triggers. | Agentforce detects the stage change. In seconds, the agreement assembly job launches in the background. |

---

## SCENE 2 — Identity (Diego verifies)

**Tag**: SCENE 2 OF 5 · IDENTITY

**Persona**:
> Diego Castaneda · Procurement Manager · Black Mesa Energy · client

**Scene head**:
> Diego Castaneda completes identity verification.

**Scene lede**:
> Before the MSA moves, Docusign routes Diego through identity verification — the authorized decision-maker on the Black Mesa side. Desktop consent → mobile ID scan → biometric match → back to the browser. No separate portal, no procurement phone call.

### Beats

| # | Head | Lede |
|---|---|---|
| B1 | Diego is prompted to verify before signing. | As the signer on the MSA + Order Form, Diego must verify identity. TGK's branding is visible throughout. |
| B2 | Identity verification selected — address and ID verified. | One tap. Identity verification confirms Diego's identity against government-issued ID and cross-references address. |
| B3 | Mobile handoff to Diego's phone. | Diego enters his phone number. An identity verification session opens on his device — no app download, no portal. |
| B4 | ID scan and biometric match in progress. | Identity verification captures the ID photo and selfie on mobile and runs the biometric comparison in real time. |
| B5 | Identity verified — MSA ceremony unlocked. | Green check on mobile, confirmation on desktop. The MSA + Order Form package is cleared and the signing ceremony opens immediately. |

---

## SCENE 3 — Signing (Diego signs the MSA + Order Form in the Docusign ceremony)

**Tag**: SCENE 3 OF 5 · SIGNING · MSA + ORDER FORM

**Persona**:
> Diego Castaneda · Procurement Manager · Black Mesa Energy · client

**Scene head**:
> Diego reviews and signs the MSA + Order Form.

**Scene lede**:
> TGK-branded email with the agreement link. Yellow Sign tab floating over the MSA, Order Form, and service rider. Adopt Signature modal, completion with multi-recipient routing. One ceremony, one audit trail — the executed package lands back in Salesforce as an opportunity attachment immediately.

**iframe src**: `/flipbooks/IAM_for_Sales_and_Agentforce_Demo.html`

### Beats

| # | Head | Lede |
|---|---|---|
| B1 | Diego receives the signing invitation from TGK. | The flipbook plays Salesforce + Agentforce + Docusign in sequence. Inside Salesforce, Agentforce triggers the envelope launch. |
| B2 | Diego opens the MSA in the signing ceremony. | The MSA, Order Form, and service rider are bundled in one envelope. Guided flow highlights the first signature field. |
| B3 | Diego adopts his signature. | The Adopt Signature modal shows a typed preview. Diego selects a style and applies it — legally binding with full audit trail. |
| B4 | The package routes to Marc and TGK's approver. | Multi-recipient routing sends the executed envelope to Marc (Sales Rep, opportunity owner) and TGK's contract approver in parallel. |
| B5 | Execution confirmed — certified copy issued. | The executed MSA + Order Form is in both parties' inboxes. The signing certificate captures every event: IP, timestamp, biometric pass, signature applied. |

---

## SCENE 4 — Data (the agreement lands back in Salesforce)

**Tag**: SCENE 4 OF 5 · DATA

**Persona**:
> Marc Benoff · Sales Rep · TGK · advisor

**Scene head**:
> The agreement repository extracts the MSA and lands it back in Salesforce.

**Scene lede**:
> The agreement repository reads the executed MSA + Order Form and pulls out 12 key terms — counterparty, effective date, contract value, term length, renewal date, payment schedule, performance guarantees, termination clauses, governing law, and integration. All filed into Salesforce as an opportunity attachment and linked to the Black Mesa account. The AI assistant is one click away for any follow-up.

### Beats

| # | Head | Lede |
|---|---|---|
| B1 | The agreement repository surfaces the executed MSA. | The AI-Assisted banner confirms extraction. The MSA + Order Form appear in Salesforce as an opportunity attachment automatically. |
| B2 | 12 fields extracted from the MSA. | Contract value, term start, renewal date, payment schedule, termination clause, and performance guarantees — all visible in column view, marked with the AI extraction indicator. |
| B3 | Key terms ready for downstream systems. | Every extracted field is ready to push into TGK's billing system and CRM record. No manual data entry, no re-keying risk. |
| B4 | Marc asks the AI assistant about the renewal date. | He opens the MSA in Salesforce and types the question directly. The AI assistant searches only the executed MSA — grounded in the document. |
| B5 | The AI assistant answers with inline citations. | The renewal clause is quoted verbatim with a page reference. Marc has the answer in seconds — and the evidence to share with Customer Success. |

---

## SCENE 5 — Workspace (Marc and Diego continue)

**Tag**: SCENE 5 OF 5 · WORKSPACE

**Persona**:
> Marc Benoff · Sales Rep · TGK · advisor

**Scene head**:
> TGK and Black Mesa continue in a shared Workspace for customer onboarding and ongoing delivery.

**Scene lede**:
> Closing is the beginning, not the end. The shared Workspace holds the executed MSA set, implementation kickoff checklist, a onboarding task list, and the AI assistant rail — TGK and Black Mesa see the same state. No email threads. No version chaos.

### Beats

| # | Head | Lede |
|---|---|---|
| B1 | Black Mesa receives access to the onboarding Workspace. | A TGK-branded email invites Diego into the customer Workspace. One click — no new account, no separate customer portal required. |
| B2 | Both parties see the same real-time state. | Overview shows the contract summary, deal value, go-live date. Tasks shows implementation checklist and success milestones — visible to both TGK and Black Mesa. |
| B3 | The AI assistant is live in the agent rail. | The Activity tab shows every workflow step completed. The AI assistant answers questions grounded in the executed MSA and onboarding file. |
| B4 | Implementation kickoff task open. | The task drills into the onboarding agent — training schedules, data migration prep, integrations checklist. All tracked, no email threads. |
| B5 | Customer onboarding in motion — relationship live. | Every document executed, every task assigned, both parties in the same Workspace. TGK's Customer Success team has the full audit trail. |

---

## Hotspot mapping

- **Scene 1**: Reuse `webform_intake` hotspot pattern (opportunity creation form).
- **Scene 2**: Reuse `identity_verification` hotspot pattern.
- **Scene 3**: **No hotspot anchors** — the iframe (flipbook JPEG sequence) plays itself; narrative describes the orchestration flow (Salesforce → Agentforce → Docusign).
- **Scene 4**: Reuse `agreement_repository_extraction` hotspot pattern.
- **Scene 5**: Reuse `workspace_onboarding` hotspot pattern.

---

## Notes for the apply-pass

1. **VERTICALS object**: Add `sales:` block to `VERTICALS` in `/stories/_shared/story-shell.html` (after the `insurance` block).
2. **Preset naming**: "sales" preset is new; confirm no collision with existing preset registry.
3. **TGK brand color**: Use Salesforce blue (#0066CC) or confirm alternate SaaS-neutral indigo if brand preference differs.
4. **Flipbook iframe**: Scene 3 uses the existing flipbook at `/flipbooks/IAM_for_Sales_and_Agentforce_Demo.html` — no edit to that file needed; just reference it via iframe in the story-shell definition.
5. **Persona side/role coherence**: Marc Benoff = advisor (Sales Rep is an advisor-side role per TGK vocabulary). Diego Castaneda = client (Procurement is a client-side role). Passes side/role audit.
6. **No splash**: `splashOk: false` — sales vertical does not open with a splash screen.
7. **Unified picker**: The "sales" key will need adding to the chip-filter strip config in the unified picker (separate task; out of scope for this proposal).

---

## What this changes downstream

- **Hotspot copy in `HOTSPOTS`**: Scene 3's iframe is JPEG content (flipbook); no interactive hotspots to anchor. Sidebar narration carries the meaning (Salesforce → Agentforce → agreement launch flow).
- **Audit detector**: Marc Benoff (Sales Rep, advisor side) and Diego Castaneda (Procurement, client side) both pass side/role coherence checks.
- **Flipbook reuse**: No new flipbook needed; existing `IAM_for_Sales_and_Agentforce_Demo.html` demonstrates the exact workflow (Salesforce + Agentforce + Docusign).

---

## How to apply this

If you approve the proposal, I'll:

1. Add the `sales:` VERTICALS block to `/stories/_shared/story-shell.html` — matching the data structure and voice of `wealth:` and `banking:`.
2. Confirm Salesforce blue (#0066CC) is the intended tenant color, or update if a different indigo is preferred.
3. Re-run the audit to confirm persona coherence and hotspot coverage.
4. Confirm the flipbook iframe src path is correct and renders without CORS issues.

If any scene head, lede, beat, persona name, or cast detail reads off — flag it inline and I'll revise before applying.
