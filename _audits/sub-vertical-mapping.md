# Sub-vertical mapping (5 demos per sub-vertical)

**Per Jimmy's wrap-PDF directive (2026-05-06):** every sub-vertical exposes
exactly 5 demos — Onboarding, Maintenance, Fraud Fabric, Headless IAM,
Workspaces. No multi-onboarding-per-vertical sprawl. The picker should
present a 3×5 grid per cluster.

This doc maps the **23 existing VERTICALS-map entries** into the canonical
3×5 grid, marks redundancies for retirement, and flags cells that need
content built.

---

## FINS cluster (Financial Services)

| Sub-vertical | Onboarding | Maintenance | Fraud Fabric | Headless IAM | Workspaces |
|---|---|---|---|---|---|
| **Wealth** | `wealth` *(SAA · TGK × Hillside)* | `wealth?usecase=maintenance` *(currently signer-update flow inside wealth)* — merge candidate: `wealth-discovery` (Holcomb IRA rollover) | `wealth?usecase=fraud-fabric` *(needs content audit)* | `/headless-iam/fins.html?vertical=wealth` | `wealth?usecase=workspaces` *(synthesizes Scene 5)* |
| **Banking** | `banking` *(Atlas $2.5M facility)* | `banking-deposits` *(Williams household account opening)* — actually onboarding-flavored; possible swap with `banking?usecase=maintenance` (high-value wire to new payee) | `banking?usecase=fraud-fabric` *(needs content audit)* | `/headless-iam/fins.html?vertical=banking` | `banking?usecase=workspaces` |
| **Insurance** | `insurance` *(Ramirez HO3 binding)* | `insurance-life` *(Beacon Mutual death claim)* — fits Maintenance shape | `insurance-pc` *(Northgate FNOL)* — fits Fraud Fabric shape (commercial auto loss) | `/headless-iam/fins.html?vertical=insurance` | `insurance?usecase=workspaces` |

**Retirement candidates after grid lands:**
- `wealth-discovery` → fold into wealth onboarding (or pin as alternate)
- `banking-deposits` → fold into banking onboarding (or pin as deposits-flavored onboarding)
- `insurance-life` → fold into insurance maintenance (cell content)
- `insurance-pc` → fold into insurance fraud fabric (cell content)

---

## HLS cluster (Health & Life Sciences)

| Sub-vertical | Onboarding | Maintenance | Fraud Fabric | Headless IAM | Workspaces |
|---|---|---|---|---|---|
| **Provider** | `provider` *(Riverside · Jordan Kim new patient)* | `provider-roi` *(Catalina · Eric Tan records release)* — fits Maintenance shape | *(needs build — payer fraud claim?)* | `/headless-iam/hls.html?vertical=provider` | `provider?usecase=workspaces` |
| **Life Sciences** | `lifesciences` *(Helix · ARC site activation HX-2104)* | *(needs build — protocol amendment, IRB renewal?)* | *(needs build — research integrity / data-fabrication trigger?)* | `/headless-iam/hls.html?vertical=lifesciences` | `lifesciences?usecase=workspaces` |
| **Payor** | `payor` *(Unity · Marcus Chen Silver HMO)* | *(needs build — plan change, mid-year benefit update?)* | *(needs build — claims fraud / member impersonation?)* | `/headless-iam/hls.html?vertical=payor` | `payor?usecase=workspaces` |

**Retirement candidates:**
- `provider-roi` → fold into provider maintenance (cell content)

**Build queue (HLS):** 4 cells — lifesciences maintenance/fraud, payor maintenance/fraud.

---

## PubSec cluster (Public Sector)

| Sub-vertical | Onboarding | Maintenance | Fraud Fabric | Headless IAM | Workspaces |
|---|---|---|---|---|---|
| **FedGov** | `fedgov` *(DOL · Taylor Nguyen UI claim)* | *(needs build — annual recert / continuing eligibility?)* | *(needs build — UI fraud / claimant identity check?)* | `/headless-iam/ps.html?vertical=fedgov` | `fedgov?usecase=workspaces` |
| **SLGov** | `slgov` *(Springfield · 1420 Oak permit)* — *also candidates: `slgov-benefits` (SNAP), `slgov-licensing` (restaurant)* | `slgov-recertification` *(Medicaid annual recert)* — fits Maintenance shape; alt: `slgov-vendor-compliance` (annual COI) | `slgov-311` *(Greenhaven · pothole, anonymous citizen report)* — fits Fraud Fabric shape (citizen-side identity-light) | `/headless-iam/ps.html?vertical=slgov` | `slgov?usecase=workspaces` |
| **Education** | `education` *(Maple Ridge · Priya Shah Fall 2026)* | *(needs build — FERPA release, mid-year change?)* | *(needs build — financial-aid fraud / impersonation?)* | `/headless-iam/ps.html?vertical=education` | `education?usecase=workspaces` |

**Retirement candidates (SLGov is the messy one):**
- `slgov-benefits` (SNAP) → consider as alternate Onboarding flavor or fold into Maintenance (recerts annually)
- `slgov-licensing` (restaurant) → fold into slgov Onboarding (alternate flavor)
- `slgov-employee-onboarding` (caseworker hire) → DOESN'T fit citizen-facing model; possible separate cluster ("Internal HR") or retire
- `slgov-vendor-compliance` (Apex COI) → competes with `slgov-recertification` for Maintenance cell; pick one

---

## Cross-org / Internal (not citizen-facing)

| Sub-vertical | Onboarding | Maintenance | Fraud Fabric | Headless IAM | Workspaces |
|---|---|---|---|---|---|
| **Nonprofit** | `nonprofit` *(Harbor · Safe Streets grant)* | *(needs build — annual report, amendment?)* | *(needs build — grantee-impersonation check?)* | *(needs build — `/headless-iam/nonprofit.html`)* | `nonprofit?usecase=workspaces` |
| **Sales** | `sales` *(TGK × Black Mesa MSA)* | n/a — sales is opportunity-stage, not lifecycle | n/a | n/a | `sales?usecase=workspaces` |
| **Procurement** | `procurement` *(TGK × Fontara vendor)* | `procurement?usecase=maintenance` *(vendor renewal at scale)* — already wired | n/a | n/a | `procurement?usecase=workspaces` |

**Note:** Sales and Procurement are cross-org demos — they don't fit the citizen/customer 5-cell model. Keep them as separate cluster cards in the picker, NOT inside FINS/HLS/PubSec.

**Note on Nonprofit:** Currently lumped in PubSec by some logic but really its own cluster (philanthropic). Could be its own row or fold into PubSec.

---

## Headless IAM cluster

Per the existing `/headless-iam/{fins,hls,ps}.html` pattern: one tenant-branded
portal per cluster, with `?vertical=<sub>` filtering content to the relevant
sub-vertical. Today the file structure has only three pages (fins / hls / ps).
The 5-per-sub-vertical model assumes Headless IAM is **a cell within each
sub-vertical**, not a separate cluster. Two possible implementations:

- **(a) Per-sub-vertical headless URLs**: build out `/headless-iam/wealth.html`,
  `/headless-iam/banking.html`, etc. Each is a tenant-branded portal showing
  the headless authentication flow for that specific sub-vertical's cast.
- **(b) Cluster pages with vertical filter**: keep `/headless-iam/{fins,hls,ps}.html`
  and route `?vertical=<sub>` to swap the sub-vertical's cast/copy inline.

Recommend **(b)** — fewer files, same UX, easier to maintain.

---

## Picker UI implications

Today `picker.html` mixes function-first (Sales/Procurement) with
vertical-first (FINS/HLS/PubSec → vertical wizard). The 5-per-sub-vertical
rule cleans this up:

```
Cluster (4 cards)         Sub-vertical (3 cards)        Demo (5 chips)
─────────────             ─────────────────────         ─────────────────
□ FINS                    □ Wealth                      □ Onboarding
□ HLS                     □ Banking                     □ Maintenance
□ PubSec                  □ Insurance                   □ Fraud Fabric
□ Cross-org               (3 per cluster typical)       □ Headless IAM
                                                        □ Workspaces
```

Drill-down: Cluster → Sub-vertical → Demo → loads the canonical URL.

The 11 split-out verticals stop appearing as separate top-level entries.
They live as the **content** of specific cells (e.g. `insurance-life` is the
content of *Insurance > Maintenance*, served via the `insurance-life`
preset key under the hood). URLs like `?vertical=insurance-life` continue
to work as deep-links, but the picker doesn't surface them as top-level.

---

## Build queue summary (cells that need content)

After consolidation, **17 cells need content built or audited:**

- **HLS Maintenance:** lifesciences, payor *(2)*
- **HLS Fraud Fabric:** provider, lifesciences, payor *(3)*
- **PubSec Maintenance:** fedgov, education *(2)*
- **PubSec Fraud Fabric:** fedgov, slgov, education *(3)*
- **Nonprofit:** maintenance, fraud, headless *(3)*
- **All Headless IAM cells:** verify each sub-vertical's `?vertical=` filter works against `/headless-iam/{fins,hls,ps}.html` *(4 — wealth, banking, insurance, provider, lifesciences, payor, fedgov, slgov, education)*

The **6 cells that ARE built** but just need cell-position confirmation:
- Wealth Maintenance, Banking Maintenance, Insurance Maintenance,
  Insurance Fraud, SLGov Maintenance, SLGov Fraud — these are the
  split-out verticals (insurance-life, insurance-pc, banking-deposits,
  slgov-recertification, slgov-311) being re-cast as cell content.

---

## Recommended next steps

1. **Sign off on this mapping** — confirm which cell each existing vertical
   lands in. The slgov-* and wealth/banking groups have multiple candidates
   per cell; need a pick.
2. **Picker rebuild** — collapse picker.html to the 4-cluster × 3-sub × 5-cell
   navigation. The existing wizard + cluster-card chrome already supports
   most of the shape; just trim the entries that don't belong on the canonical
   grid.
3. **Cell-content build queue** — author the 17 missing cells. Each is a
   per-vertical preset block (extends webform-intake, signing, navigator,
   workspace), plus narration in `VERTICALS.scenes`.
4. **Retire the redundant top-level vertical keys** — `wealth-discovery`,
   `banking-deposits`, `insurance-life`, `insurance-pc`, `provider-roi`,
   `slgov-311`, `slgov-benefits`, `slgov-recertification`,
   `slgov-vendor-compliance`, `slgov-employee-onboarding`, `slgov-licensing`
   (11 total) become URL aliases that route into the canonical 3×5 grid.
