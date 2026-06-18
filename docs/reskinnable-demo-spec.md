# Re-skinnable Animated Demo — Build Spec

**Date:** 2026-06-07
**Goal:** One demo format the whole library converges on — animated HTML where a
cursor moves and clicks through real-looking product UI, narration runs in a
left sidebar, and **swapping vertical / logo / point-solution is a data edit**,
not a rebuild.

This spec defines the contract and the build order. It is grounded in two things
that already exist in the repo: the **`assets/demo-stage/` player** (the
"narrative left, demo right" shell with a virtual clock, cursor overlay, and
sidebar painters) and the **`builder/` Studio pipeline** (MP4 → themeable
animated HTML). The job here is to converge on them, not invent a third system.

A working proof of this spec ships alongside it:
`docs/experiments/reskinnable-webform-demo.html` — the Web Forms intake block,
re-skinning live across Banking and Healthcare.

---

## 1. The format decision

Two demo substrates exist in the repo. Only one is re-skinnable:

| Substrate | Fidelity | Re-skinnable? | Role going forward |
|---|---|---|---|
| **Flipbooks** (rasterized JPG frames) | Pixel-perfect | **No** — you can't swap a logo inside a JPG | Fallback / reference layer |
| **DOM-replay scenes** (reconstructed HTML) | High, and gets better | **Yes** — logo/copy/colors are live DOM | **The target format** |

**Decision:** the target is **DOM-replay scenes played by the demo-stage shell.**
Flipbooks stay useful as a fidelity reference and as a fallback technique (frame
crossfade / static-bg overlay) for clips not worth fully reconstructing.

---

## 2. The four-file contract

Every demo is four JSON-ish payloads. The first two are the **shared spine**
(authored once per block); the last two are the **skin** (one set per vertical).

```
structure.json   ← DOM scaffold for each scene. Vertical-AGNOSTIC.
timeline.json    ← beats + cursorTrack (geometry + timing). Vertical-AGNOSTIC.
content.json     ← copy, logos, persona, point-solution names, field labels,
                   field values, narration strings. ONE PER VERTICAL.
theme.json       ← tenant accent, fonts, surface colors, SoR badge. ONE PER VERTICAL.
```

**A vertical swap = swap `content.json` + `theme.json`. Nothing else moves.**
That is the whole thesis ("lego block + skin") made literal.

### 2.1 `structure.json` (shared)
The semantic DOM tree per scene — containers, field rows, buttons, modals —
with **slot ids** but no text. Studio's EXTRACT stage already emits this.
Example slot: a field row is `{ id: "field.fullName", type: "labeled-input" }`;
the label and value come from content, not structure.

### 2.2 `timeline.json` (shared)
```jsonc
{
  "totalDuration": 38,
  "beats": [
    { "t": 0,  "key": "open",     "sceneId": "form" },
    { "t": 8,  "key": "prefill",  "sceneId": "form" },
    { "t": 18, "key": "validate", "sceneId": "form" },
    { "t": 30, "key": "submit",   "sceneId": "handoff" }
  ],
  "cursorTrack": [
    { "t": 2,  "x": 880, "y": 300, "action": "move" },
    { "t": 8,  "x": 740, "y": 300, "action": "click", "sayKey": "prefill",
      "fill": { "field": "fullName", "valueKey": "applicantName" } },
    { "t": 30, "x": 980, "y": 150, "action": "click", "sayKey": "submit" }
  ]
}
```
- `x`/`y` are normalized to the **1280×720** reference (demo-stage scales it).
- `action: "click"` triggers the cursor pulse.
- `fill` drives a typed/auto-populated field — value pulled from content by key.
- `sayKey` points at a narration string in content (see 2.3).

> **Refinement over today's demo-stage:** the current shell stores narration
> inline on `cursorTrack[i].say`. For true re-skinning, **move the narration
> strings into `content.json` and reference them by `sayKey`**, so the timeline
> carries geometry only and stays vertical-agnostic. The player resolves
> `sayKey → content.say[key]` at paint time. This is a small, backward-compatible
> change to `paintCallout()` (fall back to inline `say` if no `sayKey`).

### 2.3 `content.json` (per vertical)
```jsonc
{
  "brand":        { "name": "Tally Bank", "logoText": "Tally", "poweredBy": "Powered by Docusign" },
  "pointSolution":"AI-Assisted Web Forms",
  "sorBadge":     "System of record · nCino",
  "persona":      { "name": "Sarah Connelly", "role": "Relationship Manager", "side": "advisor" },
  "formTitle":    "Open your Tally Premier account",
  "fields": [
    { "id": "fullName", "label": "Full legal name" },
    { "id": "ssn",      "label": "SSN / TIN" }
  ],
  "values":       { "applicantName": "Sam Smith", "ssn": "•••-••-1234" },
  "say": {
    "open":     { "eyebrow": "Web Forms", "title": "Sam starts his application",
                  "body": "A branded web form, generated from the bank's PDF in one click." },
    "prefill":  { "eyebrow": "Iris AI",   "title": "Fields pre-fill themselves",
                  "body": "Known customer data flows in. No re-keying." },
    "submit":   { "eyebrow": "Handoff",   "title": "Straight into the agreement",
                  "body": "Clean data hands off to eSignature and the core." }
  }
}
```

### 2.4 `theme.json` (per vertical)
```jsonc
{
  "--tenant-accent":      "#2557D6",
  "--tenant-accent-soft": "#EAF0FE",
  "--tenant-ink":         "#0B1F4D",
  "--font-brand":         "'Inter', system-ui, sans-serif"
}
```
Applied as CSS custom properties on the stage root. The structure references
only these vars, never hard-coded colors — so the skin is total.

---

## 3. The player

Keep `assets/demo-stage/demo-stage.{css,js}` as the single player. It already
provides: virtual clock, `.ds-cursor` overlay (1280×720 ref, interp + click
pulse), scenes-mode scaling, the left sidebar painters
(`#ds-step-label / #ds-headline / #ds-lede / #ds-persona / #ds-beat-pips /
#ds-progress-fill / #ds-timer`), beat strip, keyboard scrubbing, and `?beat=N`
deep-links. Two small additions:

1. **`sayKey` resolution** (§2.2) — resolve narration from content by key.
2. **`fill` primitive** — on a `cursorTrack` entry with `fill`, populate the
   target slot's value (instant for "auto" fields, char-typed for "typed"
   fields). Maps to Studio's existing `type_paste` / `type_char` primitives.

No new player; these are additive.

---

## 4. Production path (Studio)

Studio (`builder/`) already converts MP4 → this format end-to-end, but its four
model stages (TRIAGE / CLASSIFY / EXTRACT / RENDER) run in **fake mode** until
`GEMINI_API_KEY` is wired. Sequence:

1. **Lock the contract** (this doc) and the player additions in §3.
2. **Wire Gemini** into the four stubbed stages so EXTRACT emits real
   `structure/content/theme` and RENDER emits a demo-stage-compatible scene file.
3. **Constrain EXTRACT** to the slot vocabulary so every output is re-skinnable
   (vendor-specific segments already forced to DOM-replay technique 1).
4. **Author a content-pack picker** — a dropdown that swaps `content.json` +
   `theme.json` at runtime (the proof file demonstrates exactly this).

---

## 5. Conversion order (leverage-first)

Convert the **recurring point-solution blocks first** — one conversion re-skins
across all ~60 grid cells. Vertical-specific demos stay as content packs on a
shared spine.

| Priority | Block | Why first |
|---|---|---|
| 1 | **Web Forms intake** | Scene-1 of nearly every onboarding flow. *(proof built)* |
| 2 | **IDV** (CLEAR / ID.me / Apple Wallet) | FINS + HLS + PubSec onboarding; clean click moments |
| 3 | **eSignature** | Universal across all 60 cells; simplest DOM |
| 4 | **Workflow Builder / Agreement Desk** | Orchestration spine; richest UI, convert once |
| 5 | **Workspaces** | Scene-5 close; shared across verticals |

Marketing-only clips (e.g. the Agentforce promo) are **not** reconstructed —
wrap them as frame-background + cursor/narration overlay (demo-stage video mode).

---

## 6. Definition of done (per block)
- Plays on the demo-stage shell with cursor + sidebar narration.
- Re-skins across ≥2 verticals via content/theme swap only — zero structure edits.
- Beats scrub; `?beat=N` deep-links; embeds clean under `?embed=1`.
- Registered in `flipbooks/manifest.json` (or a successor `demos/manifest.json`)
  so it appears in the picker/builder media pool.
