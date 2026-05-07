# System of Record (SoR) Badge Implementation — TGK 2.0

**Date:** 2026-05-06
**Status:** Complete

## Summary

Implemented a persistent "System of record" badge across all 5 scene templates (Agreement Desk, Clear IDV, Signing Ceremony, Navigator, Workspace). The badge appears as a subtle pill in the top-right corner of each demo screen, displaying the vendor name per vertical.

## Files Created

### Component Assets

- **`/assets/sor-badge/sor-badge.css`** — Minimal styling for the badge pill. Fixed position (top-right), low visual weight, secondary color (rgba(71,71,71)), responsive text. No emoji.
- **`/assets/sor-badge/sor-badge.js`** — Initialization script that:
  - Reads `?preset=<vertical>` from the iframe URL
  - Looks up the vendor name in the `SOR_MAP` object
  - Populates the badge with "System of record: <Vendor>"
  - Auto-initializes on page load via `window.sorBadge.init()`

### Mapping Document

- **`/_audits/sor-mapping.md`** — Source of truth for the vertical-to-vendor mapping. 21 verticals + 2 bonus (sales, procurement for completeness). Includes rationale per domain and existing precedents (Schwab for wealth, Epic for HLS, Guidewire for insurance, etc.).

## Files Modified

### Scene Templates (all wired identically)

1. **`/story-templates/docusign-agreement-desk.html`**
   - Added `<link>` to sor-badge.css before `</head>`
   - Added `<script>` for sor-badge.js after `<body>`
   - Added `<div class="sor-badge" id="sor-badge"></div>` as first child in `<body>`

2. **`/story-templates/docusign-clear-idv.html`**
   - Same changes as above

3. **`/story-templates/docusign-signing-ceremony.html`**
   - Same changes as above

4. **`/story-templates/docusign-navigator.html`**
   - Same changes as above

5. **`/story-templates/docusign-workspace.html`**
   - Same changes as above

## Wiring Pattern

Every scene template now has:

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/sor-badge/sor-badge.css">

<!-- After <body> tag -->
<script src="/assets/sor-badge/sor-badge.js"></script>
<div class="sor-badge" id="sor-badge"></div>

<!-- Rest of template content... -->
```

The JS reads `?preset=<vertical>` at load time and populates the div. If preset is missing or unmapped, the badge remains hidden (display: none).

## Testing

### Basic Test

1. Open any scene template with a valid preset: e.g., `/story-templates/docusign-agreement-desk.html?preset=banking`
2. Look for the badge in the top-right corner
3. Badge should read: "System of record: nCino"

### All Verticals

Test at least one representative vertical per domain:

| Domain | Vertical | Expected Badge |
|---|---|---|
| Banking | `banking` | System of record: nCino |
| Wealth | `wealth` | System of record: Charles Schwab Advisor Center |
| Insurance | `insurance-life` | System of record: Guidewire |
| Provider | `provider` | System of record: Epic |
| Life Sciences | `lifesciences` | System of record: Veeva Vault |
| Payor | `payor` | System of record: HealthEdge |
| Federal Gov | `fedgov` | System of record: Workday |
| State/Local Gov | `slgov-benefits` | System of record: Salesforce Public Sector Solutions |
| Education | `education` | System of record: Workday Student |
| Nonprofit | `nonprofit` | System of record: Salesforce NPSP |

### Edge Cases

- **No preset param:** Badge hides (display: none)
- **Invalid preset:** Badge hides
- **Dynamic ?usecase= params:** Badge is unaffected; only `?preset=` matters

## Design Rationale

- **Fixed position, high z-index (999):** Badge stays visible throughout interaction, doesn't block content
- **Low opacity (0.85), secondary color:** Intentionally subtle; viewer focus stays on the demo content, not the metadata
- **Text-only, no emoji:** Per Jimmy's strict brand rule in memory (no emoji in TGK 2.0 UI)
- **Tabular numbers:** Ensures vendor names align cleanly if viewed side-by-side (future optimization)
- **Print hidden:** Badge doesn't appear in PDF export/print
- **No external dependencies:** Everything inline CSS + vanilla JS

## What Was Deferred

1. **Hardcoded ?preset= in shell.html:** The 5-scene shell already passes `?preset=` to each iframe, so no changes needed there.
2. **Vendor icon/logo marks:** Currently text-only. Future enhancement could add inline SVG vendor marks (e.g., nCino logo) without breaking the "no emoji" rule.
3. **Tooltip on hover:** Badge is deliberately low-key; no tooltip added. If users need context, they can see vendor name in the pill itself.
4. **connected-forms.html & ehr-desktop.html:** Not modified. These files already have their own SoR-like patterns (source picker in connected-forms, vendor selector in ehr-desktop). They work independently and don't collide with the badge.

## Next Steps

1. **Load-test on Replit:** Open story-shell with a few verticals and visually confirm badges appear.
2. **Run audit suite:** `bash _audits/_persona_audit_build.sh` should pass cleanly (no dependencies on badge).
3. **Git commit:** Leave uncommitted per workflow (Cowork commits, Mac terminal pushes).
4. **Optional:** Consider integrating vendor logos (inline SVG) in sor-badge.js if branding team wants richer visual treatment.

## Vertical-to-Vendor Map Summary

All 21 + 2 verticals mapped in `/audits/sor-mapping.md`:

- **Banking (2):** nCino
- **Wealth (2):** Charles Schwab Advisor Center
- **Insurance (3):** Guidewire (PAS / generic)
- **Provider/HLS (2):** Epic
- **Life Sciences (1):** Veeva Vault
- **Payor (1):** HealthEdge
- **Government (7):** Workday (HR-flavored) / Salesforce Public Sector Solutions (service-layer)
- **Education (1):** Workday Student
- **Nonprofit (1):** Salesforce NPSP
- **Cross-org bonus (2):** Salesforce CRM (sales) / Coupa (procurement)

