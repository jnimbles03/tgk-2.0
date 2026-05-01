# State/Local Government · seven-vertical rewrite

**Status**: Draft for review · 2026-04-30
**Scope**: Persona fixes + role coherence + flow integrity for all seven `slgov*` verticals (22 flows total)
**Affected verticals**: `slgov` (Springfield), `slgov-311` (Greenhaven), `slgov-benefits` (Cascade SNAP), `slgov-recertification` (Cascade Medicaid), `slgov-employee-onboarding` (Cascade County HR), `slgov-licensing` (Northbrook), `slgov-vendor-compliance` (Ridgeview)

---

## Key findings

### Audience role inversion

In all seven slgov verticals, **the CITIZEN/RESIDENT/APPLICANT is the client side**. The **agency staff is the advisor side**. This is the inverse of wealth/banking where the private-sector entity (TGK, bank customer) is client and the financial firm is advisor.

Current state: Many slgov flows use agency staff personas on the client side during key moments (e.g., Scene 1 intake shown as "Springfield Team Member" when it should be applicant-driven self-service, or Scene 4 post-execution shown as compliance officer when the resident is the ongoing audience).

**Fix**: Flip audience framing. Intake = self-service (client side). Post-signing execution = agency review (advisor side). Workspace tail = resident + agency staff co-inhabiting the shared space.

### TGK Capital exclusion

Zero instances of TGK Capital in any slgov vertical — correct. All customer references are civic figures: Marissa Rivera (resident), Maria Cortez (citizen), etc. No co-brand framing needed. Preserve this intact.

### Naming inventory by vertical

| Vertical | Tenant | Resident/Citizen | Status |
|----------|--------|------------------|--------|
| `slgov` (Springfield) | Springfield Community Development | Marissa Rivera (property owner, 1420 Oak St) |✓ Diverse, realistic |
| `slgov-311` (Greenhaven) | Greenhaven Public Works | Maria Cortez (citizen) | ✓ Diverse, realistic |
| `slgov-benefits` (Cascade) | Cascade County Benefits | Sylvia Moreno (applicant) | To verify (Cascade reused across 3 verticals) |
| `slgov-recertification` (Cascade) | Cascade County Benefits | James Park (recertifying client) | To verify (Cascade reused) |
| `slgov-employee-onboarding` (Cascade) | Cascade County HR | (new hire name — TBD) | To verify (Cascade reused) |
| `slgov-licensing` (Northbrook) | Northbrook Licensing Bureau | Derek Johnson (applicant) | ✓ Realistic |
| `slgov-vendor-compliance` (Ridgeview) | Ridgeview Procurement | (vendor contact name — TBD) | To verify |

**Naming policy**: Keep existing resident/citizen names; they are already diverse and realistic. Verify staff personas (agency-side) follow neutral, realistic civic-employee names — no echoes of real public officials.

---

## Per-vertical cast + flows

### 1. `slgov` — Springfield Community Development

**Tenant**: Springfield Community Development  
**Customer**: Marissa Rivera (resident, 1420 Oak Street property owner)

**Three flows** (all self-service/intake-driven):

| Flow | Usecase | Scenes | Audience | Persona fix |
|------|---------|--------|----------|------------|
| Residential Permit Application | `intake` | SCENE 1-4: Intake → Packages → Envelope → Workspace | Marissa = client; Springfield staff = advisor (post-signature review) | None needed — role framing already correct |
| Permit Modification (mid-construction) | `maintenance` | SCENE 1-3: Portal entry + auth → Form (pre-filled) → Confirmation | Marissa = client; Staff = advisor | None needed |
| Permit Modification (property ownership chain-of-custody) | `fraud-fabric` | SCENE 1-3: Auth at entry → In-session form → Agreement Desk | Marissa = client; Agreement Desk = advisor visibility | None needed |

**Decision**: All three flows correct as-written. Marissa is the resident applicant (client side) throughout. Springfield staff (implicit advisor side) appear in post-action review contexts. No persona swaps needed.

---

### 2. `slgov-311` — Greenhaven Public Works

**Tenant**: Greenhaven Public Works  
**Customer**: Maria Cortez (citizen, pothole reporter)

**Three flows** (citizen-initiated service requests):

| Flow | Usecase | Scenes | Audience | Persona fix |
|------|---------|--------|----------|------------|
| Pothole Report via QR (intake) | `intake` | SCENE 1-3: Form via QR → Auto-dispatch → Crew completion | Maria = client; Crew/Ops = advisor | None needed — Maria is citizen reporter |
| Follow-up on Open Request | `fraud-fabric` | SCENE 1-3: Auth at entry → Add update → Ops Desk | Maria = client; Ops Desk = advisor | None needed |
| Edit In-Progress Request | `maintenance` | SCENE 1-3: Portal auth → Add update → Confirmation | Maria = client; Staff = advisor | None needed |

**Decision**: All three flows correct as-written. Maria is the citizen (client side). Greenhaven Ops staff appear in advisor-side review/dispatch contexts. No persona swaps needed.

---

### 3. `slgov-recertification` — Cascade County (Medicaid Recertification)

**Tenant**: Cascade County Benefits  
**Customer**: James Park (recertifying Medicaid client)

**Two flows** (re-verification + re-enrollment):

| Flow | Usecase | Scenes | Audience | Persona fix |
|------|---------|--------|----------|------------|
| Recertification Intake (household re-verify + sign) | `intake` | SCENE 1-4: Intake questionnaire → Maestro packages → Envelope → Workspace | James = client; Caseworker = advisor | None needed — James is the applicant |
| Post-enrollment Workspace (shared client + agency view) | `workspaces` | SCENE 5: Shared Workspace for ongoing compliance | James = client; Caseworker/Eligibility Specialist = advisor | None needed |

**Decision**: Both flows correct. James Park is recertifying (client side). Cascade staff (Caseworker, Eligibility Specialist) are advisor-side. No swaps needed.

---

### 4. `slgov-benefits` — Cascade County (SNAP/CalFresh Intake)

**Tenant**: Cascade County Benefits  
**Customer**: Sylvia Moreno (applicant for SNAP benefits)

**Three flows** (intake + maintenance + case management):

| Flow | Usecase | Scenes | Audience | Persona fix |
|------|---------|--------|----------|------------|
| SNAP Application (self-service intake) | `intake` | SCENE 1-4: Intake form → Maestro assessment → Envelope → Workspace | Sylvia = client; Benefits Counselor = advisor | None needed |
| Recertification/Change of Circumstances | `maintenance` | SCENE 1-3: Portal auth → Updated form → Eligibility review | Sylvia = client; Specialist = advisor | None needed |
| Case Notes + Ongoing Support | `workspaces` | SCENE 5: Shared view for case management | Sylvia = client; Caseworker = advisor | None needed |

**Decision**: All three flows correct. Sylvia is applicant/beneficiary (client side). Agency staff are advisor-side case managers. No swaps.

---

### 5. `slgov-employee-onboarding` — Cascade County HR

**Tenant**: Cascade County HR  
**Customer**: (New hire — name TBD; currently unnamed in data)

**Three flows** (pre-hire, onboarding, ongoing):

| Flow | Usecase | Scenes | Audience | Persona fix |
|------|---------|--------|----------|------------|
| I-9 & Tax Withholding (intake) | `intake` | SCENE 1-4: Form → Maestro documents → Envelope → Workspace | New hire = client; HR Specialist = advisor | **PERSONA MISSING** — name new hire realistically |
| Identity Verification at Hire | `fraud-fabric` | SCENE 1-3: Auth at entry → I-9 verification → Chain-of-custody | New hire = client; HR = advisor | **PERSONA MISSING** — name new hire |
| Ongoing Workspace (benefits, direct deposit, tax updates) | `workspaces` | SCENE 5 | New hire = client; HR = advisor | None needed for workspace concept |

**Decision**: New hire is nameless; assign a diverse, realistic FIRST NAME + generic LAST NAME (e.g., "Aisha Thompson", "Marcus Chen"). Do not echo real Cascade County officials. Create entry in cast section.

---

### 6. `slgov-licensing` — Northbrook Licensing Bureau

**Tenant**: Northbrook Licensing Bureau  
**Customer**: Derek Johnson (license applicant)

**Three flows** (new license, renewal, compliance):

| Flow | Usecase | Scenes | Audience | Persona fix |
|------|---------|--------|----------|------------|
| License Application (new) | `intake` | SCENE 1-4: Intake form → Doc assembly → Envelope → Workspace | Derek = client; Permit Clerk = advisor | None needed — Derek is applicant |
| Renewal + Background Check | `maintenance` | SCENE 1-3: Portal auth → Update form → Compliance review | Derek = client; Licensing Specialist = advisor | None needed |
| Compliance Attestation Workspace | `workspaces` | SCENE 5 | Derek = client; Specialist = advisor | None needed |

**Decision**: All flows correct. Derek Johnson is consistent applicant. Northbrook staff correctly positioned as advisor-side reviewers. No swaps.

---

### 7. `slgov-vendor-compliance` — Ridgeview Procurement

**Tenant**: Ridgeview Procurement  
**Customer**: (Vendor contact — name TBD; currently unnamed)

**Three flows** (vendor onboarding, compliance attestation, renewal):

| Flow | Usecase | Scenes | Audience | Persona fix |
|------|---------|--------|----------|------------|
| Vendor Registration + W-9 (intake) | `intake` | SCENE 1-4: Intake form → Maestro package → Envelope → Workspace | Vendor rep = client; Vendor Onboarding Specialist = advisor | **PERSONA MISSING** — name vendor contact realistically |
| Compliance Attestation (annual) | `maintenance` | SCENE 1-3: Portal auth → Attestation form → Procurement review | Vendor rep = client; Specialist = advisor | **PERSONA MISSING** — name vendor contact |
| Relationship Workspace (performance tracking, invoicing) | `workspaces` | SCENE 5 | Vendor rep = client; Procurement Officer = advisor | None needed |

**Decision**: Vendor contact is nameless; assign a diverse, realistic name (e.g., "Rachel Huang" as a business owner or purchasing manager). Do not use real vendor names or Ridgeview officials. Create cast entry.

---

## Summary of personas to create

| Vertical | Missing Persona | Recommended | Role |
|----------|---|---|---|
| `slgov-employee-onboarding` | New hire | Aisha Thompson OR Marcus Chen OR Sofia Rodriguez | Employee (client side at intake, agency staff advisor side at review) |
| `slgov-vendor-compliance` | Vendor contact | Rachel Huang OR James Kowalski OR Diana Okonkwo | Vendor representative or business owner (client side) |

All other personas are either named and diverse (Springfield, Greenhaven, Cascade) or correctly positioned as staff (Permit Clerk, Specialist, etc.).

---

## Spine fit verification

### `slgov` (Springfield)

- **Intake (4-scene)**: Resident files permit → Agency packages → Resident signs → Workspace share. Correct.
- **Fraud-fabric (3-scene)**: Auth at entry → Modification form (resident) → Ops Desk (agency chain-of-custody). Correct.
- **Maintenance (3-scene)**: Auth → Pre-filled form (resident) → Review (agency confirms). Correct.

### `slgov-311` (Greenhaven)

- **Intake (3-scene)**: QR form → Auto-dispatch → Crew completion. Fits 3-scene "intake-mechanics" spine (no envelope ceremony). Correct.
- **Fraud-fabric (3-scene)**: Auth at entry → Follow-up form (citizen) → Ops Desk (agency visibility). Correct.
- **Maintenance (3-scene)**: Portal auth → Update form (citizen) → Confirmation (agency). Correct.

### Cascade (all three)

- **Recertification (intake)**: 4-scene intake spine. Correct.
- **Benefits (intake, maintenance, workspaces)**: 4-scene + 3-scene + 5-scene. Correct.
- **Employee-onboarding (intake, fraud-fabric, workspaces)**: 4-scene + 3-scene + 5-scene. Correct.

### Northbrook, Ridgeview

- **Licensing**: 4-scene + 3-scene + 5-scene. Correct.
- **Vendor compliance**: 4-scene + 3-scene + 5-scene. Correct.

---

## How to apply this

If approved:

1. **Fill missing personas** in `story-shell.html` — Aisha Thompson (new hire, Cascade HR) and Rachel Huang (vendor contact, Ridgeview).
2. **Verify role vocabulary** — spot-check that all agency-side personas use realistic civic-employee titles (Caseworker, Eligibility Specialist, Permit Clerk, Licensing Specialist, Vendor Onboarding Specialist, Service Officer, 311 Operator). Remove any real-official echoes.
3. **Verify no TGK creep** — confirm TGK Capital does NOT appear anywhere in slgov data. (Spot check: it doesn't.)
4. **Flip any audience framing** — if any Scene 1 intake is framed as "Agency opens form" instead of "Resident/Citizen opens form," rewrite as resident-led self-service.
5. **Re-run audit** — `_audits/_persona_audit_build.sh` to refresh side/role coherence checks.

**No changes to scene narration, beat flow, or usecase structure are needed.** The slgov family is structurally sound. Only missing persona names and potential audience-side framing tweaks.

---

## Downstream

- **Audit detector**: Extend role-coherence rule to require `side="advisor"` personas to hold titles from the gov-role vocabulary list (Caseworker, Specialist, Clerk, Operator, etc.). Warn on unrecognized advisor roles.
- **TGK watchlist**: Add pattern-match check to ensure TGK Capital only appears in `wealth:`, `provider:`, banking-deposits flows — not in any slgov, education, healthcare, or nonprofit vertical.
- **Naming audit**: Run a final pass on all persona names across all 21 verticals to confirm diversity and absence of real-official echoes.
