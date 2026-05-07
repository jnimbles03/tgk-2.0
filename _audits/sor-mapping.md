# System of Record (SoR) Badge Mapping — TGK 2.0 Verticals

## Mapping

| Vertical Key | Vendor | Rationale |
|---|---|---|
| `banking` | nCino | Standard core banking platform; used for retail & commercial deposit/lending workflows |
| `banking-deposits` | nCino | Retail deposit/onboarding flows on nCino core platform |
| `wealth` | Charles Schwab Advisor Center | TGK Capital is a fictional wealth advisory firm; Advisor Center is the canonical advisor-facing SoR for wealth onboarding |
| `wealth-discovery` | Charles Schwab Advisor Center | Multi-account rollover + trust setup on Advisor Center |
| `insurance` | Guidewire PAS | Guidewire PolicyCenter (PAS) for policy lifecycle & new business binding |
| `insurance-life` | Guidewire | Beacon Mutual uses Guidewire for life/annuity products |
| `insurance-pc` | Guidewire | Northgate Mutual uses Guidewire for property & casualty (FNOL, policy generation) |
| `provider` | Epic | Standard EHR for patient onboarding & clinical data management |
| `provider-roi` | Epic | Riverside Health uses Epic for medical records release & ROI processing |
| `lifesciences` | Veeva Vault | Industry-standard for clinical trial site activation & regulatory management |
| `payor` | HealthEdge | Standard health plan administration platform for enrollment & claims management |
| `fedgov` | Workday | Federal benefits & workforce administration (UI claims, employee onboarding) |
| `slgov` | Salesforce Public Sector Solutions | Standard SFDC variant for municipal permitting & service requests |
| `slgov-311` | Salesforce Public Sector Solutions | Permitting & 311 request management via Salesforce |
| `slgov-benefits` | Salesforce Public Sector Solutions | SNAP/benefits enrollment via Salesforce CMS |
| `slgov-recertification` | Salesforce Public Sector Solutions | Medicaid recertification workflows in Salesforce |
| `slgov-vendor-compliance` | Salesforce Public Sector Solutions | Vendor COI management in Salesforce |
| `slgov-employee-onboarding` | Workday | Caseworker/HR onboarding at Cascade County via Workday |
| `slgov-licensing` | Salesforce Public Sector Solutions | Business licensing (Northbrook) via Salesforce |
| `education` | Workday Student | Standard student information system for enrollment |
| `nonprofit` | Salesforce NPSP | Salesforce Nonprofit Success Pack for grantee onboarding |
| `sales` | Salesforce CRM | Standard Salesforce CRM for opportunity/account management |
| `procurement` | Coupa | Standard procurement platform for RFx & PO management |

## Placement Rules

- **Top-right chrome pill** on all 5 scene templates
- **Text format:** "System of record: <Vendor>" (e.g., "System of record: nCino")
- **No emoji** — text-only or inline SVG brand marks only
- **Secondary color** — low-contrast pill to avoid distraction from the main demo content
- **Responsive:** stays fixed in top-right corner across all templates

## Notes

- Wealth vertical uses Schwab Advisor Center per the TGK Capital fiction (existing pattern in composer + workspace)
- Provider/HLS uses Epic per existing ehr-desktop.html precedent (Cerner & Meditech as alternates per that template's comments)
- Public sector uses Salesforce for service-layer workflows (permits, benefits, licensing) and Workday for HR-flavored (employee onboarding, education)
- No changes to connected-forms.html (already has Guidewire/Salesforce source pickers) or ehr-desktop.html (already has Epic/Cerner/Meditech selector)
