# TGK 2.0 — HLS & PubSec Audit Corrections
**Commits:** `885a8fa` (HLS) · `d96a316` (SLED/PubSec)
**Applied:** June 2, 2026
**Source prompts:** `/feedback prompts/TGK 2.0 Review - HLS.md` · `/feedback prompts/Recommended Prompt for Claude Code - SLED.md`

---

## How to Apply These Changes to a Sister Build

All changes live in one file: `stories/_shared/story-shell.html`
Plus three supporting files for HLS: `headless-iam/hls.html`, `headless-iam/index.html`, `story-templates/docusign-webform-intake.html`

The safest approach for a sister build:

1. Pull this repo to get the corrected `story-shell.html`
2. Diff against your current version: `git diff <your-sha> d96a316 -- stories/_shared/story-shell.html`
3. Apply the relevant vertical sections manually using the change guide below

---

## HLS Changes (commit `885a8fa`)

### 1. Provider vertical — complete story rewrite
**File:** `stories/_shared/story-shell.html` — `provider:` section of `VERTICALS`

**What changed:** The Provider story was a patient-facing new patient onboarding flow. It's been corrected to a provider-facing network onboarding / credentialing story.

| Field | Before | After |
|---|---|---|
| tenant | Riverside | Nexus Health |
| subtitle | × Jordan Kim — New Patient Onboarding | × Dr. Kim — Provider Network Onboarding |
| Story persona | Daniela Okafor, Registrar | Marcus Vance, Provider Relations Mgr |
| Scene 1 | Patient pre-registration, demographics, insurance | Provider portal — NPI validation, CAQH linking, malpractice COI |
| Scene 2 | Patient insurance match | DEA registration cross-reference + board certification confirm |
| Scene 3 | HIPAA + financial responsibility signing | Network Participation Agreement + CAQH Data Sync + Malpractice COI |
| Scene 4 | 11 fields → Epic EHR | 14 fields → Nexus credentialing system (NPI, DEA, specialty, malpractice limits) |
| Scene 5 | Patient care workspace | Provider credentialing + re-credentialing workspace |

### 2. Life Sciences vertical — story pivot to CRO/Vendor setup + TMF/JSC scenes
**File:** `stories/_shared/story-shell.html` — `lifesciences:` section

**What changed:** Site activation story for a single CRO pivot to vendor onboarding (MSA + MQA + W-8/W-9), TMF updates (protocol amendments, Form 1572), and JSC/out-licensing workspace.

| Scene | Before | After |
|---|---|---|
| subtitle | × Austin Research Clinic — Site Activation for HX-2104 | × Meridian CRO — CRO & Vendor Setup |
| Scene 1 | Site activation — PI license, protocol version, IRB | CRO vendor onboarding — SOW scope, MQA terms, W-8/W-9 |
| Scene 2 | Dr. Halim GCP currency / CA Medical Board | IAL2 identity check, DEA registration, FDA 21 CFR Part 11 electronic record |
| Scene 3 | CTA + Form 1572 + 3 supporting docs | MSA + Master Quality Agreement + W-8/W-9 |
| Scene 4 tag | SCENE 4 OF 5 · DATA | SCENE 4 OF 5 · DATA · TMF |
| Scene 4 | 26 fields → CTMS | Protocol amendment v2.1 + Form 1572 delta + deviation waivers → TMF binder |
| Scene 4 persona | Ethan Park, Clinical Coordinator | Dr. Rebecca Okonkwo, Director of Regulatory Affairs |
| Scene 5 tag | SCENE 5 OF 5 · WORKSPACE | SCENE 5 OF 5 · WORKSPACE · JSC |
| Scene 5 | Site amendments + safety letters + invoices | JSC + out-licensing: safety data sheets, patent claims, royalty schedule |

### 3. Payor vertical — subtitle update
**File:** `stories/_shared/story-shell.html` — `payor:` section

| Field | Before | After |
|---|---|---|
| subtitle | × Marcus Chen — Silver HMO Enrollment | × Multi-Program Benefits — Integrated Enrollment |

### 4. headless-iam/hls.html — HLS IAM page overhaul
**File:** `headless-iam/hls.html`
213 lines added — full HLS-specific IAM demo page with provider/payor sub-vertical tabs and credentialing flow.

### 5. headless-iam/index.html — nav link update
**File:** `headless-iam/index.html`
HLS link in nav updated to point to the new `hls.html` HLS-specific page.

### 6. docusign-webform-intake.html — HLS preset data
**File:** `story-templates/docusign-webform-intake.html`
Provider and payor preset data updated to reflect the new story personas, document package names, and field values.

### 7. docusign-ehr-desktop.html — minor label corrections
**File:** `story-templates/docusign-ehr-desktop.html`
Field labels corrected to match provider credentialing context rather than patient record context.

---

## PubSec / SLED Changes (commit `d96a316`)

All changes in: `stories/_shared/story-shell.html` — SLED verticals section

### 1. slgov-311 — citizen portal disclaimer added
**Scene 1, lede:** Added amber warning badge:
> ⚠️ Citizen portal powered by third-party integration — not a standalone Docusign product

This prevents reps from implying Docusign owns the citizen-facing 311 QR portal. Critical for competitive accuracy.

**Scene 1, Beat 2 (geo-tagged form):** Added inline GPS confirmation card UI showing confirmed coordinates and address auto-fill.

**Scene 1, Beat 4 (photo upload):** Added inline photo upload UI card with 2-photo placeholder and size estimation status.

### 2. slgov-311 — Beat 2 map/location visual added
See above — GPS location confirmation card added to the geo-tagged form beat for visual richness.

### 3. slgov-snap — SNAP recertification form UI card added
**Scene 1, Beat 1:** Added inline SNAP Recertification Form card showing Member ID / Case # / Recert Reason chips. Makes the intake screen more tangible for buyers.

### 4. slgov-procurement — document list corrected
**Scene 1, Beat 4:** Document count changed from 4 to 6. Document names updated:

Before: W-9, onboarding agreement, COI request, DEI attestation
After: Vendor Agreement, W-9, COI request, DEI attestation, DocGen Template, CLM Redline Approval

### 5. slgov-hr — employment document names formalized
**Scene 1, Beat 4 + Scene 3 throughout:**

| Before | After |
|---|---|
| offer letter | Employment Agreement |
| I-9 | I-9 Verification |
| benefits enrollment | Benefits Enrollment Form |

Scene 3 tag, lede, and all beat text updated to use the formal document names consistently.

### 6. slgov-permits — permit data preview UI cards added
**Scene 1, Beat 2 and Beat 3:** Added inline "Permit Data Preview" card showing construction value, contractor, license number, and calculated fee. Applied to both beats for visual continuity.

**Scene 3, Beat 2 (signing):** Added inline Building Permit Application form card showing permit number, project address, construction type, estimated value, contractor, license #, and signature field.

---

## Verification

After applying, confirm these URLs render correctly:

- HLS Provider: `/stories/story-hls-provider.html`
- HLS Payor: `/stories/story-hls-payor.html`
- Life Sciences: `/stories/story-lifesciences.html`
- SLED 311: `/stories/story-slgov-311.html`
- SLED SNAP: `/stories/story-slgov-snap.html`
- SLED Procurement: `/stories/story-slgov-procurement.html`
- SLED HR: `/stories/story-slgov-hr.html`
- SLED Permits: `/stories/story-slgov-permits.html`

Story shell shared: `/stories/_shared/story-shell.html?vertical=provider` etc.
