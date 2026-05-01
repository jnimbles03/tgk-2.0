# HLS vertical family · coherent persona rewrite

**Status**: Draft proposal for review · 2026-04-30
**Scope**: Four related HLS verticals — `provider`, `payor`, `lifesciences`, `provider-roi` — unified persona definitions + flow-by-flow rewrites.
**Issue resolved**: S1 persona roles were missing or misaligned across default/intake/fraud-fabric/maintenance flows. Audit detected inconsistencies in side (advisor vs. client) and missing persona naming on client-facing intake scenes. This rewrite establishes fictional personas with coherent front-office roles, locked across all flows per vertical.

---

## Tenant metadata

| Vertical | Tenant | Customer | Color | Preset |
|---|---|---|---|---|
| provider | Riverside Health | Jordan Kim (patient) | #6FD6C8 | provider |
| payor | Unity Health Plan | Marcus Chen (member) | #6FDA9B | payor |
| lifesciences | Helix | Austin Research Clinic (site) | #C7A0FF | lifesciences |
| provider-roi | Catalina Medical Center | Eric Tan (patient/records requestor) | TBD | provider-roi |

---

## Cast: Personas across all HLS verticals

### Provider (Riverside Health)

**Client-side personas**:
- **Jordan Kim** · Patient · Riverside Health · client side · New patient enrolling; completes pre-registration, identity verification, and consent signing. Appears in: `default/intake/fraud-fabric/maintenance` (S1 actor varies by flow).
- **Jordan Kim (extended family)** · Insurance holder / family member · client side · May appear in multi-party scenarios or dependent contexts (not yet in current flows, but reserved).

**Advisor-side personas**:
- **Daniela Okafor** · Registrar / Admissions Coordinator · Riverside Health · advisor side · Reviews patient intake from care team queue in Scene 4/5 (Workspace context). Pulls pre-visit summaries. First point of eligibility/consent verification.
- **Dr. Sarah Chen** · Primary Care Physician · Riverside Health · advisor side · Receives completed onboarding packet. Appears in S5 (Workspace) as care-team actor; sees the same patient state as Daniela.

**System actors**:
- Iris · AI agent
- CLEAR · Identity verification system
- Maestro · Orchestration (if visible in chain-of-custody or maintenance flows)

---

### Payor (Unity Health Plan)

**Client-side personas**:
- **Marcus Chen** · Member · Unity Health Plan · client side · Enrolls in marketplace, completes identity verification, and signs enrollment + HIPAA + payment authorization. Appears in: `default/intake/fraud-fabric/maintenance` (S1 actor = marketplace/member portal self-service).

**Advisor-side personas**:
- **Brenda Estevez** · Member Services Representative / Enrollment Counselor · Unity Health Plan · advisor side · Reviews enrollment in Workspace context (Scene 4/5). Answers cost-share questions. First escalation for member support post-enrollment.
- **Dr. Mitchell Torres** · Network Operations Manager / Medical Director · Unity Health Plan · advisor side · Appears in maintenance/PCP-change confirmation context. Verifies provider network capacity.

**System actors**:
- Iris · AI agent
- CLEAR · Identity verification system
- Maestro · Orchestration (if visible in chain-of-custody or intake flows)

---

### Life Sciences (Helix)

**Client-side personas**:
- **Dr. Karim Halim** · Principal Investigator (PI) · Austin Research Clinic (ARC) · client side · Site PI completing identity verification and signing site-activation packet (CTA, FDA 1572, financial disclosure, IB acknowledgment). Appears in: `default/intake/fraud-fabric/maintenance`.
- **Research Coordinator** (TBD name) · Site Coordinator · Austin Research Clinic · client side (implied, not yet named in current copy) · Handles day-to-day study logistics; appears in maintenance/protocol-deviation flows (future).

**Advisor-side personas**:
- **Ethan Park** · Clinical Study Manager · Helix · advisor side · Configures site activation from sponsor intake webform (Scene 1). Routes the signed packet. Appears in all flows as the Helix-side initiator.
- **Dr. Rebecca Okonkwo** · Helix Regulatory Affairs Lead / Study Sponsor Legal · Helix · advisor side · Countersigns the executed CTA; reviews sponsor compliance. Appears in S3 (Signing routing) and S4/5 (Workspace/regulatory oversight).

**System actors**:
- Iris · AI agent
- CLEAR · Identity verification system (medical license verification)
- Maestro · Orchestration (if visible in fraud-fabric or maintenance flows)

---

### Provider-ROI (Catalina Medical Center)

**Client-side personas**:
- **Eric Tan** · Patient / Records Requestor · Catalina Medical Center · client side · Initiates records-of-information request; completes identity verification and authorization. Appears in: `default/intake/fraud-fabric/maintenance`.

**Advisor-side personas**:
- **Renata López** · Health Information Manager / Records Coordinator · Catalina Medical Center · advisor side · Kicks off HIM intake on inbound ROI requests (Scene 1, sender webform — note: advisor-side sender because ROI workflows originate from HIM queue, not from patient self-service portal). Routes records release authorization.
- **Dr. James Kowalski** · Privacy Officer · Catalina Medical Center · advisor side · Reviews records-release scope and compliance (HIPAA, state law). *Note: Privacy Officer can be advisor-side here because ROI request origination is workflow-driven, not external policy enforcement.*

**System actors**:
- Iris · AI agent
- CLEAR · Identity verification system
- Maestro · Orchestration (if visible in chain-of-custody or intake flows)

---

## Per-flow rewrites

### provider/default

**Subtitle**: × Jordan Kim — New Patient Onboarding
**Category**: onboarding
**S1 Type**: SELF-SERVICE PORTAL (client-side sender)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Jordan completes new-patient pre-registration in Riverside's patient portal." | (unchanged) |
| **S1 lede** | `<p><span class="em">Jordan Kim</span> opens Riverside Health's patient portal on a phone the night before their first appointment and completes pre-registration — demographics, insurance card photo, reason for visit, history.</p><p>The submission lands in Riverside's intake queue. The workflow assembles the patient packet; Daniela Okafor reviews from Workspaces.</p>` | (unchanged — already names Jordan + Daniela) |
| **S1 persona** | (to be extracted as "Jordan Kim · Patient · client") | **Jordan Kim · Patient · Riverside Health · client** |
| **S4 persona** | (was missing named persona) | **Daniela Okafor · Registrar · Riverside Health · advisor** |
| **S5 personas** | (was missing) | **Jordan Kim · client**; **Dr. Sarah Chen · Primary Care Physician · Riverside Health · advisor** (new beat: "Care team receives the completed packet — Dr. Sarah Chen, PCP, sees the same onboarding state as Daniela.") |

**Notes**: S1 is self-service (patient opens portal); S1 persona is client-side. S4/5 bring Daniela (registrar) and Dr. Chen (PCP) as advisor-side reviewers. No compliance/legal on sender side — appropriate for clinical intake.

---

### provider/intake

**Subtitle**: × Jordan Kim — New-Patient Pre-Reg via Patient Portal
**Category**: onboarding
**S1 Type**: SELF-SERVICE PATIENT PORTAL (client-side sender)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Jordan completes new-patient pre-reg in Riverside's portal the night before the visit." | (unchanged) |
| **S1 persona** | (missing) | **Jordan Kim · Patient · Riverside Health · client** |
| **S2 persona** | (missing) | **Jordan Kim · client** (system actor: CLEAR, Aetna eligibility) |
| **S3 persona** | (missing) | **Jordan Kim · client** |
| **S4 persona** | (missing) | **Daniela Okafor · Registrar · Riverside Health · advisor** (implied, extracts the record) |

**Notes**: Intake spine mirrors default; S1 is client-initiated self-service. Daniela appears as the advisor-side reviewer in S4 (Data extraction context).

---

### provider/fraud-fabric

**Subtitle**: × Jordan Kim — Schedule II Refill (CLEAR-at-the-door)
**Category**: maintenance
**S1 Type**: AUTHENTICATED PORTAL ENTRY (client-side, CLEAR at login)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Jordan logs into Riverside's patient portal; Maestro orchestrates DEA-grade CLEAR at login." | (unchanged) |
| **S1 persona** | (missing) | **Jordan Kim · Patient · Riverside Health · client** (system: Maestro, CLEAR) |
| **S2 persona** | (missing) | **Jordan Kim · client** (system: Maestro, Iris) |
| **S3 persona** | (missing) | **Dr. Sarah Chen · Primary Care Physician · Riverside Health · advisor** (prescriber verifying refill authorization) |

**Notes**: Chain-of-custody flow. Jordan logs in (client), CLEAR establishes DEA-grade proof at session level. Dr. Chen (care team) confirms the refill authorization inline. No intermediary compliance role; clinical team signs off.

---

### provider/maintenance

**Subtitle**: × Jordan Kim — Account Maintenance · Update Insurance Card after Plan Change
**Category**: maintenance
**S1 Type**: AUTHENTICATED PORTAL ENTRY (client-side)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Jordan logs into Riverside's patient portal to update insurance after a plan switch." | (unchanged) |
| **S1 persona** | (missing) | **Jordan Kim · Patient · Riverside Health · client** (system: CLEAR) |
| **S2 persona** | (missing) | **Jordan Kim · client** (system: Iris, Aetna eligibility) |
| **S3 persona** | (missing) | **Daniela Okafor · Registrar · Riverside Health · advisor** (confirms insurance change) |

**Notes**: Maintenance loop. S1 is client-driven (patient portal). Daniela appears in S3 to confirm the new insurance card and coverage state.

---

### payor/default

**Subtitle**: × Marcus Chen — Silver HMO Enrollment
**Category**: onboarding
**S1 Type**: SELF-SERVICE MARKETPLACE (client-side sender)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Marcus enrolls in Unity's Silver HMO from the marketplace." | (unchanged) |
| **S1 lede** | `<p><span class="em">Marcus Chen</span> compares plans on Unity Health Plan's marketplace and selects the Silver HMO — household composition, household income, PCP preference.</p><p>The application lands in Unity's enrollment queue. The workflow assembles the enrollment packet; Brenda Estevez in Member Services reviews from Workspaces.</p>` | (unchanged — already names Marcus + Brenda) |
| **S1 persona** | (to be extracted as "Marcus Chen · Member · client") | **Marcus Chen · Member · Unity Health Plan · client** |
| **S4 persona** | (was missing named persona) | **Brenda Estevez · Member Services Representative · Unity Health Plan · advisor** |
| **S5 personas** | (was missing) | **Marcus Chen · client**; **Dr. Mitchell Torres · Network Operations Manager · Unity Health Plan · advisor** (new beat: "Network ops confirms the plan and sends welcome kit. Dr. Mitchell Torres validates the PCP assignment.") |

**Notes**: S1 is self-service marketplace (member selects plan); S1 persona is client-side. Brenda (Member Services) appears in S4/5 for enrollment review and cost-share Q&A. Dr. Torres handles network/PCP validation in S5.

---

### payor/intake

**Subtitle**: × Marcus Chen — Silver HMO Enrollment via Member Portal
**Category**: onboarding
**S1 Type**: SELF-SERVICE PORTAL (client-side sender)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Marcus completes his Silver HMO enrollment on Unity's member portal." | (unchanged) |
| **S1 persona** | (missing) | **Marcus Chen · Member · Unity Health Plan · client** |
| **S2 persona** | (missing) | **Marcus Chen · client** (system: CLEAR, SSA match) |
| **S3 persona** | (missing) | **Marcus Chen · client** |
| **S4 persona** | (missing) | **Brenda Estevez · Member Services Representative · Unity Health Plan · advisor** |

**Notes**: Intake spine for payor. S1 is self-service (member portal). Brenda reviews in S4 (Data context) for cost-share extraction.

---

### payor/fraud-fabric

**Subtitle**: × Marcus Chen — Prior Authorization for Specialty Drug (CLEAR-at-the-door)
**Category**: maintenance
**S1 Type**: AUTHENTICATED PORTAL ENTRY (client-side, CLEAR at login)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Marcus logs into Unity's member portal; Maestro orchestrates CLEAR at login." | (unchanged) |
| **S1 persona** | (missing) | **Marcus Chen · Member · Unity Health Plan · client** (system: Maestro, CLEAR) |
| **S2 persona** | (missing) | **Marcus Chen · client** (system: Maestro, Iris) |
| **S3 persona** | (missing) | **Dr. Mitchell Torres · Network Operations Manager · Unity Health Plan · advisor** (medical director approving prior auth) |

**Notes**: Chain-of-custody flow. Marcus logs in, CLEAR at door. Dr. Torres (medical director) reviews the specialty drug prior auth inline. No intermediary steps; clinical review embedded in the session.

---

### payor/maintenance

**Subtitle**: × Marcus Chen — Account Maintenance · PCP Change Request
**Category**: maintenance
**S1 Type**: AUTHENTICATED PORTAL ENTRY (client-side)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Marcus logs into Unity's member portal to change his primary care physician." | (unchanged) |
| **S1 persona** | (missing) | **Marcus Chen · Member · Unity Health Plan · client** (system: CLEAR) |
| **S2 persona** | (missing) | **Marcus Chen · client** (system: Iris) |
| **S3 persona** | (missing) | **Dr. Mitchell Torres · Network Operations Manager · Unity Health Plan · advisor** (network ops confirms PCP capacity) |

**Notes**: Maintenance loop. S1 is client-driven (member portal). Dr. Torres confirms the new PCP is accepting new patients and issues a new ID card.

---

### lifesciences/default

**Subtitle**: × Austin Research Clinic — Site Activation for HX-2104
**Category**: onboarding
**S1 Type**: SENDER WEBFORM (advisor-side sender — sponsor-initiated)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Ethan configures site activation for ARC from Helix's study webform." | (unchanged) |
| **S1 lede** | `<p>Ethan Park, Clinical Study Manager at Helix, opens the site-activation webform for <span class="em">Austin Research Clinic</span> on the HX-2104 trial — protocol version, indication, IRB, PI, budget tier.</p><p>The workflow fans out the activation packet from his selections: CTA, budget, FDA-1572, IRB approval, financial disclosure.</p>` | (unchanged — already names Ethan) |
| **S1 persona** | (to be extracted as "Ethan Park · Clinical Study Manager · Helix · advisor") | **Ethan Park · Clinical Study Manager · Helix · advisor** |
| **S2 persona** | (missing named persona in beats) | **Dr. Karim Halim · Principal Investigator · Austin Research Clinic · client** |
| **S3 personas** | (missing counterparty) | **Dr. Karim Halim · client** (signer); **Dr. Rebecca Okonkwo · Helix Regulatory Affairs Lead · Helix · advisor** (countersigner) |
| **S4 persona** | (missing) | **Ethan Park · Clinical Study Manager · Helix · advisor** (reviews the extracted CTA in agreement repository) |
| **S5 personas** | (missing) | **Dr. Karim Halim · client**; **Dr. Rebecca Okonkwo · Helix Regulatory Affairs Lead · Helix · advisor** (shared Workspace oversight) |

**Notes**: S1 is advisor-side sender (Ethan at Helix initiates). Dr. Halim (PI) is client-side signer. Dr. Okonkwo (Helix legal) countersigns and appears in S5 regulatory oversight. This is a true sponsor-to-site workflow; advisor (Helix) initiates.

---

### lifesciences/intake

**Subtitle**: × Austin Research Clinic — Site Activation Configuration
**Category**: onboarding
**S1 Type**: SENDER WEBFORM (advisor-side sender)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Ethan configures the site activation for ARC via Helix's internal site-config webform." | (unchanged) |
| **S1 persona** | (missing) | **Ethan Park · Clinical Study Manager · Helix · advisor** |
| **S2 persona** | (missing) | **Dr. Karim Halim · Principal Investigator · Austin Research Clinic · client** (system: CLEAR, medical license verification) |
| **S3 personas** | (missing) | **Dr. Karim Halim · client** (signer); **Dr. Rebecca Okonkwo · Helix Regulatory Affairs Lead · Helix · advisor** (countersigner) |
| **S4 persona** | (missing) | **Ethan Park · Clinical Study Manager · Helix · advisor** (data extraction context) |

**Notes**: Intake spine for life sciences. Ethan initiates, Dr. Halim signs, Dr. Okonkwo countersigns. All three appear consistently across flows.

---

### lifesciences/fraud-fabric

**Subtitle**: × Austin Research Clinic — Mid-Trial Serious Adverse Event Report (CLEAR-at-the-door)
**Category**: maintenance
**S1 Type**: AUTHENTICATED PORTAL ENTRY (advisor-side, CLEAR at login)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Ethan logs into Helix's study portal; Maestro orchestrates CLEAR at login." | (unchanged) |
| **S1 persona** | (missing) | **Ethan Park · Clinical Study Manager · Helix · advisor** (system: Maestro, CLEAR) |
| **S2 persona** | (missing) | **Ethan Park · advisor** (system: Maestro, Iris) |
| **S3 persona** | (missing) | **Dr. Rebecca Okonkwo · Helix Regulatory Affairs Lead · Helix · advisor** (regulatory review of SAE report) |

**Notes**: Chain-of-custody flow. Ethan (sponsor-side) logs in, CLEAR at door establishes regulatory-grade proof. Dr. Okonkwo reviews the SAE inline in the chain. No external site actor here; internal sponsor workflow.

---

### lifesciences/maintenance

**Subtitle**: × Austin Research Clinic — Account Maintenance · Sub-Investigator Addition Mid-Trial
**Category**: maintenance
**S1 Type**: AUTHENTICATED PORTAL ENTRY (advisor-side — site PI initiating from sponsor portal)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Dr. Halim logs into Helix's study portal to add a sub-investigator to the HX-2104 site." | (unchanged) |
| **S1 persona** | (missing) | **Dr. Karim Halim · Principal Investigator · Austin Research Clinic · client** (initiating a site change via the sponsor portal) |
| **S2 persona** | (missing) | **Dr. Karim Halim · client** (system: CLEAR, medical license verification for the new sub-investigator) |
| **S3 persona** | (missing) | **Dr. Rebecca Okonkwo · Helix Regulatory Affairs Lead · Helix · advisor** (approves sub-investigator qualification) |

**Notes**: Maintenance loop. Dr. Halim logs in to request a sub-investigator addition; Dr. Okonkwo approves. Ethan (Clinical Study Manager) is not the actor here — the site is driving the change, Helix regulatory approves. Note: Dr. Halim is "client-side" in this flow even though he is accessing a sponsor portal, because he is the site PI requesting a change, not the sponsor initiating.

---

### provider-roi/default

**Subtitle**: × Eric Tan — Records of Information Request Intake
**Category**: onboarding
**S1 Type**: SENDER WEBFORM (advisor-side sender — HIM-initiated)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Renata kicks off the HIM intake for an inbound records-release request." | **Renata López kicks off HIM intake for an inbound records-release request.** |
| **S1 lede** | (was missing named persona) | `<p>Renata López, Health Information Manager at Catalina Medical Center, receives an inbound records-of-information request and opens the HIM intake webform — requestor type, patient ID, date range, scope of release, destination (provider / patient / third party).</p><p>The workflow assembles the authorization packet; Eric Tan reviews the scope before signature.</p>` |
| **S1 persona** | (missing) | **Renata López · Health Information Manager · Catalina Medical Center · advisor** |
| **S2 persona** | (missing) | **Eric Tan · Patient / Records Requestor · client** (system: CLEAR) |
| **S3 personas** | (missing) | **Eric Tan · client** (signer); **Dr. James Kowalski · Privacy Officer · Catalina Medical Center · advisor** (final compliance review) |
| **S4 persona** | (missing) | **Renata López · Health Information Manager · Catalina Medical Center · advisor** (extracts the release authorization for records fulfillment) |
| **S5 personas** | (missing) | **Eric Tan · client**; **Dr. James Kowalski · Privacy Officer · Catalina Medical Center · advisor** (shared Workspace oversight of the release scope) |

**Notes**: Provider-ROI is unique: S1 is advisor-side because the request originates from HIM queue (inbound workflow), not from patient self-service. Renata (HIM) kicks off. Eric Tan (patient/requestor) is client-side signer. Dr. Kowalski (Privacy Officer) can be advisor-side here because the role is workflow-originating, not external policy enforcement. This differs from compliance/legal roles in other verticals.

---

### provider-roi/intake

**Subtitle**: × Eric Tan — HIM Intake from Inbound ROI Request
**Category**: onboarding
**S1 Type**: SENDER WEBFORM (advisor-side sender)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Renata kicks off the HIM intake for an inbound records-release request." | (unchanged) |
| **S1 persona** | (missing) | **Renata López · Health Information Manager · Catalina Medical Center · advisor** |
| **S2 persona** | (missing) | **Eric Tan · Patient / Records Requestor · client** (system: CLEAR) |
| **S3 personas** | (missing) | **Eric Tan · client** (signer); **Dr. James Kowalski · Privacy Officer · Catalina Medical Center · advisor** (compliance check) |
| **S4 persona** | (missing) | **Renata López · Health Information Manager · Catalina Medical Center · advisor** |

**Notes**: Intake spine mirrors default. Renata initiates, Eric signs, Dr. Kowalski reviews compliance.

---

### provider-roi/fraud-fabric

**Subtitle**: × Eric Tan — Revoke or Modify Records Release Scope (CLEAR-at-the-door)
**Category**: maintenance
**S1 Type**: AUTHENTICATED PORTAL ENTRY (client-side, CLEAR at login)

| Scene | Was | Now |
|---|---|---|
| **S1 head** | "Eric logs into Catalina's patient portal; Maestro orchestrates CLEAR at login." | (unchanged) |
| **S1 persona** | (missing) | **Eric Tan · Patient / Records Requestor · client** (system: Maestro, CLEAR) |
| **S2 persona** | (missing) | **Eric Tan · client** (system: Maestro, Iris) |
| **S3 persona** | (missing) | **Dr. James Kowalski · Privacy Officer · Catalina Medical Center · advisor** (HIPAA compliance review for the scope change) |

**Notes**: Chain-of-custody flow. Eric logs in to revoke/modify his records release. CLEAR at door. Dr. Kowalski reviews the scope change inline for HIPAA compliance.

---

## What this changes downstream

- **Persona audit**: All HLS verticals now have named personas locked across all flows (default, intake, fraud-fabric, maintenance). No more missing persona definitions on S1 or S4/5.
- **Front-office role coherence**: Provider (registrars, PCPs), Payor (Member Services, Network Ops), Life Sciences (Clinical Study Managers, Regulatory Affairs), Provider-ROI (HIM, Privacy Officer) all use domain-appropriate roles. No generic "Compliance" on sender side except where workflow-originating (Privacy Officer in ROI context).
- **Client vs. advisor side clarity**:
  - **Provider/Payor**: S1 is **client-side self-service** (patient/member portal). Advisor-side staff (Registrar, Member Services) appear in S4/5 review context.
  - **Life Sciences**: S1 is **advisor-side** (sponsor-initiated webform). Site PI is client-side signer.
  - **Provider-ROI**: S1 is **advisor-side** (HIM-initiated). Patient is client-side signer/requestor.
- **Hotspot copy**: Scene narration now references named personas consistently. Sidebar tips for webforms (S1) now tie to the named advisor-side actor (e.g., "Ethan configures the site activation...").
- **Splashes**: No splash override needed for HLS verticals; none reference generic roles.

---

## How to apply this

If you approve the rewrite, I'll:

1. **Edit `stories/_shared/story-shell.html`** — replace the `provider:`, `payor:`, `lifesciences:` scene heads, ledes, beat heads, beat ledes, and persona definitions with the "Now" columns above. Check for `provider-roi` JSON-only structure; if inline, add it. One commit.
2. **Re-run `_audits/_persona_audit_build.sh`** so the audit refreshes with the new data. All four verticals should re-classify; rows with missing S1 personas should now pass.
3. **Verify across use cases**: Spot-check intake/fraud-fabric/maintenance flows to confirm the persona references carry through the extended narrations (usecase-narrations-2026-04-27.json). If any beat-level persona is missing, flag it for a follow-up pass.

If anything in the "Now" column reads off — voice, role naming, flow logic — flag it inline and I'll revise before applying.

---

## Naming integrity check

All fictional names are HLS-appropriate and do not echo real-world figures:

| Name | Vertical | Role | Rationale |
|---|---|---|---|
| Jordan Kim | Provider | Patient | Common first name, neutral surname; no echo of real clinician. |
| Daniela Okafor | Provider | Registrar | West African surname; distinct from any named physician. |
| Dr. Sarah Chen | Provider | PCP | Common surname; no echo of specific real provider. |
| Marcus Chen | Payor | Member | Distinct from provider/insurance leadership figures. |
| Brenda Estevez | Payor | Member Services | Hispanic surname; appropriate for US insurance context. |
| Dr. Mitchell Torres | Payor | Network Ops | Distinct from member names; no echo of real payer leadership. |
| Dr. Karim Halim | Life Sciences | PI | Middle Eastern given name + surname; appropriate for clinical research context. |
| Ethan Park | Life Sciences | Clinical Study Manager | Asian surname; distinct from PI naming pattern. |
| Dr. Rebecca Okonkwo | Life Sciences | Regulatory Affairs | West African / African diaspora surname; distinct naming from site/sponsor split. |
| Eric Tan | Provider-ROI | Patient/Requestor | Asian surname; distinct from provider staff naming. |
| Renata López | Provider-ROI | HIM Manager | Hispanic surname; common in US healthcare HIM roles. |
| Dr. James Kowalski | Provider-ROI | Privacy Officer | Eastern European surname; appropriate for compliance/legal role. |

All names pass FICTIONAL + domain-appropriate test.
