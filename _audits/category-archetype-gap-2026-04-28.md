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

### P0 — Auth coverage for the rest of FINS

These are the highest-frequency demo asks. We have the template (auth-fabric template + scenarios in usecase-narrations bundle), just need authored narration per (vertical, scenario):

- `wealth-discovery` auth-fabric — Walter authorizes high-value distribution from family trust + chain-of-custody view
- `banking` auth-fabric — Diana authorizes $850k draw on the working-capital facility + chain-of-custody
- `insurance` auth-fabric — Elena coverage-change with step-up + chain-of-custody
- `insurance-life` auth-fabric — Theresa redirects payment with step-up + chain-of-custody
- `insurance-pc` auth-fabric — Priya supplemental damage upload with step-up + chain-of-custody

### P1 — Maintenance coverage for FINS

- `banking` maintenance — Atlas authorized-signer change or beneficiary update on the facility
- `insurance` maintenance — Ramirez address/policy change with step-up
- `insurance-life` maintenance — Whitfield post-claim payment redirect or beneficiary
- `insurance-pc` maintenance — Patel mid-claim evidence upload

### P2 — Cross-vertical maintenance + auth

For HLS/PS verticals, follow the same pattern. Every `?usecase=auth-fabric` scenario in the usecase-payloads spec has a `MAESTRO step-up` narrative — just needs author-pass.

### P3 — Picker labels

Once gaps are filled, the picker subtitles can drop the placeholder copy ("Address changes, beneficiaries, transfers" / "Chain of custody, risk-based auth") and show the actual scenario.

## Notes

- The colored bar in the picker now renders correctly per category — visual scanning works today.
- The `archetype` field is metadata only; doesn't affect visuals. Future use: filter the picker by archetype, or surface archetype as a small chip next to the category bar.
- For Cypress × Holcomb auth gap (the only wealth gap): a natural scenario is "Walter authorizes a $250k discretionary distribution from the family trust" — would tie to the existing trust + IRA + co-trustee narrative.
