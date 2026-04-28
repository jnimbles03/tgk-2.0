# Category × Archetype Gap Matrix

**Date:** 2026-04-28
**Purpose:** Per the user's call to "categorize the use cases by onboarding / maintenance / auth for each archetype," this matrix shows which (vertical · tenant · archetype · category) cells have a Demo Story today and which are missing. Drives the next-build punch list.

## Taxonomy

**Category** (drives the colored bar in the picker — red/blue/green):
- **onboarding** — net-new relationship (account opening, new patient, site activation, new vendor, etc.)
- **maintenance** — sensitive change to an existing relationship (signer change, beneficiary, recert, payee add, etc.)
- **auth** — auth-fabric / fraud / chain-of-custody / high-value-action demos

**Archetype** (subtitle metadata, not visualized):
- **sender-led** — internal employee fills a webform on behalf of a customer (Archetype A)
- **triggered** — Maestro fires from a system event, no human-initiated form (A-trig)
- **self-service** — customer fills a webform inside their authenticated portal (B)
- **inbound** — story opens with an inbound trigger event from outside the tenant (C — death notice, FNOL, ROI request)
- **advisor-led** — opens in a Workspaces deal/relationship room (D)

## Matrix — ✓ implemented · ✗ missing

| Subvertical · tenant | Archetype | Onboarding | Maintenance | Auth |
|---|---|:---:|:---:|:---:|
| **FINS · Wealth** Hillside × Aster | sender-led | ✓ | ✓ | ✓ |
| **FINS · Wealth** Cypress × Holcomb | advisor-led | ✓ | ✓ | ✗ |
| **FINS · Banking** Meridian × Atlas | sender-led | ✓ | ✗ | ✗ |
| **FINS · Banking** Cedar × Williams | triggered/self-service | ✓ | ✓ | ✓ |
| **FINS · Insurance** Sentinel × Ramirez | sender-led | ✓ | ✗ | ✗ |
| **FINS · Insurance** Beacon × Whitfield | inbound (claims) | ✓ | ✗ | ✗ |
| **FINS · Insurance** Northgate × Patel | self-service (FNOL) | ✓ | ✗ | ✗ |
| **HLS · Life Sciences** Helix × ARC | sender-led | ✓ | ✗ | ✗ |
| **HLS · Providers** Riverside × Jordan | self-service | ✓ | ✗ | ✗ |
| **HLS · Providers** Catalina × Eric | inbound (ROI) | — | ✓ | ✗ |
| **HLS · Payers** Unity × Marcus | self-service | ✓ | ✗ | ✗ |
| **PS · Federal** DOL × Taylor (UI) | self-service | ✓ | ✗ | ✗ |
| **PS · Federal** Cascade County × Marcus Lee | sender-led | ✓ | ✗ | ✗ |
| **PS · Federal** Ridgeview × Apex (vendor) | triggered | — | ✓ | ✗ |
| **PS · State & Local** Springfield × 1420 Oak (permit) | self-service | ✓ | ✗ | ✗ |
| **PS · State & Local** Eastside × Rivera (SNAP) | self-service | ✓ | ✗ | ✗ |
| **PS · State & Local** Cascade Medicaid × Diane (recert) | triggered | — | ✓ | ✗ |
| **PS · State & Local** Northbrook × Avalon (license) | self-service | ✓ | ✗ | ✗ |
| **PS · State & Local** Greenhaven × Cedar Ave (311) | self-service | ✓ | ✗ | ✗ |
| **PS · Education** Maple Ridge × Priya | self-service | ✓ | ✗ | ✗ |
| **PS · Nonprofit** Harbor × Safe Streets | sender-led | ✓ | ✗ | ✗ |

**`—`** = N/A (the tenant's canonical scenario *is* maintenance, so onboarding doesn't apply at this tenant — covered by other tenants in the subvertical.)

## Headline read

- **Onboarding coverage is broad** — almost every vertical has at least one onboarding story.
- **Maintenance is sparse** — only banking-deposits, wealth (both tenants), provider-roi, slgov-vendor-compliance, and slgov-recertification have authored maintenance flows. Most verticals fall back to "intake" content when `?usecase=maintenance` is loaded.
- **Auth is the biggest gap** — only banking-deposits and wealth have an authored auth-fabric story. Every other vertical (~19 of 21) is missing the CLEAR-at-the-door + chain-of-custody demo.

## Build punch list (in priority order)

### ~~P0 — Auth coverage for the rest of FINS~~ ✓ Done 2026-04-28

Discovered the auth-fabric narrations were already authored in
`usecase-narrations-2026-04-27.json` from the original bulk pass —
just missing picker cards. P0 became "expose what exists" rather
than "author new narration." All 5 priority verticals now have a
`Fraud / Risk Management` card in the picker:

- ✓ `wealth-discovery` → Cypress × Holcomb · high-value IRA rollover
  (subvertical: wealth, archetype: advisor-led)
- ✓ `banking` → Meridian × Atlas · $850k working-capital draw
  (subvertical: banking, archetype: sender-led)
- ✓ `insurance` → Sentinel × Ramirez · mid-policy deductible change
  (subvertical: insurance, archetype: self-service)
- ✓ `insurance-life` → Beacon × Whitfield · post-claim payment redirect
  (subvertical: insurance, archetype: self-service)
- ✓ `insurance-pc` → Northgate × Patel · supplemental damage upload
  (subvertical: insurance, archetype: self-service)

Picker also got two parent restructures: insurance subvertical's
single placeholder "Fraud / Risk Management" was replaced with three
tenant-specific cards (HO3 / Life Claims / P&C); banking subvertical
got a new "Commercial Fraud / Risk Management" alongside the
existing Cedar one; wealth subvertical got "Advisor-Led Fraud /
Risk Management" alongside the existing Hillside one.

### ~~P1 — Maintenance coverage for FINS~~ ✓ Done 2026-04-28

Authored fresh maintenance narration for all four FINS verticals,
each scenario distinct from that vertical's auth-fabric so the two
demos don't overlap:

- ✓ `banking` maintenance — Atlas authorized-signer roster (Diana adds
  son Mark as COO co-signer · CLEAR step-up for both · Sofia in credit
  ops reviews · commercial core record refreshes)
- ✓ `insurance` maintenance — Ramirez address change + mortgagee refresh
  (move triggers auto-rerate · Westshore Mortgage gets new mortgagee
  endorsement · Coastal Mortgage gets release notice · Marisol confirms
  in underwriting)
- ✓ `insurance-life` maintenance — Whitfield contingent beneficiary
  (Theresa adds granddaughter Maya at 20% contingent · existing
  children rebalance to 80% · SSA cross-reference validates Maya's
  identity · Camille confirms in claims)
- ✓ `insurance-pc` maintenance — Patel fleet vehicle replacement
  (post-CL-2026-31102 total-loss settlement · new VIN validates against
  state DMV · auto-rerate · endorsement issues + ID card prints for cab)

Three things ship together per vertical:
- New `usecases.maintenance` block in `usecase-narrations-2026-04-27.json`
- New `MAINTENANCE_PRESETS[<key>]` overlay in `docusign-webform-intake.html`
  with state titles + ledes for s2/s3/s4
- New "Account Maintenance" picker card in `index-unified.html` with
  category=maintenance + appropriate archetype

### P2 — Cross-vertical maintenance + auth · partial 2026-04-28

**Auth coverage** ✓ done — picker cards added for all 12 HLS/PS verticals
pointing at the existing auth-fabric narrations. Lifesciences SAE,
Provider Schedule II refill, Provider-ROI scope revoke, Payor
specialty-drug PA, Federal weekly cert, all 7 state-local cards
(permit mod, 311 follow-up, SNAP household change, vendor COI,
Diane recert, Marcus Lee I-9, Avalon outdoor seating), Education
FERPA transcript, Nonprofit drawdown.

**Maintenance coverage — 5 of 11 done.** Authored fresh maintenance
narration + MAINTENANCE_PRESETS overlay + picker card for:
- ✓ `provider` — insurance card update after plan change
- ✓ `payor` — PCP change request after move
- ✓ `education` — address + emergency contact update
- ✓ `slgov` — permit modification request mid-construction
- ✓ `slgov-licensing` — outdoor seating amendment to existing license

Still pending maintenance authoring (6 verticals):
- `lifesciences` — sub-investigator addition mid-trial
- `fedgov` — direct-deposit account change mid-claim
- `slgov-311` — edit-in-progress on existing service request
- `slgov-benefits` — EBT card replacement after loss
- `slgov-employee-onboarding` — benefits enrollment change after life event
- `nonprofit` — budget reallocation request mid-grant-period

(Skipped: `provider-roi` / `slgov-vendor-compliance` / `slgov-recertification`
— their canonical scenarios are already maintenance-flavored.)

### P3 — Picker labels

Once gaps are filled, the picker subtitles can drop the placeholder copy ("Address changes, beneficiaries, transfers" / "Chain of custody, risk-based auth") and show the actual scenario.

## Notes

- The colored bar in the picker now renders correctly per category — visual scanning works today.
- The `archetype` field is metadata only; doesn't affect visuals. Future use: filter the picker by archetype, or surface archetype as a small chip next to the category bar.
- For Cypress × Holcomb auth gap (the only wealth gap): a natural scenario is "Walter authorizes a $250k discretionary distribution from the family trust" — would tie to the existing trust + IRA + co-trustee narrative.
