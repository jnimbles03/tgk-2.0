# Flipbooks → Stories / Scenes / Vignettes — Integration Guide

This folder produces 13 self-contained, in-product flipbook vignettes from the demo MP4s. Each is built from `_template.html` by `_build_vignettes.py` and lives at `/flipbooks/<slug>.html`.

The goal of this doc: explain how a future scene, vignette, or Headless IAM drill-down picks up a flipbook *without anyone having to know how the player is implemented*.

---

## The hierarchy (as it stands today)

```
Story  (vertical, e.g. fins / hls / ps / banking-deposits / wealth)
  └── Scene  (one of 5 — Agreement Desk, CLEAR, Signing, Navigator, Workspace)
        └── Vignette / hotspot  (a moment in the scene with narration + a target)
              └── Drill-down content  (currently: live iframe of a Docusign template)
```

Today every drill-down is a **live iframe** of a Docusign template under `/story-templates/` (e.g. `docusign-clear-idv.html?preset=hillside`). The Headless IAM plan calls for a second drill-down mode: **flipbook walk-through** of stills. This folder is the source of those flipbooks.

---

## How a scene/vignette/portal pulls in a flipbook

### Option A — iframe the embed URL (preferred)

Every flipbook supports `?embed=1`, which strips the topbar / title block / footer so only the player chrome remains. Drop the iframe wherever a hotspot drill-down currently iframes a Docusign template:

```html
<iframe
  src="../flipbooks/Docusign_Monitor.html?embed=1&autoplay=1&loop=1"
  title="Monitor flipbook"
  allowfullscreen
  style="width:100%;height:100%;border:0;background:transparent;">
</iframe>
```

Supported URL params:

| Param      | Effect |
|------------|--------|
| `embed=1`  | Strips topbar / title / footer. Use this whenever the flipbook is inside an iframe. |
| `autoplay=1` | Starts playback as soon as the page loads. |
| `loop=1`   | Cycles forever. Default is to stop at the last frame. |
| `start=N`  | Jumps to frame N (1-based). Useful for deep-linking to a specific moment. |
| `speed=ms` | Inter-frame delay. Default `1000` (1×). `500`=2×, `250`=4×. |

### Option B — read the manifest and let code pick

`/flipbooks/manifest.json` is regenerated on every build. It's an authoritative list of available flipbooks with metadata and embed URLs:

```json
{
  "version": 1,
  "total_flipbooks": 13,
  "total_frames": 306,
  "flipbooks": [
    {
      "slug": "Docusign_Monitor",
      "title": "Docusign Monitor — risk surveillance",
      "tag": "Audit & Monitor",
      "blurb": "Monitor watches account activity for anomalies …",
      "url": "./Docusign_Monitor.html",
      "embed_url": "./Docusign_Monitor.html?embed=1",
      "first_frame": "./zips/Docusign_Monitor/frame_001.jpg",
      "frame_count": 38
    }
    …
  ]
}
```

Story-shell code can fetch this once and:
- Render a flipbook picker.
- Resolve a slug to the right URL.
- Show a thumbnail (`first_frame`) without hard-coding paths.
- Filter by `tag` (Identity / Workspaces / etc.) when building a scene.

### Option C — link to the standalone page

Same URL without `?embed=1` opens the full vignette page (with topbar, title, blurb). Use this from anywhere a user is browsing — `index-unified.html` cards, the audit page, an email, etc.

---

## Scene → flipbook mapping

This is the mapping called out in the Headless IAM plan (`_audits/headless-iam-plan-2026-04-28.md`). Use it as the default when wiring drill-downs. A scene can pull more than one flipbook if needed.

| Scene / moment       | Default flipbook(s)                               |
|---|---|
| Intake               | `Web_Forms_Demo_Tally_Bank`, `Maestro_Workflow_Templates` |
| Identity             | `CLEAR_IAL2_Returning_User`, `ID_me_Member_Autenticaiton_IAL2`, `IDVerse_Demo` |
| Signing              | *(no flipbook — scene uses live `docusign-signing-ceremony.html`)* |
| Search & Ask         | `Navigator_Demo_Video`, `Docusign_AI_Assisted_Review_in_IAM_Promo_Video` |
| Workspace            | `Workspaces_Demo_Video` |
| Audit & Monitor      | `Docusign_Monitor`, `Data_Verification_External_Demo` |
| FINS — IAM for Sales | `IAM_for_Sales_and_Agentforce_Demo` |
| HLS / PS — CLM       | `DocuSign_CLM_Procurement_Demo_Video`, `Vendor_Agreement_Management_Renewals_Demo` |

---

## Worked example — adding a flipbook drill-down to a story-shell hotspot

Today, hotspot config in a scene looks roughly like this (illustrative):

```js
{
  id: 'monitor-anomaly',
  scene: 'audit-monitor',
  narration: 'Monitor surfaces an off-hours bulk send.',
  drilldown: {
    type: 'iframe',
    src: '../story-templates/docusign-monitor.html?preset=hillside'
  }
}
```

To swap (or add) a flipbook drill-down, change `drilldown` to point at the flipbook's embed URL:

```js
{
  id: 'monitor-anomaly',
  scene: 'audit-monitor',
  narration: 'Monitor surfaces an off-hours bulk send.',
  drilldown: {
    type: 'flipbook',
    slug: 'Docusign_Monitor',
    src: '../flipbooks/Docusign_Monitor.html?embed=1&autoplay=1&start=15'
  }
}
```

The story-shell renders both `type: 'iframe'` and `type: 'flipbook'` the same way (an iframe in a modal). `type` is just metadata so you can later swap modes (e.g., a "view flipbook" button vs. "open live demo" button).

---

## Adding a new flipbook later

The MP4 → stills → flipbook HTML loop is wired into two committed scripts so a new HTML demo can be made without re-deriving the ffmpeg invocation each time.

### Fast path — `_new_flipbook.py` (recommended)

End-to-end scaffold from a fresh MP4. Drop the source into `/flipbooks/vids/<slug>.MP4` (or pass `--src` explicitly), then:

```bash
python3 flipbooks/_new_flipbook.py <slug> \
    --title "Long form title shown on the vignette page" \
    --tag "Identity" \
    --blurb "One paragraph describing what the demo proves." \
    --scene clear-idv     # optional — picks the right INTEGRATION.md row
```

Pass `--interactive` to be prompted for the metadata. The script:

1. Calls `_extract_frames.py` to populate `zips/<slug>/frame_NNN.jpg` and `contact_sheets/<slug>.jpg`.
2. Prints (to stdout) a `DEMOS` dict snippet to paste into `_build_vignettes.py`.
3. Prints (to stdout) a suggested row for the **scene → flipbook** table in this doc.
4. Reminds you of the manual steps that still follow (trim audit, build).

It deliberately does *not* edit `_build_vignettes.py` for you — title/blurb/tag are copywriting calls and the snippet stays human-curated.

### Just the extraction — `_extract_frames.py`

If frames are all you need, skip the wrapper:

```bash
python3 flipbooks/_extract_frames.py <slug>                 # auto-resolves /vids/<slug>.MP4
python3 flipbooks/_extract_frames.py <slug> --src /tmp/x.mp4  # explicit source
python3 flipbooks/_extract_frames.py <slug> --fps 2           # 2× sampling
python3 flipbooks/_extract_frames.py <slug> --force           # re-extract over an existing folder
```

Idempotent — if `zips/<slug>/` already has frames, it skips extraction (still refreshes the contact sheet). Source resolution understands the existing convention where `vids/CLEAR IAL2 Returning User.MP4` matches slug `CLEAR_IAL2_Returning_User`.

### What still needs human judgment

After extraction, the contact sheet at `contact_sheets/<slug>.jpg` is your audit aid:

1. Eyeball it; flag any title slides, summary cards, or vendor marketing.
2. `mkdir -p _trimmed/<slug>/  &&  mv` the flagged frame files there.
3. Renumber survivors so `frame_001 … frame_N` is contiguous (no gaps).
4. Update `_trim_plan.json` with the indices you removed and the reason — this becomes the audit trail for future re-extractions.

### And the build

After the trim audit and pasting the `DEMOS` snippet:

```bash
python3 flipbooks/_build_vignettes.py
```

emits the new `<slug>.html`, refreshes `index.html`, and updates `manifest.json` — same idempotent build the existing 13 flipbooks come from.

---

## Why this layout

- **One template, many vignettes.** `_template.html` is the single source of visual chrome. Edits there propagate to all 13 (and all future) vignettes on the next build.
- **Self-contained pages.** Each vignette is a standalone HTML file with no external JS dependencies, so it can be iframed from anywhere — story-shell, Headless IAM portal, audit page, slack preview — without coupling.
- **Manifest as contract.** `manifest.json` is the integration seam. As long as the generator keeps emitting it, story code never has to hard-code slugs or paths.
- **In-product only.** Marketing/PowerPoint frames live in `_trimmed/` (set aside, not deleted) so the rendered flipbooks read as real product, not slideware.

---

## Files in this folder

| File | Role |
|---|---|
| `_template.html`        | Master visual shell + player JS. Edit here to restyle every flipbook. |
| `_build_vignettes.py`   | Idempotent generator. Reads template, writes vignettes + index + manifest. |
| `_extract_frames.py`    | MP4 → `zips/<slug>/frame_NNN.jpg` + `contact_sheets/<slug>.jpg`. The committed ffmpeg step. |
| `_new_flipbook.py`      | Front door for a brand-new demo. Wraps `_extract_frames` and emits the `DEMOS` snippet to paste. |
| `_trim_plan.json`       | Audit record of which frames were removed (and why) per flipbook. |
| `index.html`            | Browsable grid of all vignettes. |
| `manifest.json`         | Machine-readable list of all flipbooks for downstream code. |
| `<slug>.html`           | Individual vignette pages (the deliverable). |
| `zips/<slug>/`          | Trimmed in-product frames the vignettes reference. |
| `zips/*.zip`            | Original archives (kept for reproducibility). |
| `_trimmed/<slug>/`      | Frames removed during the marketing-slide audit. |
| `vids/`                 | Source MP4s — gitignored, too large for GitHub. |
| `contact_sheets/`       | Audit aid (regenerated by `_extract_frames.py` via ImageMagick `montage`). |

---

*Last updated 2026-04-29 — added `_extract_frames.py` and `_new_flipbook.py` so the MP4 → stills → flipbook HTML loop is one command per stage.*
