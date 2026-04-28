# Webform Standardization Audit

**Date:** 2026-04-28
**Triggering ask:** "this is the wrong webform — should be `docusign-webform-intake.html`" (auth-fabric Scene 2 was rendering the legacy stub).

## Standardized template

**`/story-templates/docusign-webform-intake.html`** is now the single canonical webform template across the entire project. Multi-state (s1 → s5), per-preset content overlays, scenario-aware state titles, real `tgk:lockToBeat` postMessage support.

## Where it's iframed

| Site | Path | Notes |
|---|---|---|
| Shell canonical Scene 1 | `SCENE1_TEMPLATE_OVERRIDE.template` | All non-C archetype verticals override Scene 1 to webform-intake |
| Shell `?usecase=auth-fabric` Scene 2 | `USECASE_TEMPLATE_FILES["auth-fabric"][1]` | **Swapped 2026-04-28** — was `docusign-portal-shell.html?mode=action-webform`, now `docusign-webform-intake.html` |
| Shell `?usecase=intake-3` Scene 1 | `USECASE_TEMPLATE_FILES["intake-3"][0]` | Already canonical |
| Shell `?usecase=intake-4` Scene 1 | `USECASE_TEMPLATE_FILES["intake-4"][0]` | Already canonical |
| Shell `?usecase=maintenance` Scene 2 | `USECASE_TEMPLATE_FILES["maintenance"][1]` | Set 2026-04-27 |
| `enterprise-emptoris.html` slots | `data-target` × 7 | Migrated 2026-04-28 from `docusign-webform.html` |
| Admin composer dropdown | template list option | Single canonical option ("Webform intake · multi-state (canonical)") |

## What was deprecated

- **`docusign-portal-shell.html?mode=action-webform`** — was used by auth-fabric Scene 2. Now unreferenced (the `action-webform` mode block stays in the template for back-compat but no scene loads it).
- **`docusign-webform.html`** — separate "simple webform" template. All references migrated to `docusign-webform-intake.html`. The file remains on disk but is unreferenced; safe to delete in a follow-up cleanup.

## Per-preset content overlays

Three overlay modes now drive per-vertical content for the same template:

| URL param | Overlay map | Behavior |
|---|---|---|
| `?usecase=intake` | `PRESETS` (base) | Onboarding-flavored content per preset (existing) |
| `?usecase=maintenance` | `MAINTENANCE_PRESETS` overlay on `PRESETS` | Sensitive-change content per preset (added 2026-04-27, completed 2026-04-28) |
| `?usecase=auth-fabric` | `AUTH_FABRIC_PRESETS` overlay on `PRESETS` | High-value action content per preset (added 2026-04-28) |

All 21 verticals have entries in all three overlay tiers.

## Hotspot key parity

`auth-fabric` Scene 2 hotspot key changed from `portal_webform` → `webform_intake` to match the new iframe target. Admin composer's `auth-fabric.sceneKeys` updated in lockstep.

## Verification command

```
grep -rn "docusign-webform\.html" --include='*.html' --include='*.js' --include='*.json' . \
  | grep -v "docusign-webform-intake"
```

After this audit: zero matches. Standardization complete.
