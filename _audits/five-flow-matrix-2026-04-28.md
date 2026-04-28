# 5 flows × 21 verticals — current vs target — 2026-04-28

**Target:** every vertical has Onboarding + Maintenance + Fraud Fabric + Workspaces. Headless lives at core-vertical level only (FINS / HLS / PS, one page each).

**Taxonomy decisions locked 2026-04-28:**
- "Onboarding" = today's canonical 5-scene flow. URL: `/stories/_shared/story-shell.html?vertical=<key>` (default usecase)
- "Maintenance" = today's `?usecase=maintenance` (3 scenes: portal-CLEAR → webform → approval-queue Agreement Desk)
- "Fraud Fabric" = today's `?usecase=fraud-fabric`, **renamed**. Same CLEAR-at-the-door + chain-of-custody story; param key, narration tags, picker labels all need to flip.
- "Workspaces" = **new** `?usecase=workspaces`. Scene 5 of canonical, promoted to a standalone single-scene demo. Skips the prelude; lands directly in the multi-party Workspace.
- "Headless" = standalone tenant-branded portal under `/headless-iam/<core>.html`. Three pages total — `fins.html`, `hls.html`, `ps.html` — each picking the strongest example from its core vertical's roster.

---

## Matrix

| Vertical | Core | Onboarding | Maintenance | Fraud Fabric | Workspaces | Headless |
|---|---|---|---|---|---|---|
| wealth | FINS | ✓ | ✓ | ✓ | ✓ | ✓ FINS |
| banking | FINS | ✓ | ✓ | ✓ | ✓ | ✓ FINS |
| insurance | FINS | ✓ | ✓ | ✓ | ✓ | ✓ FINS |
| insurance-life | FINS | ✓ | ✓ | ✓ | ✓ | ✓ FINS |
| insurance-pc | FINS | ✓ | ✓ | ✓ | ✓ | ✓ FINS |
| banking-deposits | FINS | ✓ | ✓ | ✓ | ✓ | ✓ FINS |
| wealth-discovery | FINS | ✓ | ✓ | ✓ | ✓ | ✓ FINS |
| provider | HLS | ✓ | ✓ | ✓ | ✓ | ✓ HLS |
| lifesciences | HLS | ✓ | ✓ | ✓ | ✓ | ✓ HLS |
| payor | HLS | ✓ | ✓ | ✓ | ✓ | ✓ HLS |
| provider-roi | HLS | ✓ | n/a (covered by fraud-fabric) | ✓ | ✓ | ✓ HLS |
| fedgov | PS | ✓ | ✓ | ✓ | ✓ | ✓ PS |
| slgov | PS | ✓ | ✓ | ✓ | ✓ | ✓ PS |
| education | PS | ✓ | ✓ | ✓ | ✓ | ✓ PS |
| nonprofit | PS | ✓ | ✓ | ✓ | ✓ | ✓ PS |
| slgov-311 | PS | ✓ | ✓ | ✓ | ✓ | ✓ PS |
| slgov-benefits | PS | ✓ | ✓ | ✓ | ✓ | ✓ PS |
| slgov-recertification | PS | ✓ | ✓ | ✓ | ✓ | ✓ PS |
| slgov-vendor-compliance | PS | ✓ | ✓ | ✓ | ✓ | ✓ PS |
| slgov-employee-onboarding | PS | ✓ | ✓ | ✓ | ✓ | ✓ PS |
| slgov-licensing | PS | ✓ | ✓ | ✓ | ✓ | ✓ PS |

---

## Status — 2026-04-28 (closed)

**Onboarding — 21/21 done.** Canonical 5-scene flow.

**Maintenance — 20/21 authored, 1 intentional skip.** The 3 originally-missing verticals resolved:
- `slgov-recertification` — authored: Diane Park · mid-cycle household update (add adult daughter Lia).
- `slgov-vendor-compliance` — authored: Apex Logistics · mid-period coverage endorsement (fleet expansion).
- `provider-roi` — skipped intentionally; fraud-fabric for this vertical already covers the sensitive in-portal change ("Revoke or Modify Records Release Scope"). No maintenance card in the picker for this vertical.

**Fraud Fabric — 21/21 done.** Renamed from `auth-fabric` across the codebase (story-shell.html maps, JSON narration, picker URLs, CSS classes, JS variables, doc files). `?usecase=auth-fabric` kept as a URL alias that silently rewrites to `fraud-fabric` for backward compat — drop the alias once analytics show no traffic on the old key (target: 6 months from 2026-04-28).

**Workspaces — 21/21 done.** New `?usecase=workspaces` plumbing in story-shell.html: `USECASE_SCENE_KEYS.workspaces = ["workspace"]`, single-scene template, splash semantics preserved. When no dedicated narration exists, the shell synthesizes a one-scene story from canonical Scene 5 (`v.scenes[4]`) with a re-tagged "SCENE 1 OF 1" header. Topbar scene-tabs hide the canonical surplus when sub-flows are active. Picker has 21 Workspaces cards (one per vertical) inside a new "Workspaces" group.

**Headless — 3/3 cores done.** Pre-existing.

**Picker IA.** Inside Demo Story / Discovery view, a new chip-filter strip lets the user filter by All / Onboarding / Maintenance / Fraud Fabric / Workspaces. Empty categories per subvertical are skipped so the strip stays context-relevant. Existing 3-mode top-level IA (Discovery / Demo Story / Headless IAM) untouched.

**Use-case-narration flash bug.** Resolved. The JSON bundle is now inlined as `<script id="tgk-usecases" type="application/json">…</script>` inside story-shell.html (the shell already had a synchronous loader at line 2087 that was waiting for this tag). No more flash, no GitHub Pages fetch fragility. Async fetch retained as a fallback only.

---

## Open follow-ups (none blocking)

- **Workspaces narration richness.** Today every vertical reuses canonical Scene 5 via synthesis. If a flagship vertical needs a tighter cold-open, author a dedicated `v.usecases.workspaces` block in the JSON — the shell already prefers a dedicated block over the synthesis.
- **Frozen audit artifacts** (`_audits/_narrations-*.json`, `_audits/usecase-payloads-2026-04-27.json`, etc.) still reference `auth-fabric` by design — they're historical record. Don't touch unless one becomes load-bearing again.
