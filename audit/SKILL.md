---
name: tgk-audit
description: Self-audit and refine the TGK 2.0 Docusign discovery assets. Invoke when the user says "audit", "review", "self-audit", "check the interfaces", or names a specific file and asks whether it's on-brand / story-coherent / parity-correct. Handles the mechanical pass (fonts, colors, emoji, structure) via audit.py and then does LLM-judgment passes for story arc, point-solution validity, Workspaces coherence, and interface parity between vendor and Docusign mocks.
---

# TGK 2.0 self-audit skill

You are reviewing TGK 2.0 discovery assets — swim-lane current-state-vs-future-state HTML files, the 89+ component mocks that render inside them, and the landing/index shells. The **source of truth** for rules is [`_docusign-template-spec.md`](../_docusign-template-spec.md) at the repo root. The rules that can be mechanically checked live in [`rules.json`](./rules.json). This skill's job is to run the mechanical pass, then do the parts that require judgment.

## Output contract

Produce a single markdown punch list at `audit/reports/audit-YYYY-MM-DD.md` (one file per audit run, datestamped). Grouped by file, sorted by severity, with each finding tagged by category. No auto-fixes. Jimmy reviews and decides what to act on.

Template: [`report-template.md`](./report-template.md).

## Workflow

### 1. Scope the run

If the user named specific files, audit those. Otherwise ask (or infer from context) which scope to cover:

- `swim-lane` — `_template.html`, `auto.html`, `insurance-life.html`, `insurance-pc.html`, `wealth-onboarding.html`, `banking-deposits.html`
- `component-current` — `components/current-state/*.html` (vendor mocks)
- `component-future` — `components/future-state/*.html` (Docusign mocks)
- `index` — `index.html`, `index-playbook.html`, `landing.html`
- `story-shell` — `stories/_shared/story-shell.html` (the canonical VERTICALS narration; runs the Capabilities pass)
- `all` — everything above

### 2. Run the mechanical pass

```bash
cd "/Users/patrickmeyer/Documents/Claude/Projects/TGK 2.0"
python3 audit/audit.py --scope <scope> --format json > /tmp/tgk-audit-mech.json
```

Or for specific files:
```bash
python3 audit/audit.py insurance-life.html components/current-state/component-jumio-alloy-retail-banking.html --format json
```

Read the JSON. Don't just dump it — fold its findings into the final report's `## Mechanical findings` section per file.

### 3. Do the LLM-judgment passes

For each file in scope, do **five** judgment passes. Don't skip any — they're the whole reason this is a skill and not a lint script. Use the rubrics below.

#### 3a. Story-arc pass (swim-lane files only)

**Question to answer per lane:** Does reading the six node labels in order, then scanning the six `current.heading` → `future.heading` pairs, produce a coherent narrative of the workflow?

**Rubric:**

- **Coherence** — steps should escalate: intake → gather → decide → execute → deliver → service. No out-of-order steps. No missing connective tissue (e.g. "Application" → "Policy Issuance" with nothing in between is a gap).
- **Granularity** — each node is a distinct phase, not a sub-task of the previous one. "Application" and "Data Validation" are not two separate nodes — validation is part of intake.
- **Parallelism across lanes** — if a file has two lanes (e.g. insurance-life has `new-business` and `death-claims`), the two lanes should share the same *shape* even though the content differs: both start with an intake-equivalent, both have an evidence/verification beat, both terminate in a servicing/closure endpoint.
- **Endpoint logic** — the endpoint node is the *terminal* business state, not just "the last thing that happens". "In-Force Management" is endpoint because it's where the policy lives forever after. "Mailing the policy" is not — that's execution.

**Flag in report under:** `Story arc`.

#### 3b. Point-solution validity pass (LLM per step — this is the one Jimmy explicitly asked for)

**Question to answer per step:** For each chip in `current.points`, is this a **true point solution** — a named incumbent vendor or system of record that Docusign IAM does *not* try to displace? Or is it a workflow step dressed up as a vendor name?

**Rubric — keep the chip if:**

- It names a **specific vendor or product** (LexisNexis ThreatMetrix, Jumio, Alloy, MIB, Guidewire, Veeva, Salesforce Public Sector Solutions, Redtail, Jack Henry, ServiceNow, etc.)
- It names a **non-displaceable system of record** the carrier/bank/advisor actually runs (PAS, Underwriting Engine, Illustration System, Custodian Platform, Agency Management System, Claims Administration System, Imaging, CRM).
- It's in `rules.json → known_vendor_point_solutions` for the file's industry.

**Rubric — replace or drop the chip if:**

- It's a **process noun** that names the workflow step itself (`"Identification"`, `"Verification"`, `"Underwriting"`, `"Review"`, `"Signing"`, `"Application"`). These are in `rules.json → process_nouns_rejected_as_point_solutions`. The mechanical pass surfaces these as `[High][Points]` findings — your job is to propose the *real* vendor underneath. "Identification" in retail banking = "Jumio" or "LexisNexis ThreatMetrix". "Underwriting" in life = "Underwriting Engine" + "PAS".
- It names something **Docusign IAM directly replaces** (`"Generic eSign Tool"`, `"Web Form Builder"`, `"DocuSign CLM competitor"`) — these don't belong as non-displaceable point solutions; their replacement is the whole point of the future state.
- It's a **duplicate** of a neighboring step's point solution without reason (if three consecutive steps all list "PAS", that's fine — but if they all list "Identification", that's a tell that the team copy-pasted placeholders).

**Output:** for each flagged chip, name the specific replacement or the case for dropping.

**Flag in report under:** `Point solutions`.

#### 3c. Workspaces coherence pass (any file where `Workspaces` appears in a `future.tags` array)

Workspaces is distinct because it coordinates **parties and artifacts across time**, not a single-actor task. When it appears, it should be story-aware, not tag-sprayed.

**Question to answer:** If `Workspaces` is tagged on step N, is the surrounding narrative consistent with how Workspaces actually works?

**Rubric:**

- **Introduction point** — Workspaces should appear at the step where multi-party coordination begins: underwriting referral, claims triage with legal/SIU, advisor + custodian + client, payer + provider + pharmacy. If it's tagged on a single-actor step like "Applicant fills form," that's probably wrong.
- **Carry-through** — once Workspaces is introduced, the next step's future narrative should either (a) continue inside the workspace, or (b) explicitly hand off to another IAM product. It should not silently drop back to siloed tools as if the workspace ceased to exist.
- **Parties named** — the future-state heading/bullets on the step that introduces Workspaces should name *who* is in the shared space (e.g. "Agent, carrier UW, and MD in the same workspace"), not just "collaboration improves."
- **Replaces what** — if `current.points` on the same step lists `Referral Email Threads`, `Shared Drives / SharePoint`, `Spreadsheets / Call Logs`, or `Recovery Spreadsheets`, Workspaces is the right replacement — and the future bullet should *name* the shared space, not just "routed through workflow."

**Flag in report under:** `Workspaces`.

#### 3d. Interface parity pass (component mocks)

For each swim-lane step that pairs a current-state component (`step.current.media.src`) with a future-state component (`step.future.media.src`), open both files and compare.

**Question to answer:** Does the future-state Docusign mock **mirror** the vendor mock it's replacing — same data fields, same density, same friction-points resolved — or does it read as a different product entirely?

**Rubric:**

- **Frame match** — both mocks render in the same modal iframe. Canvas size, aspect ratio, and outer padding should be identical. If the vendor mock is 960×600 and the Docusign mock is 1200×400, they'll look mismatched in the modal.
- **Field parity** — if the vendor mock shows an applicant dossier with SSN-4, DOB, address, phone, email, device fingerprint — the Docusign mock should show the equivalent identifier set, even if consolidated into a single panel. Missing fields in the future state read as "this is a toy, not a product."
- **Density parity** — one mock shouldn't be a skeletal wireframe while the other is a rich dashboard. Count the visible content regions; they should be within ~30% of each other.
- **Friction → resolution** — `.friction` / `.warn` / `.stale` chips on the vendor side should have a corresponding resolution chip or absence on the Docusign side. If the vendor mock shows "NIGO — returned by ops" and the Docusign mock shows no validation story at all, the resolution is missing. Equally, don't claim resolution without showing it.
- **Product name match** — the Docusign mock's title should name the IAM product(s) from `step.future.tags`. If `tags: ["Maestro", "Navigator"]` but the mock is titled "Docusign Web Forms", that's a drift.
- **Vendor name match** — the vendor mock's title should name the incumbent from `step.current.points`. If `points: ["Jumio", "Alloy"]` but the mock is titled "Generic KYC Vendor", fix the title.

**How to run this pass efficiently:** for each step, Read both files and diff their `<title>`, visible headings, and visible field labels. You don't need pixel-perfect comparison — you need narrative consistency.

**Flag in report under:** `Interface parity`.

#### 3e. Capability-language pass (story-shell.html VERTICALS narration)

**Question to answer per scene:** Does the narration prose (`head` / `lede` / `beats[].head` / `beats[].lede`) describe the *capability the transaction demands*, or does it name an IAM product line where a capability would do?

This is the rule Jimmy added 2026-04-29: the story arc should read as the work the transaction needs done — *identity verification*, *the orchestration*, *the agreement repository* — not as a parade of product names. Tags, SoR badges, persona role labels, and scene tag prefixes are exempt; those are deliberate product-naming surfaces.

**Rubric — flag if:**

- A name from `rules.json → narration_banned_products.replacements` appears in any of the in-scope narration fields (`scene.head`, `scene.lede`, `scene.beats[].head`, `scene.beats[].lede`). The mechanical pass already surfaces every hit as `[High][Capabilities]` findings — your job is to pick the right capability replacement in context.
- A scene's narrative arc collapses if you remove every product mention. If the *only* thing distinguishing two scenes is which IAM product is named, the underlying business capability isn't carrying the story.

**Rubric — keep the chip if:**

- The mention sits in an exempt field: `tag`, `tags`, `label`, `preset`, `category`, `tenant`, `tenantColor`, `subtitle`, persona `name`/`role`, SoR badge text. The audit script masks these automatically; if you see one of these flagged, downgrade or drop it.
- The product is named once at the *introduction* of the demo (Scene 1 lede or subtitle) to set context, and the rest of the demo carries the capability frame. One controlled mention is fine; ambient sprinkling is not.

**How to run this pass efficiently:** the mechanical pass at `python3 audit/audit.py --scope story-shell` produces every `[Capabilities]` finding with line numbers and a suggested replacement from `rules.json → narration_banned_products.replacements`. For each one, propose the *best* replacement in context — the suggestion list is first-pass, not gospel. Group findings by scene so the narrative shape is auditable.

**Editor surface:** open `/builder.html?vertical=<key>&usecase=<key>` for live, in-place review. The page hydrates from `/api/verticals/<key>` (which reads the canonical VERTICALS registry from `stories/_shared/story-shell.html`) and surfaces every banned-product hit as a clickable lint chip beside the narration field. Click a chip to copy the suggested capability replacement to clipboard. The page is *report-only* — fixes still get committed via Cowork-on-Mac per the editing-workflow memory.

**Known limitation:** the live registry currently stores `scenes` as a flat array per vertical. The per-usecase variants (`maintenance`, `fraud-fabric`, `intake`, `workspaces`) are synthesized at runtime in story-shell.html, not in the registry block the route reads. Audit mode covers the canonical `default` arc; the variants need a separate pass when their synthesis source is exposed.

**Flag in report under:** `Capabilities`.

### 4. Write the report

Use [`report-template.md`](./report-template.md). Save to `audit/reports/audit-YYYY-MM-DD.md` (create the `reports/` dir if needed). Include:

- **Summary** — file count, finding count by severity, headline issues.
- **Per-file sections** — each audited file gets its own section with Mechanical / Story arc / Point solutions / Workspaces / Interface parity subsections. Only show subsections that have findings.
- **Cross-file observations** — patterns that show up across multiple files (e.g. "four files use 'Identification' as a point chip — consistent miss").
- **Suggested fix order** — Jimmy-prioritized punch list at the end: what to do first.

### 5. Present

Save the report to `audit/reports/`, then share the file link with the user and give a 3-bullet verbal summary (top severity, surprising findings, recommended first action).

## Operating notes

- **Don't auto-fix.** This is a report-only skill per Jimmy's chosen config. If he wants fixes, he'll ask for them in a separate turn.
- **Respect the editing workflow.** Memory note: "only Cowork on Mac edits files; GitHub is source of truth; Replit deploys. Never edit in the Repl." Audit from the Mac working copy at `/Users/patrickmeyer/Documents/Claude/Projects/TGK 2.0`.
- **The spec is the spec.** If a finding feels like a judgment call about a rule, re-read `_docusign-template-spec.md` before flagging. Don't invent new rules in the report.
- **Keep `rules.json` in sync.** If a new real vendor comes up during the LLM pass that should be in the allowlist, add it to `rules.json → known_vendor_point_solutions.<industry>` so the mechanical pass learns.
- **Workspaces is the newest IAM product in the narrative.** When in doubt about its correct use, err on the side of asking Jimmy whether an instance he sees in the wild is intentional.
- **Don't run on `auto.html` like it's a live asset.** Per the spec (§8), `auto.html` is palette/font reference only. Mechanical findings on it get severity downgraded to `Low`, judgment passes skip it entirely.

## Example invocation

> User: "audit insurance-life.html"
>
> You:
> 1. Run `python3 audit/audit.py insurance-life.html --format json`
> 2. Read both lanes' `steps` JSON.
> 3. Story-arc pass on each lane (new-business, death-claims).
> 4. Point-solution pass on every step's `current.points`.
> 5. Workspaces pass on every step whose `future.tags` contains "Workspaces".
> 6. For each step with `media.src` on both sides, diff the two component mocks.
> 7. Write `audit/reports/audit-2026-04-20.md`.
> 8. Surface link + 3-bullet summary.
