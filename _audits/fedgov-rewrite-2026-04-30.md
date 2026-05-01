# Federal Gov (fedgov) · audit summary

**Status**: Draft for review · 2026-04-30  
**Vertical**: Department of Labor / Unemployment Insurance (UI)  
**Client**: Taylor Nguyen (claimant, constituent side)

---

## Summary of findings

The fedgov vertical exhibits three coherence gaps:

1. **Terminology mismatch**: `story-shell.html` calls the identity verification system "identity verification"; `usecase-narrations-2026-04-27.json` calls it "CLEAR". Both refer to the same system. The narration (CLEAR) is more domain-specific and accurate.

2. **Default flow category error**: The `persona-sequence-data.json` marks the default/onboarding flow as "maintenance" when it should be "intake" (initial claim filing). The canonical 5-scene flow is Taylor filing a new UI claim — a self-service intake, not post-claim maintenance.

3. **Scene 1 sender persona**: The default intake's Scene 1 has no named actor for the orientation webform. Should name "Taylor" as the self-service filer (client side) or add a system-side actor label clarifying the form origin.

## Domain rules applied

- **Tenant**: Department of Labor (or "DOL Workforce") ✓ uses neutral naming, no real-person riffs
- **Front-office roles**: No advisor side; claimants, adjudicators, examiners, specialists only ✓
- **Client persona**: Taylor Nguyen is the claimant/constituent (client side) ✓
- **No TGK Capital**: Fedgov is UI/workforce domain; TGK reserved for wealth + banking ✓

---

## Proposed corrections

### 1. Harmonize identity verification terminology

**Where**: All three use cases (default, intake, fraud-fabric, maintenance)  
**Change**: Replace "identity verification" with "CLEAR" in `story-shell.html`

- Sentence swap: "the workflow invokes identity verification at login" → "Maestro invokes CLEAR at login"
- Sentence swap: "Identity verification verifies Taylor's identity" → "CLEAR verifies Taylor's identity"
- Sentence swap: "identity verification session opens" → "CLEAR session opens"

**Rationale**: CLEAR is the correct system name (govt-specific acronym). Avoids generic "identity verification" which appears across all verticals; fedgov owns CLEAR's SSA + multi-state specificity.

### 2. Correct default flow category to "intake"

**Where**: `persona-sequence-data.json`, line ~3349  
**Change**: `"category": "maintenance"` → `"category": "intake"`

**Rationale**: Taylor's initial claim filing is onboarding/intake (file-new-claim), not post-claim maintenance (modify-existing-claim). The 5-scene spine shows a new claimant from filing to active workspace — classic intake pattern.

### 3. Name Scene 1 sender for self-service intake

**Where**: Default flow, Scene 1 (SCENE 1 OF 5 · INTAKE · SELF-SERVICE PORTAL)  
**Change**: Add explicit persona declaration on the scene head or beats

**Option A** (minimal): Tag the scene head with "(Taylor)"
> "Taylor files a UI claim through the state's claimant portal." — persona = client

**Option B** (explicit beat label): On beat 1, add:
> "Taylor opens 'File a New Claim.'" — persona = client (Taylor)

**Rationale**: Intake flows benefit from naming the filer. Avoids ambiguity about who initiates the webform — it's the claimant (Taylor), not an agent or advisor.

---

## What this changes downstream

- **CLEAR references**: Any other code (CSS, JS, narrative templates) that say "identity verification" for fedgov should swap to CLEAR.
- **Persona audit**: Scene 1 self-service intake persona should always be named (claimant or applicant); "no persona" signals missing narrator.
- **Default vs. intake**: The "default" preset (canonical 5-scene) should always be the domain's primary onboarding flow, never maintenance.

---

## How to apply

If approved:

1. Edit `stories/_shared/story-shell.html` — replace "identity verification" with "CLEAR" and "the workflow" with "Maestro" throughout the fedgov block (lines 7378–7668).
2. Update `persona-sequence-data.json` line ~3349: change category from "maintenance" to "intake".
3. Add explicit persona on Scene 1, Beat 1 of default flow: `"persona": { "side": "client", "name": "Taylor" }`.
4. Re-run `_audits/_persona_audit_build.sh` to refresh verdicts.

No changes to narration substance — only terminology, category, and persona clarity.

---

## Notes

- All four flows (default, intake, fraud-fabric, maintenance) follow correct 3–4 scene + Workspace tail spine.
- Tenant, customer, color, role vocabulary all pass domain audit.
- No TGK Capital contamination detected.
- CLEAR + Maestro + Iris system actor framing is coherent across beats.
