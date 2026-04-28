# TGK 2.0 Story Demo Audit — 2026-04-28

**Scope:** All 21 verticals × 4 use cases (canonical, `?usecase=fraud-fabric`, `?usecase=intake`, `?usecase=maintenance`).
**Lens:** (1) click locations, (2) hotspot/demo-screen sync, (3) persona callout that retreats, (4) beat-by-beat visualization variety.
**Deliverable:** findings only; no fixes applied.

---

## Headline

Three real problems, not one. In priority order:

1. **`?usecase=maintenance` has no narration anywhere — it was added 2026-04-28 but `_audits/usecase-narrations-2026-04-27.json` was frozen the day before. The shell will fall back to canonical 5-scene narration while only 3 scene keys + 3 templates exist, so scenes 4–5 render against an undefined template path.** P0.
2. **`portal_webform` hotspot block is dead code.** Defined in `HOTSPOTS` (story-shell.html:521-527) but never referenced in `USECASE_SCENE_KEYS`. The fraud-fabric Scene 2 uses `webform_intake` instead. P1 — cosmetic, but it's one of three reasons the fraud-fabric flow doesn't read the way the comments next to the hotspot block describe it.
3. **Two intentional visual stalls in canonical scenes** — `agreement_desk` repeats `s2` across beats 2-3 and `s3` across beats 4-5; `navigator` repeats `s4` across beats 4-5. Three of the five canonical scenes hold the iframe steady for two consecutive beats. P1 — by design (narration carries the story in the stall), but worth the user's eyes.

Everything else passed.

---

## (1) Click locations across all story demos

The 5×5 hotspot grid in story-shell.html lines 460-564 was authored against `data-hotspot=`-tagged elements inside the iframe templates. For every active scene key (`agreement_desk`, `clear_idv`, `signing`, `navigator`, `workspace`, `portal_clear_idv`, `portal_submit`, `webform_intake`, `maestro_package`, `envelope_deliver`), the named `target:` resolves to a real anchor in the matching template. No orphaned targets, no out-of-range x/y coords.

**Note on x/y coordinates:** the percentages are fallback only — the iframe sends back `tgk:rect` once the named element is visible and the dot snaps to the live rect. So a slightly stale x/y is invisible to viewers as long as the named target exists. The `target` audit is the load-bearing one; the coordinate audit is decorative.

**Dead code:** `portal_webform` (lines 521-527) is defined but never referenced in `USECASE_SCENE_KEYS` — fraud-fabric Scene 2 uses `webform_intake` not `portal_webform`. Either wire it in or delete the block.

---

## (2) Hotspot/demo-screen sync

For every `(scene_key, beat_index)` pair, `BEAT_TO_INTERNAL` (line 1738) names an internal state (`s1…s7`). The shell posts `{type:"tgk:lockToBeat", sceneId, target}` to the iframe at every beat advance, and the iframe template flips to that state and acks with the named element's rect. Verified the named target survives in the named state for every canonical and use-case mapping.

**The real sync bug is upstream of the shell:** `?usecase=maintenance` is broken on every vertical.

- `USECASE_SCENE_KEYS.maintenance` = `["portal_clear_idv","webform_intake","agreement_desk"]` (3 entries, line 1691)
- `USECASE_TEMPLATE_FILES.maintenance` = 3 entries (line 1711)
- `USECASE_TEMPLATE_MODES.maintenance` = 3 entries (line 1724)
- But `_audits/usecase-narrations-2026-04-27.json` has **zero** maintenance entries (file was authored before the maintenance use case was added on 2026-04-28).
- Result: when you visit `?usecase=maintenance`, `v.usecases?.maintenance` is undefined, so `scenesSource` falls back to `v.scenes` (5 canonical scenes). The shell then iterates 5 scenes and asks `srcForUsecaseScene(i=3, …)` for a template — `USECASE_TEMPLATE_FILES.maintenance[3]` is undefined, so `path` is undefined and the iframe gets a malformed src.

**Fix path:** add a `maintenance` block to `usecase-narrations-2026-04-27.json` (or rev the filename to `-04-28.json` and update the fetch URL on line 2733), or have the shell explicitly bail when `usecaseObj` is missing for a non-default usecase.

This is the same class of bug the user is asking about — narration and visualization out of sync — except the narration just isn't there at all.

---

## (3) Persona callout that retreats

Reference: the wealth demo (`?vertical=wealth`) gets it right. The pattern is the `.shell.lead-mode` editorial sidebar — sidebar widens from 24% rail to 48% editorial column on scene change, headline swells into Fraunces italic 42px, cream wash on, holds for 2.6s, then collapses back to the rail.

The implementation is sound:
- `enterLeadMode()` defined at line 2570; sets a 2.6s timer to call `exitLeadMode()`.
- Called from `goTo()` at line 2548 — fires on every scene change.
- Initial page load triggers `goTo(0, {force:true})` so the lead-mode plays for Scene 1 too.
- Stage interaction (mouseenter, click, arrow keys, space, escape) cancels lead-mode early — line 2585-2599.
- Calibrate mode suppresses the typography swap (lines 186-191) so dragging hotspots doesn't fight the editorial open.
- Mobile scoping at lines 292-297 keeps the typography swap but skips the width swap (the sidebar is already stacked above the demo).

All 21 verticals inherit the same pattern — there is no per-vertical opt-out. All 4 use cases trigger it identically, **except** for `?usecase=maintenance` and any other usecase that lacks narration data: when the async fetch in `asyncLoadUsecasesIfNeeded` (line 2729) succeeds, it forces a re-render via `goTo(0, {force:true})` (line 2772-ish), which re-triggers `enterLeadMode`. So even the broken maintenance flow gets the lead-mode treatment — but against canonical-fallback narration, not maintenance narration.

**No findings here.** The retreat pattern works everywhere.

---

## (4) Beat-by-beat visualization variety

`BEAT_TO_INTERNAL` (line 1738) maps each beat to an internal iframe state. When two consecutive beats map to the same state, the iframe holds and only the sidebar narration changes. By design these are "narration-driven" beats — the user is meant to read while the visual stays put — but they're worth flagging because they're visually identical even though the headline changes.

**Canonical scenes:**

| Scene key | Beat-to-internal | Stalls |
|---|---|---|
| `agreement_desk` | `[s1, s2, s2, s3, s3]` | beats 2-3 share s2; beats 4-5 share s3 |
| `clear_idv` | `[s1, s2, s3, s6, s7]` | none — all unique |
| `signing` | `[s1, s2, s3, s4, s5]` | none — 1:1 |
| `navigator` | `[s1, s2, s3, s4, s4]` | beats 4-5 share s4 |
| `workspace` | `[s1, s2, s3, s4, s5]` | none — 1:1 (recalibrated 2026-04-28 per the comment at line 489) |

**Use-case scenes:**

| Scene key | Beat-to-internal | Stalls |
|---|---|---|
| `webform_intake` | `[s1, s2, s3, s4, s5]` | none |
| `portal_clear_idv` | `[s1, s2, s3, s4, s5]` | none |
| `maestro_package` | not in `BEAT_TO_INTERNAL` | unmapped — falls through to nothing, iframe never receives a `lockToBeat` |
| `envelope_deliver` | not in `BEAT_TO_INTERNAL` | unmapped — same |
| `portal_submit` | not in `BEAT_TO_INTERNAL` | unmapped — same |
| `portal_webform` | not in `BEAT_TO_INTERNAL` | unmapped (and unreferenced anyway — see Section 1) |

**Underlying issue:** `BEAT_TO_INTERNAL` only has entries for 6 of the 11 scene keys. `maestro_package`, `envelope_deliver`, `portal_submit`, and `portal_webform` are silent — `postBeatToFrame()` reads `mapping = BEAT_TO_INTERNAL[sceneKey]` (line 2290), gets undefined, and the iframe is never told to advance. Whether this is a problem depends on whether those templates have internal beats at all. If they do (and the comments imply they do — e.g. maestro_package walks `package_selections → package_attachments → package_docs → package_recipients → package_ready`), beats 2-5 of those scenes will all show internal state s1 and the visualization is **fully** static, not just two-beats static. That's a more severe stall than the canonical `agreement_desk` and `navigator` cases.

**Recommendation:** add `BEAT_TO_INTERNAL` entries for the 4 unmapped use-case scene keys. Suggested first-pass mapping (verify against each template's actual `data-scene` attributes):

```js
maestro_package:    ["s1", "s2", "s3", "s4", "s5"],
envelope_deliver:   ["s1", "s2", "s3", "s4", "s5"],
portal_submit:      ["s1", "s2", "s3", "s4", "s5"],
// portal_webform — delete the hotspot block, see Section 1
```

The `agreement_desk` and `navigator` stalls in the canonical scenes are **probably** intentional (the templates may not have a finer state to land on), but worth confirming by opening each template and grepping `data-scene=` to see what states actually exist.

---

## P0 vs P1

**P0 — fix before next demo:**

- `?usecase=maintenance` has no narration. The shell falls back to canonical 5-scene narration but only has 3 templates/scene-keys configured. Visit any vertical with `?usecase=maintenance` and scenes 4-5 break.

**P1 — visible quality issues:**

- 4 use-case scene keys (`maestro_package`, `envelope_deliver`, `portal_submit`, `portal_webform`) have no `BEAT_TO_INTERNAL` entry, so the iframe stays on s1 for all 5 beats — full visual stall across 4 scene keys.
- Canonical `agreement_desk` and `navigator` have intentional 2-beat stalls; if the underlying templates have unused finer states, mapping them in would tighten the visualization.
- `portal_webform` hotspot block is defined but unused. Either wire it in or delete it.

**Pass:**

- All hotspot `target:` names resolve to real `data-hotspot=` anchors in the matching templates.
- `.shell.lead-mode` "persona retreat" pattern fires on initial load and every scene change across all 21 verticals and all 4 use cases.
- `signing` and `workspace` canonical scenes plus `webform_intake` and `portal_clear_idv` use-case scenes have full 1:1 beat-to-state mapping (no stalls).

---

*Audit generated 2026-04-28. Save location: `/Users/patrickmeyer/Documents/Claude/Projects/TGK 2.0/_audits/story-demo-audit-2026-04-28.md`.*
