# Procurement · TGK — proposed new vertical

**Status**: Draft for review · 2026-04-30
**Source of change**: New vertical addition. Procurement officer (David Reyes, TGK) sources and onboards a new vendor (Sarah Mitchell, Fontara, Inc.). Workflow orchestrated by CLM, signed via Docusign, continued in shared Workspace.

---

## Tenant metadata

| Field | Value |
|---|---|
| `key` | "procurement" |
| `label` | "Procurement" |
| `tenant` | "TGK" |
| `subtitle` | × Fontara, Inc. — New Supplier Onboarding |
| `tenantColor` | #6B4FAF (deep purple) |
| `preset` | "procurement" (new) |
| `category` | "onboarding" |
| `splashOk` | false |

---

## Cast

- **David Reyes** · Procurement Officer · TGK · advisor · Owns vendor sourcing and package configuration in TGK's procurement system; routes the MSA to Fontara for signature.
- **Sarah Mitchell** · Vendor Sales Rep · Fontara, Inc. · client · Decision-maker signing the MSA + Vendor Onboarding Form on behalf of the supplier; verifies identity and executes the agreement.
- **Docusign CLM** · System actor · Contract lifecycle · MSA + Vendor Onboarding Form assembly, negotiation proxy, signing orchestration.
- **Docusign** · System actor · Agreement ceremony · MSA + Vendor Onboarding Form + Insurance Certificate Acknowledgement signing and execution.

---

## Document(s) signed

- Master Service Agreement (MSA) + Vendor Onboarding Form + Insurance Certificate Acknowledgement

---

## SCENE 1 — Sender (David configures the vendor in CLM)

**Tag**: SCENE 1 OF 5 · INTAKE · CLM-DRIVEN VENDOR CONFIG

**Persona**:
> David Reyes · Procurement Officer · TGK · advisor

**Scene head**:
> David Reyes configures Fontara as a new supplier in TGK's CLM system.

**Scene lede**:
> David Reyes, Procurement Officer at TGK, initiates a new vendor onboarding workflow in CLM for Fontara, Inc. Vendor profile, category, contract terms, and primary contact (Sarah Mitchell, Sales Rep) are entered. When David submits the configuration, CLM detects the vendor type and auto-assembles the MSA + Vendor Onboarding Form + Insurance Certificate Acknowledgement — pre-populated from TGK's standard templates and sourcing data.

### Beats

| # | Head | Lede |
|---|---|---|
| B1 | David opens CLM and creates a new vendor. | Vendor name (Fontara, Inc.), classification (goods supplier), and sourcing category (facilities services) are selected. |
| B2 | David enters vendor profile: company registration, primary contact, billing address. | Sarah Mitchell's email and title (Vendor Sales Rep) are linked to the vendor record. This is who will receive the signing invitation. |
| B3 | David sets contract terms: effective date, initial term, renewal language. | 1-year initial term with auto-renewal; renewal notice 60 days before expiration. CLM auto-attaches standard termination and liability language. |
| B4 | David configures insurance requirements and compliance attachments. | Certificate of Insurance required; W9 expected at execution; Insurance Certificate Acknowledgement auto-attaches to the package. |
| B5 | David submits the vendor configuration — workflow triggers. | CLM detects the submission. In seconds, the vendor onboarding package assembly job launches in the background. |

---

## SCENE 2 — Identity (Sarah verifies)

**Tag**: SCENE 2 OF 5 · IDENTITY

**Persona**:
> Sarah Mitchell · Vendor Sales Rep · Fontara, Inc. · client

**Scene head**:
> Sarah Mitchell completes identity verification.

**Scene lede**:
> Before the MSA moves, Docusign routes Sarah through identity verification — the authorized signatory on the Fontara side. Desktop consent → mobile ID scan → biometric match → back to the browser. No separate portal, no procurement phone call.

### Beats

| # | Head | Lede |
|---|---|---|
| B1 | Sarah is prompted to verify before signing. | As the signer on the MSA + Vendor Onboarding Form, Sarah must verify identity. TGK's branding is visible throughout. |
| B2 | Identity verification selected — address and ID verified. | One tap. Identity verification confirms Sarah's identity against government-issued ID and cross-references address. |
| B3 | Mobile handoff to Sarah's phone. | Sarah enters her phone number. An identity verification session opens on her device — no app download, no portal. |
| B4 | ID scan and biometric match in progress. | Identity verification captures the ID photo and selfie on mobile and runs the biometric comparison in real time. |
| B5 | Identity verified — MSA ceremony unlocked. | Green check on mobile, confirmation on desktop. The MSA + Vendor Onboarding Form package is cleared and the signing ceremony opens immediately. |

---

## SCENE 3 — Signing (Sarah signs the MSA + Vendor Onboarding Form in the Docusign ceremony)

**Tag**: SCENE 3 OF 5 · SIGNING · MSA + VENDOR ONBOARDING FORM

**Persona**:
> Sarah Mitchell · Vendor Sales Rep · Fontara, Inc. · client

**Scene head**:
> Sarah reviews and signs the MSA + Vendor Onboarding Form + Insurance Certificate Acknowledgement.

**Scene lede**:
> TGK-branded email with the agreement link. Yellow Sign tab floating over the MSA, Vendor Onboarding Form, and Insurance Certificate Acknowledgement. Adopt Signature modal, completion with multi-recipient routing. One ceremony, one audit trail — the executed package lands back in CLM immediately, and TGK's procurement team triggers the vendor record push to ServiceNow.

**iframe src**: `/flipbooks/DocuSign_CLM_Procurement_Demo_Video.html`

### Beats

| # | Head | Lede |
|---|---|---|
| B1 | Sarah receives the signing invitation from TGK. | The flipbook plays CLM request → draft → negotiate → approve → sign → store flow. Inside CLM, the vendor onboarding package is ready for signature. |
| B2 | Sarah opens the MSA in the signing ceremony. | The MSA, Vendor Onboarding Form, and Insurance Certificate Acknowledgement are bundled in one envelope. Guided flow highlights the first signature field. |
| B3 | Sarah adopts her signature. | The Adopt Signature modal shows a typed preview. Sarah selects a style and applies it — legally binding with full audit trail. |
| B4 | The package routes to David and TGK's procurement approver. | Multi-recipient routing sends the executed envelope to David (Procurement Officer) and TGK's procurement manager in parallel. |
| B5 | Execution confirmed — certified copy issued. | The executed MSA + Vendor Onboarding Form + Insurance Certificate Acknowledgement is in both parties' inboxes. The signing certificate captures every event: IP, timestamp, biometric pass, signature applied. |

---

## SCENE 4 — Data (the agreement lands back in CLM and triggers vendor master update)

**Tag**: SCENE 4 OF 5 · DATA

**Persona**:
> David Reyes · Procurement Officer · TGK · advisor

**Scene head**:
> The CLM repository extracts the MSA and pushes the vendor record to ServiceNow.

**Scene lede**:
> The CLM system reads the executed MSA + Vendor Onboarding Form and pulls out 10 key terms — vendor name, effective date, contract term, renewal notice period, payment terms, insurance requirements, termination language, and governing law. All are filed back into the vendor master in CLM and auto-synced to TGK's ServiceNow vendor database. The AI assistant is one click away for any follow-up.

### Beats

| # | Head | Lede |
|---|---|---|
| B1 | The CLM repository surfaces the executed MSA. | The AI-Assisted banner confirms extraction. The MSA + Vendor Onboarding Form appear in CLM as a vendor document automatically. |
| B2 | 10 fields extracted from the MSA. | Vendor name, effective date, contract term, renewal trigger date, payment schedule, insurance cert requirement, termination for-cause and for-convenience language — all visible in column view, marked with the AI extraction indicator. |
| B3 | Key terms ready for downstream systems. | Every extracted field pushes into TGK's ServiceNow vendor master and syncs across procurement workflows. No manual data entry, no re-keying risk. |
| B4 | David asks the AI assistant about insurance renewal requirements. | He opens the MSA in CLM and types the question directly. The AI assistant searches only the executed MSA — grounded in the document. |
| B5 | The AI assistant answers with inline citations. | The insurance clause is quoted verbatim with a page reference. David has the answer in seconds — and the evidence to share with the insurance compliance team. |

---

## SCENE 5 — Workspace (David and Sarah continue)

**Tag**: SCENE 5 OF 5 · WORKSPACE

**Persona**:
> David Reyes · Procurement Officer · TGK · advisor

**Scene head**:
> TGK and Fontara continue in a shared Workspace for supplier onboarding and ongoing vendor management.

**Scene lede**:
> Signature is the beginning, not the end. The shared Workspace holds the executed MSA set, W9 collection task, Insurance Certificate renewal calendar, vendor compliance attestations, and the AI assistant rail — TGK and Fontara see the same state. No email threads. No version chaos.

### Beats

| # | Head | Lede |
|---|---|---|
| B1 | Fontara receives access to the vendor Workspace. | A TGK-branded email invites Sarah into the vendor management Workspace. One click — no new account, no separate vendor portal required. |
| B2 | Both parties see the same real-time state. | Overview shows the contract summary, effective date, next renewal trigger. Tasks shows W9 collection, insurance certificate renewal checklist, and compliance attestations — visible to both TGK and Fontara. |
| B3 | The AI assistant is live in the agent rail. | The Activity tab shows every workflow step completed. The AI assistant answers questions grounded in the executed MSA and vendor file. |
| B4 | W9 and insurance certificate collection tasks open. | The tasks drill into the onboarding agent — W9 upload, insurance cert upload, renewal schedule. All tracked, no email threads. |
| B5 | Vendor onboarding complete — relationship live. | Every document executed, every task assigned, both parties in the same Workspace. TGK's procurement team has the full audit trail and integrated vendor record in ServiceNow. |

---

## Hotspot mapping

- **Scene 1**: Reuse `webform_intake` hotspot pattern (vendor configuration form).
- **Scene 2**: Reuse `identity_verification` hotspot pattern.
- **Scene 3**: **No hotspot anchors** — the iframe (flipbook JPEG sequence) plays itself; narrative describes the CLM orchestration flow (CLM vendor config → MSA assembly → Docusign signing → vendor record push).
- **Scene 4**: Reuse `agreement_repository_extraction` hotspot pattern.
- **Scene 5**: Reuse `workspace_onboarding` hotspot pattern.

---

## Notes for the apply-pass

1. **VERTICALS object**: Add `procurement:` block to `VERTICALS` in `/stories/_shared/story-shell.html` (after the `sales` block).
2. **Preset naming**: "procurement" preset is new; confirm no collision with existing preset registry.
3. **TGK brand color**: Use deep purple (#6B4FAF) as the procurement tenant color, distinct from sales blue (#0066CC).
4. **Flipbook iframe**: Scene 3 uses the existing flipbook at `/flipbooks/DocuSign_CLM_Procurement_Demo_Video.html` — no edit to that file needed; just reference it via iframe in the story-shell definition.
5. **Persona side/role coherence**: David Reyes = advisor (Procurement Officer is an advisor-side role per TGK vocabulary). Sarah Mitchell = client (Vendor Sales Rep is a client-side role). Passes side/role audit.
6. **No splash**: `splashOk: false` — procurement vertical does not open with a splash screen.
7. **Unified picker**: The "procurement" key will need adding to the chip-filter strip config in the unified picker (separate task; out of scope for this proposal).

---

## What this changes downstream

- **Hotspot copy in `HOTSPOTS`**: Scene 3's iframe is JPEG content (flipbook); no interactive hotspots to anchor. Sidebar narration carries the meaning (CLM vendor config → MSA assembly → signing flow).
- **Audit detector**: David Reyes (Procurement Officer, advisor side) and Sarah Mitchell (Vendor Sales Rep, client side) both pass side/role coherence checks.
- **Flipbook reuse**: No new flipbook needed; existing `DocuSign_CLM_Procurement_Demo_Video.html` demonstrates the exact workflow (CLM request → draft → negotiate → approve → sign → store).

---

## How to apply this

If you approve the proposal, I'll:

1. Add the `procurement:` VERTICALS block to `/stories/_shared/story-shell.html` — matching the data structure and voice of `sales:` and `wealth:`.
2. Confirm deep purple (#6B4FAF) is the intended tenant color, or update if a different procurement-themed color is preferred.
3. Re-run the audit to confirm persona coherence and hotspot coverage.
4. Confirm the flipbook iframe src path is correct and renders without CORS issues.

If any scene head, lede, beat, persona name, or cast detail reads off — flag it inline and I'll revise before applying.
