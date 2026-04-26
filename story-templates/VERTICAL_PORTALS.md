# TGK 2.0 — Core Portal per Vertical & Headless Docusign Use Cases

> **Architecture note (2026-04-26).** The per-vertical demo experience
> ships through one shared shell at `/stories/_shared/story-shell.html`,
> driven by `?vertical=<key>`. The 5-scene mechanics are described under
> "How the portals fit into TGK story structure" below. The vertical
> capability palettes in the body of this doc are still the **spec** —
> they describe what each vertical *should* do; the shell is the
> *delivery vehicle*.

Each vertical has one canonical SoR portal that TGK treats as the **host
environment** for a built-out, rich story. Inside that portal, Docusign
shows up **headless** — embedded via API/SDK so the host's users never
leave the native UI.

The capability palette:

- **Web Forms** — embedded data collection
- **Workspaces** — multi-party document collab initiated from the host
- **IDV / Authentication** — step-up identity verification (includes CLEAR)
- **eSignature** — embedded signing session
- **Click-to-Agree** — lightweight one-click attestation
- **Navigator** — agreement search, AI-extracted fields, retrieval
- **AI Assisted Review** — Iris analyzing docs/clauses/forms
- **Agreement Desk** — embedded post-signing record-of-truth surface
- **Document Generation** — Doc Gen from host data on demand
- **SMS Delivery** — delivery via text instead of (or alongside) email

Capabilities compose. The most differentiated stories chain three or four
together. The use cases below are written "inside [Portal], X happens, with
Docusign handling Y." No Docusign UI surfaces to the user.

---

## Banking & Credit Unions — host: **nCino Commercial / Consumer Banking Cloud**

Why nCino: dominant originations + onboarding platform; built on Salesforce
so embedding is native; covers deposits + commercial lending + retail.

Signature moment: **"New commercial deposit account opened, live, no paper."**

1. **Deposit account opening.** In nCino, banker starts an account. *Web
   Forms* embedded as the intake on the business-entity details. *CLEAR IDV*
   for the signer. *Click-to-Agree* on the sub-T&Cs of the deposit product.
   *eSignature* on the signature card. *Navigator* auto-writes the signed
   packet back to the customer's entity record.
2. **Loan origination → closing.** *Doc Gen* assembles the loan packet from
   nCino data (note, guaranty, security agreement). *eSignature* in a
   single envelope. *AI Assisted Review* checks the packet against the
   bank's credit policy before the booker approves. *Navigator* tracks the
   post-close covenant calendar.
3. **KYC refresh cycle.** nCino flags accounts due. *SMS Delivery* of a
   short Web Forms link. *IDV step-up* if any material data changed.
   *Navigator* writes the refreshed record and clears the flag.
4. **Commercial loan modification.** *Doc Gen* the amendment. *Workspaces*
   for the multi-party review (borrower + guarantor + relationship manager +
   credit officer + counsel). *eSignature* closes it out.
5. **Treasury services onboarding.** *Workspaces* for the multi-doc package
   (Master Services Agreement, schedules, wire agreements). *Agreement Desk*
   embedded in nCino as the single status surface.
6. **Wire authorization.** *Click-to-Agree* for small wires; *IDV step-up
   via SMS* for wires over the threshold. Decision captured as an audit
   event on the customer record.
7. **Dispute intake.** *Web Forms* embedded in digital banking inside
   nCino. *AI Assisted Review* scans for fraud signals, routes low-risk
   directly to operations.
8. **Vendor / fintech partner agreements.** *Agreement Desk* embedded as a
   tab in the partner record. *eSignature* + *Navigator* for ongoing
   visibility into change-of-control / assignment clauses.

---

## Wealth Management — host: **Salesforce Financial Services Cloud (FSC)**

Why FSC: de facto CRM SoR for advisors, native composition with Docusign
via Salesforce integration, already referenced in the wealth-onboarding
story.

Signature moment: **"Advisor opens a new $5M household, fully paperless,
under 15 minutes from first touch."**

1. **New household account opening.** *Web Forms* for client data. *CLEAR*
   for principal and joint signer. *Doc Gen* custodial agreements (Schwab /
   Fidelity / Pershing) from FSC data. *eSignature* in a single envelope.
   *Navigator* writes the signed agreements back to the household record.
2. **Account maintenance — material change.** Address, beneficiary, wire
   instructions, power-of-attorney. *Web Forms* pre-filled from FSC. *IDV
   step-up* (CLEAR for high-material like POA). *eSignature* + *Navigator*.
3. **Account maintenance — low-touch.** Auto-deposit changes, e-statement
   opt-in. *Click-to-Agree* inside the FSC client portal.
4. **Investment Policy Statement refresh.** *Doc Gen* the IPS from CRM
   risk-profile data. *AI Assisted Review* flags language drift from the
   firm's template. *eSignature* + *Navigator*.
5. **Quarterly client letters.** *Doc Gen* personalized market commentary.
   *SMS Delivery* with a short link; *Click-to-Agree* captures the "read &
   acknowledged" receipt.
6. **Beneficiary update with spousal consent.** *Web Forms* client-facing.
   Separate *eSignature* envelope to the spouse. *Navigator* stores the
   paired record.
7. **Compliance attestation cycle.** *Navigator* searches for stale
   attestations. *AI Assisted Review* generates the list of outstanding
   reps. *Click-to-Agree* at scale for renewals.
8. **RIA back-office ops.** *Workspaces* for advisor onboarding, succession
   agreements, vendor contracts. *Agreement Desk* embedded in the FSC
   admin console.

### Wealth — phase-2 onboarding (multi-tenant) — `stories/wealth-onboarding-v2/`

A companion wealth story designed for tenant-swap: the same four vignettes
render against **Redtail CRM** (independent advisor), **Fidelity Wealthscape**
(institutional custodian), or **Schwab Advisor Center** with no HTML changes.
Tenant is selected via a `?tenant=redtail|wealthscape|schwab` URL param on
the portal or any scene; the param propagates to iframe drill-downs so
sibling scenes stay in the same tenant. Default is Redtail.

Four vignettes (use any as a signature depending on the prospect):

1. **Material change at the kitchen table** — `material-change-address.html`
   — address update with CLEAR step-up IDV + Click-to-Agree + paired eSig +
   Navigator write-back across CRM, Orion, and the custodian. 6-minute cycle.
2. **New account, end-to-end** — `new-account-end-to-end.html` — one
   envelope chain executes Web Forms → CLEAR → Doc Gen (14 docs) → eSig →
   Navigator in a single advisor session. "Send" triggers the whole thing.
3. **Investor self-service from the phone** — `investor-mobile-selfservice.html`
   — 320px phone mockup. Investor completes an ACH routing change in 4 taps,
   94 seconds, zero advisor involvement. Device-bound CLEAR + attestation +
   eSig + Navigator write-back.
4. **Modular IAM showcase** — `modular-iam-showcase.html` — one household
   with 8 Docusign capabilities active in parallel (Web Forms, CLEAR, C2A,
   Doc Gen, eSig, Maestro, Workspaces, Navigator). The "Why modular &gt;
   monolithic" argument, visualized.

The legacy `stories/wealth-onboarding/` prototype is kept untouched as
heritage (see REGISTRY.md → chrome alignment notes). The phase-2 pattern
supersedes it and can be shown side-by-side for the comparison.

---

## Insurance P&C — host: **Guidewire PolicyCenter + ClaimCenter**

Why Guidewire: dominant P&C SoR; underwriters and adjusters live here
all day.

Signature moment: **"FNOL to payment in 3 days, every artifact in one
audit trail."**

1. **Quote → bind.** *Doc Gen* the policy + declarations from PolicyCenter
   data. *Click-to-Agree* on fraud acknowledgments. *eSignature* on the
   application. *Navigator* books the bound policy to the account record.
2. **FNOL intake.** *Web Forms* embedded in the insured portal (statement +
   photo upload). *AI Assisted Review* auto-tags severity and subro
   potential. ClaimCenter opens a claim with the artifacts pre-attached.
3. **Insured statement & attestation.** *Web Forms* + *eSignature* on the
   sworn statement. Piped into the claim file.
4. **Subrogation demand.** *Doc Gen* demand letter from the claim +
   recovery data. *SMS Delivery* or certified-email with tracking.
   *Navigator* tracks responses, flags non-responders.
5. **Vendor collaboration.** Body shop / contractor / IA estimate
   collection. *Workspaces* is the shared room; estimates drop in, get
   reconciled, get signed off with *eSignature*.
6. **Renewal cycle.** *Click-to-Agree* for low-exposure personal lines
   renewals. *Doc Gen* renewal packages; *eSignature* where a signature
   is required.
7. **Endorsement / policy change.** *Doc Gen* endorsement + short *Web
   Form* for the change data. *eSignature* + *Navigator*.
8. **Loss-run issuance.** *Web Forms* for broker requests. *Doc Gen* from
   ClaimCenter data. *SMS / email delivery* with a signed receipt.

---

## Insurance Life & Annuities — host: **FINEOS AdminSuite** (claims + absence) / **Majesco L&A** (policy admin)

Why FINEOS: dominant L&A / group-benefits claims platform; adjudicators
and benefit specialists live here.

Signature moment: **"Beneficiary submits a death claim, payment arrives
in 5 days, no phone calls."**

1. **Death claim intake.** *Web Forms* empathetic intake surfaced on the
   carrier's public site; writes directly into FINEOS. *AI Assisted Review*
   of death certificate for authenticity signals.
2. **Beneficiary verification.** *CLEAR IDV* ties the filer to the person
   of record. Bypasses a call-center verification step.
3. **Claim packet.** *Doc Gen* the proof-of-loss + payment election from
   FINEOS. *eSignature* by the beneficiary.
4. **Settlement disbursement.** *Click-to-Agree* on payment method
   selection. *SMS Delivery* of payment confirmation.
5. **Absence / disability claim (STD/LTD).** *Web Forms* for the claimant.
   *SMS* update cadence. *Workspaces* for the treating-physician / employer
   / claims examiner three-way.
6. **Underwriting requirement fulfillment.** *Web Forms* for short
   attending-physician statements. *AI Assisted Review* pre-screens for
   missing fields before a human underwriter opens it.
7. **Beneficiary change (in-force policy).** *Web Forms* pre-filled from
   policy admin. Separate *eSignature* envelope for spousal consent.
8. **Policy application (new business).** *Doc Gen* illustration. *Web
   Forms* for med history. *CLEAR* step-up for high-face-amount apps.
   *eSignature* on the application.

---

## Payor (Health Plans) — host: **HealthEdge HealthRules Payer** (modern) or **TriZetto Facets** (legacy)

Why HealthEdge: demo-friendly UI. Facets if the target is a big-3
carrier. Same headless moments apply to either.

Signature moment: **"Provider contract signed, loaded to Facets, and
first claim priced against it — same day."**

1. **Provider contracting.** *Doc Gen* the contract from rate tables in
   the payor system. *eSignature* + *Navigator* tracks the effective-date
   calendar.
2. **Prior authorization.** *Web Forms* submitted by the provider. *AI
   Assisted Review* scores medical-necessity language against clinical
   guidelines. *Doc Gen* approval or denial letter. *SMS Delivery* to the
   provider and member.
3. **Member enrollment.** *Web Forms* on the payor portal. *Click-to-Agree*
   on plan disclosures. *SMS Delivery* of the ID card with a secure link.
4. **Appeals & grievances.** *Web Forms* intake. *AI Assisted Review*
   against coverage policy. *Doc Gen* determination letter. *eSignature*
   where an attestation is required.
5. **Care plan attestation.** *Click-to-Agree* on the care plan each time
   it updates. Reduces calls to case managers.
6. **Network credentialing.** *Workspaces* for the multi-doc credentialing
   packet. *Agreement Desk* embedded as the provider-facing record.
7. **EOB delivery.** *SMS* short link + *Navigator* as the stored record
   for member self-service.
8. **HEDIS / STARS compliance outreach.** *Doc Gen* personalized letters
   explaining gaps. *SMS* with *Click-to-Agree* appointment scheduling.

---

## HLS Provider — host: **Epic Hyperspace** (clinician) + **MyChart** (patient)

Why Epic: #1 EHR by bed count. MyChart is the dominant patient portal.
Most of the patient-side capability embeds live in MyChart; clinician
side embeds live in Hyperspace.

Signature moment: **"Records request from a disability carrier is
honored, billed, and posted back to the chart — without leaving Epic."**

1. **Release of Information (ROI).** *Web Forms* from the requester
   (carrier, attorney, another provider). *CLEAR IDV* for the patient
   authorization. *Doc Gen* the compiled packet from the chart. *Navigator*
   archives the authorization + release event on the patient record.
2. **Patient pre-surgical consent.** *Click-to-Agree* embedded in MyChart
   on the informed-consent text; *eSignature* for procedure-specific
   consent. *Navigator* stores the signed consent alongside the encounter.
3. **Physician cosign queue.** *eSignature* directly in the Hyperspace In
   Basket. *AI Assisted Review* summarizes the co-signed note for the
   attending.
4. **HIPAA authorization for third parties.** *Web Forms* + *CLEAR* +
   *eSignature*. Stored to chart via *Navigator*.
5. **Financial counseling / estimates.** *Doc Gen* Good Faith Estimate
   from billing data. *eSignature* by the patient. *AI Assisted Review*
   flags variance against historical same-DRG claims.
6. **Clinical trial enrollment.** *Web Forms* for consent content. *CLEAR*
   if the trial is interventional. *eSignature* + *Navigator* stores the
   ICF in both the chart and the sponsor's Veeva Vault.
7. **Disability / return-to-work letters.** *Web Forms* from an employer
   or carrier. *eSignature* by the physician inside the In Basket. *SMS*
   delivery to the employer.
8. **Discharge summary acknowledgment.** *AI Assisted Review* summarizes
   the discharge doc into plain language. *Doc Gen* the patient-friendly
   version. *SMS Delivery* + *Click-to-Agree* acknowledgment.

---

## Life Sciences — host: **Veeva Vault** (eTMF / PromoMats / RIM / QualityDocs — pick per story)

Why Veeva: near-monopoly SoR in life sciences regulated content.

Signature moment: **"A clinical site signs on, informed consent is
captured, and the first patient is randomized — audit chain intact."**

1. **Clinical site agreement.** *Doc Gen* the site agreement from CTMS
   data. *Workspaces* for the multi-party review (sponsor, CRO, site PI,
   legal). *eSignature* closes it. *Navigator* writes back to Vault eTMF.
2. **Informed consent (patient).** *Web Forms* patient-facing via MyVeeva.
   *CLEAR* optional depending on trial protocol. *eSignature* + Vault CDMS
   + Navigator audit thread.
3. **1572 Form.** *Doc Gen* from RIM + eTMF data. *eSignature* by the
   investigator. Auto-filed to eTMF.
4. **PromoMats MLR approval.** *Workspaces* for the medical-legal-
   regulatory review rounds. *AI Assisted Review* checks copy against the
   label. *Click-to-Agree* attestation from each reviewer.
5. **CRO / supplier agreements.** *Agreement Desk* embedded in the Vault
   contracts library. *eSignature* + change-of-control / assignment
   tracking via *Navigator*.
6. **Quality deviation / CAPA.** *Web Forms* for the deviation report.
   *Doc Gen* CAPA plan. *eSignature* by quality lead.
7. **Adverse event reporting.** *Web Forms* (HCP or patient). *AI
   Assisted Review* urgency classification. Flagged cases escalate to
   safety team.
8. **Regulatory submission cover letter.** *Doc Gen* cover + *eSignature*
   by the RA lead. Auto-filed to RIM.

---

## Federal Government — host: **ServiceNow for Government** (ITSM/GRC) + **Appian** (case mgmt) + **Salesforce Public Sector Solutions** (constituent)

Most federal agencies have two or more. Pick one per story.

Signature moment: **"Citizen files for a benefit, identity is proofed to
NIST IAL2, determination letter is signed and delivered — same session."**

1. **Benefits eligibility application.** *Web Forms* embedded on the
   agency portal. *CLEAR IDV* to NIST IAL2. *AI Assisted Review* pre-
   screens eligibility. *Doc Gen* determination letter. *eSignature* by
   adjudicator. *SMS Delivery* of decision.
2. **FOIA request.** *Web Forms* intake. *AI Assisted Review* flags
   exempt material for redaction. *Doc Gen* response package. *Click-to-
   Agree* on the public release receipt.
3. **Federal employee onboarding.** *Web Forms* for I-9, W-4, direct
   deposit, EDL. *CLEAR IAL2* for security clearance. *eSignature* packet.
   *Workspaces* for benefits + insurance + retirement.
4. **Contract modification (GovCon).** *Doc Gen* the mod from the contract
   writing system. *eSignature* + *Navigator* for the CLIN-level delta.
5. **Grant application.** *Workspaces* for multi-signatory PI + IRB +
   finance. *eSignature* + *Agreement Desk* for reporting milestones.
6. **Security clearance reinvestigation.** *Web Forms* pre-filled from
   existing record. *CLEAR step-up*. *eSignature* on SF-86.
7. **Procurement (vendor contracts).** *Agreement Desk* embedded in the
   GWAC / BPA record. *eSignature* + *Navigator* for assignment and
   option-year tracking.
8. **Policy acknowledgment distribution.** *Click-to-Agree* across
   employee DL. *Navigator* for the attestation roster.

---

## State & Local Government — host: **Accela Civic Platform** (permits/licensing) + **Salesforce Public Sector Cloud** (case/benefits) + **Tyler Munis** (finance/HR)

Pick per workflow. Accela for anything permit-adjacent; Salesforce for
case management and constituent service; Tyler for ERP-adjacent.

Signature moment: **"A contractor pulls a building permit, pays the
fee, and signs the permit — in one sitting from their truck."**

1. **Building permit.** *Web Forms* application + *Doc Gen* permit
   package. *eSignature* by applicant. *Agreement Desk* or *Navigator* for
   the permit record. *SMS* when inspection is ready.
2. **Business license renewal.** *Click-to-Agree* on attestations. *Doc
   Gen* renewed certificate. *SMS Delivery* of the digital license.
3. **Foster care placement.** *Workspaces* for agency + family + state
   three-way. *eSignature* on placement agreement.
4. **SNAP / Medicaid recertification.** *Web Forms* pre-filled from
   historical data. *AI Assisted Review* flags discrepancies for a human.
   *Doc Gen* determination. *eSignature* + *SMS*.
5. **Court filing (civil).** *Web Forms* for pro se filers. *eSignature* +
   *Navigator* to the court case management system.
6. **311 / constituent service.** *Web Forms* intake. *SMS* status
   updates. *Click-to-Agree* on resolution acknowledgment.
7. **Voter registration.** *Web Forms* + *CLEAR IDV*. Written back to the
   state SoR.
8. **Property tax appeal.** *Web Forms* evidence upload. *Doc Gen*
   notice. *eSignature* + *Navigator*.

---

## Education — host: **Workday Student** (higher ed) + **PowerSchool SIS** (K-12) + **Canvas** (LMS, cross-cutting)

Higher ed: Workday Student is the modern SoR (Banner for legacy accounts).
K-12: PowerSchool is dominant. Canvas is the LMS overlay for both.

Signature moment: **"Admitted student deposits, signs their housing
contract, and enrolls in orientation — all from their phone."**

1. **Admissions application.** *Web Forms* on the applicant portal.
   *eSignature* on the application + parental signature (minors) in a
   paired envelope. *Navigator* feeds Slate / Workday.
2. **FAFSA support + award acceptance.** *Web Forms* (if any). *IDV* for
   parent-signer. *eSignature* on the award letter. *SMS* status.
3. **Enrollment packet.** *Click-to-Agree* on the student code of
   conduct, tech-use policy, health insurance waiver. *Navigator* for the
   acceptance record.
4. **Transcript / records request.** *Web Forms* from the requester.
   *eSignature* for the student consent. *Doc Gen* sealed transcript.
   *SMS Delivery* + secure link.
5. **Faculty / staff hiring.** *Web Forms* (I-9, W-4, benefits). *CLEAR
   IDV*. *eSignature* offer letter. *Workspaces* for the benefits
   orientation packet.
6. **Research agreements (IRB / grants).** *Workspaces* multi-party PI +
   co-I + IRB + sponsor. *eSignature* + *Agreement Desk*.
7. **Study abroad enrollment.** *Web Forms* + *eSignature* + paired
   parental consent envelope.
8. **Housing / roommate agreement.** *Web Forms* preferences. *Click-to-
   Agree* housing contract. *eSignature* on lease addenda.
9. **Tuition / scholarship changes.** *Web Forms* + *Doc Gen* revised
   award + *eSignature*.
10. **Disability accommodation.** *Web Forms* intake. *AI Assisted
    Review* matches the request to approved accommodation packages.
    *eSignature* by the disability services office + faculty.

---

## Procurement / CLM (cross-vertical) — host: **IBM Emptoris Contract Management**

Why Emptoris: still one of the most-deployed legacy CLMs across pharma,
manufacturing, energy, and large federal contractors. The Workbench →
Contract record flow is instantly recognizable to anyone in procurement
or legal ops, and Emptoris's weak native authoring + signing make it a
high-leverage host for headless Docusign embeds (Doc Gen + eSign +
Navigator + Agreement Desk modernize the suite without ripping it out).

Other CLM SoRs (Icertis, Ariba Contracts, SirionLabs) reuse the same
portal — palette swap only.

Built portal: `portals/enterprise-emptoris.html` — Contract Workbench
(My Tasks · 17 open · Recent Contracts · Watched · Approvals · Renewals)
cross-fades on a 20s loop with a Contract record detail (Acme Logistics
MSA · CT-2026-04812 · stage pill mid-Negotiate, AI-flagged liability
deviation, redlines from counterparty).

Signature moment: **"Counterparty contract goes from authored to
executed and indexed — without leaving Emptoris and without a Word
attachment ever leaving email."**

1. **Generate from template (Doc Gen).** Procurement clicks
   *"Generate contract"* on the Workbench. *Doc Gen* assembles MSA from
   Emptoris rate cards + counterparty record. The drafted contract lands
   on the record with all fields pre-populated.
2. **Counterparty intake (Web Forms).** Schedule A details — pricing
   tiers, contact roster, supplier-bank info — collected via embedded
   *Web Forms* sent to the counterparty. Submission writes back to
   Emptoris fields, no rekeying.
3. **Negotiation (Workspaces).** Internal stakeholders + counterparty
   share a *Workspace* that lives inside the Emptoris record. Redlines,
   comments, and version history stay in the negotiation room rather
   than scattered across email.
4. **AI Assisted Review (Agents / Iris).** *AI Review* extracts
   playbook deviations as the counterparty's redlines arrive — flags
   liability-cap inflation, SLA credit additions, governing-law swaps.
   Counsel sees "2 deviations from playbook" before opening the diff.
5. **Send for signature (eSignature).** *eSignature* ceremony fires
   from the record with one click. Signed envelope writes back as the
   contract document of record; Emptoris stage pill flips to *Active*.
6. **Repository search (Navigator).** *Navigator* tab inside the record
   exposes an AI-extracted clause repository across the Emptoris book —
   "show me every MSA with a 3× liability cap signed in the last 18
   months." Outputs a ranked list with citations.
7. **Post-execution (Agreement Desk).** *Agreement Desk* embedded as a
   record-level tab becomes the single status surface — renewal
   countdown, obligation tracker, payment milestones — without
   replacing Emptoris as the SoR.

**Drill-down slot map** (named CSS classes in
`portals/enterprise-emptoris.html`):

- `.embed-slot-doc-gen` — primary Workbench CTA → Doc Gen template
  *(stub; build when template lands)*
- `.embed-slot-counterparty-intake` — secondary Workbench CTA + record
  side-rail action → `docusign-webform.html`
- `.embed-slot-workspaces-review` — inline banner inside record's
  Clauses card → Workspaces template *(stub)*
- `.embed-slot-ai-review` — inspector pill (Workbench) + side-rail
  action (record) → `docusign-agents.html` (AI Assisted Review variant)
- `.embed-slot-esign-execute` — primary "Send for signature" record
  action → `docusign-webform.html` (signing variant)
- `.embed-slot-navigator-search` — record tab → `docusign-navigator.html`
- `.embed-slot-agreement-desk` — record tab → Agreement Desk template
  *(stub)*

---

## How the portals fit into TGK story structure

Every vertical demo runs through the same **5-scene shell** at
`/stories/_shared/story-shell.html`. The vendor portal context lives
inside the shell's iframe templates — not as its own scene, and not as a
separate per-portal HTML.

| Scene | Role | Iframe template loaded | Hotspot key |
|---|---|---|---|
| 1 | Sender · Agreement Desk | `docusign-agreement-desk.html?preset=<v>` | `agreement_desk` |
| 2 | Identity · CLEAR | `docusign-clear-idv.html?preset=<v>` | `clear_idv` |
| 3 | Signing | `docusign-signing-ceremony.html?preset=<v>` | `signing` |
| 4 | Data · Navigator | `docusign-navigator.html?preset=<v>` | `navigator` |
| 5 | Workspace | `docusign-workspace.html?preset=<v>[&splash=1]` | `workspace` |

**Hotspot coordinates are shared across all 10 verticals** because they
target Docusign template UI, which doesn't shift per preset. Only the
per-vertical narration (sidebar copy + per-beat headlines × 5 beats per
scene) varies.

The conceptual Sender → Signer → Headless → MasterCard heuristic from the
older 4-scene spine still maps usefully: Scenes 1-2 are sender + signer
in flight; Scenes 3-4 are signing + the headless data-landing moment;
Scene 5 is the Workspaces homage. Append `?splash=1` to any vertical to
bolt on the MasterCard-style intro on Scene 5 — the splash is no longer
MasterCard-only and any vertical can opt into it.

### "For everything else, there's Workspaces" — when to use the splash

The splash earns its place when the signature-moment transaction is:

- **Async** — participants contribute on their own clock, over days/weeks.
- **Multi-party** — three or more humans with distinct roles (not just
  "signer + cosigner").
- **Mixed-artifact** — data entry + document submission + signature +
  attestation + sometimes back-and-forth redlines, all inside one
  transaction.
- **Persistent** — a "room" that outlasts any single session; participants
  re-enter over time.

Canonical fits: mortgage close, new partner/vendor onboarding, commercial
loan modification, clinical site agreement, grant application with PI +
IRB + finance, foster-care placement, benefits orientation packet,
credentialing. Skip the splash when a single well-composed envelope or a
short webform sequence carries the transaction (KYC refresh, admit
deposit, address change, click-to-agree renewal).

### Story shells on disk

The recipe.json + per-portal-scene-HTML pattern is gone. Today:

- `/stories/story-<vertical>/index.html` is a thin redirect to
  `/stories/_shared/story-shell.html?vertical=<key>` (preserves any
  trailing hash). Eleven folders today, one per vertical key, plus
  `wealth-hillside-aster` as a vanity URL pointing at `wealth`.
- `/stories/_shared/story-shell.html` is the only shell. It contains the
  `VERTICALS` map (per-vertical tenant brand + 5 scenes × 5 beats), the
  `HOTSPOTS` map (5 surfaces × 5 hotspots, shared), and the runtime that
  iframes the right Docusign template per scene.
- Scene templates live at `/story-templates/docusign-*.html`. Each accepts
  `?preset=<key>` to render the per-vertical brand. The Workspace
  template additionally accepts `?splash=1` for the MasterCard-style
  intro (CSS + JS inlined inside `docusign-workspace.html` — there is no
  separate `mastercard-splash.{css,js}` shared module).
- Per-vertical Workspace presets (the canonical 10) live at the bottom
  of `docusign-workspace.html` in the `PRESETS` constant — keys exactly
  match the shell's vertical keys.

`story-templates/mastercard-workspace.html` is a thin redirect to
`docusign-workspace.html?splash=1` — it preserves historical links.
There is no separate inline Scene 5 template anymore.

### How to add or edit a vertical

1. Edit `/stories/_shared/story-shell.html`'s `VERTICALS` map. Each
   entry takes `label`, `tenant`, `subtitle`, `tenantColor`, `preset`,
   and a `scenes` array of 5 objects (each with `tag`, `head`, `lede`,
   and a `beats` array of 5 per-beat objects).
2. Add a matching entry to `PRESETS` at the bottom of
   `/story-templates/docusign-workspace.html` so Scene 5 has tenant
   content. The preset key must match the shell's vertical key.
3. (Optional) Create a redirect folder at
   `/stories/story-<vertical>/index.html` for a clean URL.
4. Pick the SoR badge kit (REGISTRY.md) for any vertical-specific brand
   work in the iframe templates.

There is no `recipe.json`, no `spineRoles`, no per-portal scene HTML,
no `portalDrilldown` key. If a build prompt asks you to author one of
those, the prompt is stale — point it at the shell instead.

---

## Build status

All **21 verticals** (as of 2026-04-26 PM final pass) have full 5-scene
narration with 5 beats each in the shell, matching presets in
`docusign-workspace.html`, tenant brands and colors applied, and a
working `?splash=1` Workspace intro:

- Original 10: `wealth`, `banking`, `insurance`, `provider`, `lifesciences`, `payor`, `fedgov`, `slgov`, `education`, `nonprofit`
- Added 2026-04-26 PM: `insurance-life`, `insurance-pc`, `provider-roi`, `slgov-311`, `slgov-benefits`, `slgov-recertification`, `slgov-vendor-compliance`, `slgov-employee-onboarding`, `slgov-licensing`, `banking-deposits`, `wealth-discovery`

All 11 new verticals were authored by translating the matching root-level
sampler HTMLs into the shell pattern. The 11 source samplers were then
converted to thin redirects pointing to their canonical shell URLs (originals
preserved in git history). One sampler (`hls-discovery-process-map.html`)
remains as a standalone process-map artifact.

Open follow-up work is captured in the project root's `CANONICAL.md`
(per-vertical truth-test matrix and prioritized punch list). Check
`CANONICAL.md` before starting any vertical-related build to make sure
you're not duplicating work or building against a stale assumption.
