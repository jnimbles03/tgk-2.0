#!/usr/bin/env python3
"""
Build HTML vignette demos from extracted flipbook stills.

For each folder under /flipbooks/zips/<slug>/ that contains frame_NNN.jpg,
write /flipbooks/<slug>.html by substituting tokens into the master
template at /flipbooks/_template.html.

Also writes /flipbooks/index.html that links to each vignette with a
first-frame thumbnail.

Edit visual chrome in _template.html, edit per-demo metadata in this
file, then re-run.
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ZIPS = ROOT / "zips"
TEMPLATE_PATH = ROOT / "_template.html"

# --- Per-demo metadata --------------------------------------------------------
# slug must match the folder name under /flipbooks/zips/.
# title is shown at the top of the vignette.
# blurb is a one-paragraph caption under the stage.
# tag is a short pill (e.g., "Identity", "Workspaces").

DEMOS = [
    {
        "slug": "Web_Forms_Demo_Tally_Bank",
        "title": "Web Forms — Tally Bank intake",
        "tag": "Intake",
        "blurb": (
            "A customer-branded webform captures structured intake data, "
            "validates it inline, and hands a clean payload to Maestro for "
            "downstream packaging. No PDF round-trips, no rekeying."
        ),
    },
    {
        "slug": "Maestro_Workflow_Templates",
        "title": "Maestro Workflow Templates",
        "tag": "Orchestration",
        "blurb": (
            "Maestro turns a sketched-out process into a live workflow: "
            "branching, fan-out, conditional steps, and audit-friendly "
            "templates that admins can clone instead of rebuild."
        ),
    },
    {
        "slug": "CLEAR_IAL2_Returning_User",
        "title": "CLEAR — IAL2 returning user",
        "tag": "Identity",
        "blurb": (
            "A returning customer reuses their CLEAR identity to clear an "
            "IAL2 step-up in seconds — no document upload, no support call. "
            "The relying party sees a verified assertion, nothing more."
        ),
    },
    {
        "slug": "ID_me_Member_Autenticaiton_IAL2",
        "title": "ID.me — member authentication (IAL2)",
        "tag": "Identity",
        "blurb": (
            "An ID.me member completes IAL2 authentication into a tenant "
            "portal. Existing credential, existing trust framework — the "
            "tenant simply consumes the verified identity."
        ),
    },
    {
        "slug": "IDVerse_Demo",
        "title": "IDVerse — document + biometric verification",
        "tag": "Identity",
        "blurb": (
            "Government-issued ID capture, liveness check, and biometric "
            "match all happen inline. Output: a high-assurance identity "
            "signal bound to the agreement."
        ),
    },
    {
        "slug": "Navigator_Demo_Video",
        "title": "Navigator — agreement intelligence",
        "tag": "Search & Ask",
        "blurb": (
            "Every signed agreement becomes searchable and queryable. Ask "
            "Navigator about a clause, an obligation, or a counterparty — "
            "answers come back grounded in the actual documents."
        ),
    },
    {
        "slug": "Docusign_AI_Assisted_Review_in_IAM_Promo_Video",
        "title": "AI-Assisted Review in IAM",
        "tag": "AI Review",
        "blurb": (
            "Iris flags risky language, deviations from playbook, and "
            "missing clauses before the agreement leaves your hands. "
            "Reviewers triage; Iris drafts."
        ),
    },
    {
        "slug": "Workspaces_Demo_Video",
        "title": "Workspaces — multi-party collaboration",
        "tag": "Workspaces",
        "blurb": (
            "A persistent shared room for an agreement: every party, every "
            "task, every artifact in one place. Replaces email threads "
            "with a system of record for the relationship."
        ),
    },
    {
        "slug": "Docusign_Monitor",
        "title": "Docusign Monitor — risk surveillance",
        "tag": "Audit & Monitor",
        "blurb": (
            "Monitor watches account activity for anomalies — bulk sends "
            "from new IPs, off-hours admin changes, unusual envelope "
            "volumes — and surfaces them before they become incidents."
        ),
    },
    {
        "slug": "Data_Verification_External_Demo",
        "title": "Data Verification — third-party checks",
        "tag": "Audit & Monitor",
        "blurb": (
            "Inline data verification against external sources (KYB, "
            "sanctions, credit bureaus) so the deal data is trustworthy "
            "before it's countersigned, not after."
        ),
    },
    {
        "slug": "DocuSign_CLM_Procurement_Demo_Video",
        "title": "CLM — procurement agreements",
        "tag": "CLM",
        "blurb": (
            "End-to-end CLM walkthrough on a procurement agreement: "
            "request, draft, negotiate, approve, sign, store. Every "
            "stage is templated and tracked."
        ),
    },
    {
        "slug": "Vendor_Agreement_Management_Renewals_Demo",
        "title": "Vendor agreement management & renewals",
        "tag": "CLM",
        "blurb": (
            "Vendor renewals don't sneak up on you — Navigator surfaces "
            "expiring agreements, Maestro routes them for review, and the "
            "renewal closes inside the same workspace."
        ),
    },
    {
        "slug": "IAM_for_Sales_and_Agentforce_Demo",
        "title": "IAM for Sales — Agentforce origination",
        "tag": "Sales",
        "blurb": (
            "From inside Salesforce, Agentforce launches a Docusign "
            "agreement at the right opportunity stage, pre-filled from "
            "CRM data. Reps stop assembling packets; Agentforce does."
        ),
    },
]


# --- Template loading + rendering --------------------------------------------
# Visual chrome lives in /flipbooks/_template.html. We read it once and
# substitute {{TOKEN}} placeholders. A simple str.replace beats str.format
# here because the template's CSS/JS contains many literal { } characters.

def _load_template() -> str:
    if not TEMPLATE_PATH.is_file():
        raise SystemExit(f"Missing template file: {TEMPLATE_PATH}")
    return TEMPLATE_PATH.read_text(encoding="utf-8")


def _render(tpl: str, **tokens: str) -> str:
    out = tpl
    for k, v in tokens.items():
        out = out.replace("{{" + k + "}}", str(v))
    return out


# --- Index template -----------------------------------------------------------
# The index is small + only built by this script, so it stays inlined.

INDEX_TPL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Demo flipbooks | Docusign IAM</title>
<meta name="description" content="High-fidelity still walkthroughs of every Docusign IAM demo.">
<link rel="icon" type="image/svg+xml" href="../assets/favicon/favicon-32.svg">
<style>
@font-face {
  font-family: "DSIndigo";
  src: url("https://docucdn-a.akamaihd.net/olive/fonts/3.1.0/DSIndigo-Regular.woff2") format("woff2");
  font-weight: 400; font-display: swap;
}
@font-face {
  font-family: "DSIndigo";
  src: url("https://docucdn-a.akamaihd.net/olive/fonts/3.1.0/DSIndigo-Semibold.woff2") format("woff2");
  font-weight: 600; font-display: swap;
}
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --ds-cobalt:#4C00FF;
  --ds-inkwell:#130032;
  --ds-deep-violet:#26065D;
  --ds-mist:#CBC2FF;
  --ds-ecru:#F8F3F0;
  --ds-white:#FFFFFF;
  --line:rgba(19,0,50,0.10);
  --line-strong:rgba(19,0,50,0.18);
  --ink-mid:#4A3E6B;
  --ink-soft:#6E6189;
  --brand:"DSIndigo","Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
}

*,*::before,*::after { box-sizing:border-box; }
html,body { margin:0; padding:0; }
body {
  font-family:var(--brand);
  background:var(--ds-ecru);
  color:var(--ds-inkwell);
  -webkit-font-smoothing:antialiased;
  min-height:100vh;
}

header.top {
  padding:18px 28px; background:var(--ds-white); border-bottom:1px solid var(--line);
  display:flex; align-items:center; gap:16px;
}
header.top .iris {
  display:inline-flex; align-items:center; gap:10px;
  font-weight:600; color:var(--ds-deep-violet); font-size:15px;
}
header.top .iris svg { width:26px; height:26px; }
header.top .crumb { color:var(--ink-mid); font-size:13px; }
header.top .crumb a { color:var(--ink-mid); text-decoration:none; }
header.top .crumb a:hover { color:var(--ds-cobalt); }

.lede { max-width:1180px; margin:36px auto 18px; padding:0 28px; }
.lede h1 { margin:0 0 8px; font-size:32px; font-weight:600; letter-spacing:-0.01em; }
.lede p { margin:0; color:var(--ink-mid); font-size:16px; line-height:1.55; max-width:780px; }
.lede .meta { margin-top:14px; font-size:13px; color:var(--ink-soft); font-variant-numeric:tabular-nums; }

.grid {
  max-width:1180px; margin:24px auto 56px; padding:0 28px;
  display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:22px;
}
.card {
  background:var(--ds-white); border:1px solid var(--line); border-radius:14px;
  overflow:hidden; text-decoration:none; color:inherit;
  transition:transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
  display:flex; flex-direction:column;
}
.card:hover {
  transform:translateY(-2px);
  box-shadow:0 14px 30px -22px rgba(19,0,50,0.45);
  border-color:var(--ds-cobalt);
}
.card .thumb {
  aspect-ratio:16/9; background:var(--ds-inkwell);
  display:flex; align-items:center; justify-content:center; overflow:hidden;
  position:relative;
}
.card .thumb img { width:100%; height:100%; object-fit:cover; display:block; }
.card .thumb .play {
  position:absolute; right:10px; bottom:10px;
  background:rgba(255,255,255,0.92); color:var(--ds-cobalt);
  border-radius:999px; width:34px; height:34px;
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 4px 12px -4px rgba(19,0,50,0.4);
}
.card .thumb .play svg { width:14px; height:14px; }
.card .body { padding:14px 16px 16px; }
.card .row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
.card .pill {
  padding:3px 8px; border-radius:999px;
  background:rgba(203,194,255,0.3);
  color:var(--ds-deep-violet);
  font-size:10px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase;
  border:1px solid rgba(76,0,255,0.18);
}
.card .pill.stage-pill {
  background:linear-gradient(135deg,rgba(255,82,82,0.18),rgba(76,0,255,0.18));
  color:var(--ds-cobalt);
  border-color:rgba(76,0,255,0.32);
}
.card .frames { font-size:11px; color:var(--ink-soft); font-variant-numeric:tabular-nums; }
.card h3 { margin:0 0 6px; font-size:16px; font-weight:600; line-height:1.3; }
.card p { margin:0; font-size:13px; line-height:1.45; color:var(--ink-mid); }

.card .thumb.stage-thumb { background:linear-gradient(135deg,#26065D 0%,#130032 100%); }
.card .stage-overlay {
  position:absolute; inset:0;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;
  background:linear-gradient(135deg,rgba(38,6,93,0.55) 0%,rgba(19,0,50,0.65) 100%);
  pointer-events:none;
}
.card .stage-label {
  font-size:11px; font-weight:600; letter-spacing:0.10em; text-transform:uppercase;
  color:#fff; padding:5px 14px; border-radius:999px;
  background:linear-gradient(135deg,#FF5252,#4C00FF);
  box-shadow:0 6px 18px -8px rgba(76,0,255,0.6);
}
.card .stage-beats {
  font-size:11px; color:rgba(255,255,255,0.85); font-variant-numeric:tabular-nums;
}

footer { padding:24px 28px; text-align:center; color:var(--ink-soft); font-size:12px; }
footer a { color:var(--ds-deep-violet); text-decoration:none; }
footer a:hover { text-decoration:underline; }
</style>
</head>
<body>

<header class="top">
  <span class="iris" aria-label="Docusign IAM">
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="#4C00FF" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4" fill="#4C00FF"/>
    </svg>
    Docusign IAM
  </span>
  <span class="crumb"><a href="../index-unified.html">TGK</a> &nbsp;/&nbsp; Flipbooks</span>
</header>

<section class="lede">
  <h1>Demo flipbooks</h1>
  <p>High-fidelity still walkthroughs of every Docusign IAM demo. Use these as drill-down content inside Headless IAM portals or as standalone vignettes when a live iframe is too heavy.</p>
  <div class="meta">{{COUNT}} flipbooks &middot; {{TOTAL_FRAMES}} total frames &middot; chrome lives in <code>_template.html</code></div>
</section>

<section class="grid">
{{CARDS}}
</section>

<footer>
  Source MP4s in <code>/flipbooks/vids/</code> &middot; Stills in <code>/flipbooks/zips/&lt;slug&gt;/</code> &middot; Trimmed marketing frames in <code>/flipbooks/_trimmed/</code>.
  <br>Re-run <code>_build_vignettes.py</code> to rebuild vignettes from <code>_template.html</code>.
</footer>

</body>
</html>
"""

CARD_TPL = """<a class="card" href="./{slug}.html">
    <div class="thumb">
      <img src="./zips/{slug}/{first}" alt="{title_attr} — first frame" loading="lazy">
      <span class="play" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
      </span>
    </div>
    <div class="body">
      <div class="row">
        <span class="pill">{tag}</span>
        <span class="frames">{frames} frames</span>
      </div>
      <h3>{title}</h3>
      <p>{blurb}</p>
    </div>
  </a>"""


# --- Stage demos --------------------------------------------------------------
# Stages are HTML-scene-driven sibling pages (slug + "_stage.html") that pair
# with a flipbook for the same demo. The flipbook is the frame-by-frame
# fallback; the stage is the high-fidelity HTML walkthrough with cursor +
# beat callouts powered by /assets/demo-stage/.
#
# Authoring convention (option 3 — promoted into the master template):
#   /flipbooks/<slug>_stage.html         — fully self-contained stage page
#   /flipbooks/_stage_template.html      — skeleton/reference for new stages
#   /assets/demo-stage/{css,js}          — shared player primitive
#
# Existing stages were authored as full standalone pages (the Salesforce/Coupa
# product chrome is too bespoke per-demo to template). Register them here so
# they appear in /flipbooks/index.html and /flipbooks/manifest.json.

STAGES = [
    {
        "slug": "IAM_for_Sales_and_Agentforce_Demo",
        "title": "IAM for Sales — Agentforce origination",
        "tag": "Sales",
        "blurb": (
            "9 HTML scenes — Salesforce opportunity → Agentforce panel → "
            "Workflow picker → cast hand-off → AI-Assisted Review → customer "
            "Iris Q&A → Navigator → Seller Home → Agentforce renewal Q. "
            "4:15 of beat-by-beat product UI, no video."
        ),
        "beats": 9,
        "duration": "4:15",
    },
    {
        "slug": "DocuSign_CLM_Procurement_Demo_Video",
        "title": "Drilling MSA — Black Mesa × Tritan",
        "tag": "Procurement",
        "blurb": (
            "6 HTML scenes — Coupa supplier record → Maestro Agreement Desk "
            "routing → AI-Assisted Review on the Drilling MSA Playbook → "
            "multi-party signing → Navigator with obligations extracted → "
            "Coupa receives renewal task. 3:00 of round-trip CLM."
        ),
        "beats": 6,
        "duration": "3:00",
    },
]

STAGE_CARD_TPL = """<a class="card" href="./{slug}_stage.html">
    <div class="thumb stage-thumb">
      <img src="./zips/{slug}/{first}" alt="{title_attr} — first frame" loading="lazy" style="opacity:0.55;">
      <span class="stage-overlay" aria-hidden="true">
        <span class="stage-label">HTML stage</span>
        <span class="stage-beats">{beats} beats &middot; {duration}</span>
      </span>
      <span class="play" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
      </span>
    </div>
    <div class="body">
      <div class="row">
        <span class="pill stage-pill">{tag} &middot; Stage</span>
        <span class="frames">{beats} beats</span>
      </div>
      <h3>{title}</h3>
      <p>{blurb}</p>
    </div>
  </a>"""


def list_frames(folder: Path) -> list[str]:
    """Return sorted frame_*.jpg/.png filenames inside folder."""
    if not folder.is_dir():
        return []
    files = [f.name for f in folder.iterdir() if re.match(r"frame_\d+\.(jpg|jpeg|png)$", f.name, re.I)]
    return sorted(files)


def build():
    if not ZIPS.is_dir():
        raise SystemExit(f"Missing folder: {ZIPS}")

    tpl = _load_template()

    built = []
    skipped = []

    for demo in DEMOS:
        slug = demo["slug"]
        folder = ZIPS / slug
        frames = list_frames(folder)
        if not frames:
            skipped.append((slug, "no frames"))
            continue

        srcs = [f"./zips/{slug}/{f}" for f in frames]
        frames_json = "[" + ",".join(f'"{s}"' for s in srcs) + "]"
        first_src = srcs[0]
        total = len(frames)
        ext = frames[0].split(".")[-1]
        pad = len(re.match(r"frame_(\d+)", frames[0]).group(1))
        frame_basename = f"frame_{'N' * pad}.{ext}"

        page = _render(
            tpl,
            TITLE=html.escape(demo["title"]),
            BLURB=html.escape(demo["blurb"]),
            BLURB_ATTR=html.escape(demo["blurb"], quote=True),
            TAG=html.escape(demo["tag"]),
            FIRST_SRC=html.escape(first_src, quote=True),
            TOTAL=str(total),
            FRAMES_JSON=frames_json,
            FRAME_BASENAME=html.escape(frame_basename),
        )

        out = ROOT / f"{slug}.html"
        out.write_text(page, encoding="utf-8")
        built.append((slug, total))

    # Build index — stage cards first (the high-fidelity stuff), then flipbooks
    cards = []
    total_frames = 0

    for stage in STAGES:
        slug = stage["slug"]
        frames = list_frames(ZIPS / slug)
        first = frames[0] if frames else "frame_001.jpg"
        cards.append(
            STAGE_CARD_TPL.format(
                slug=slug,
                first=first,
                title=html.escape(stage["title"]),
                title_attr=html.escape(stage["title"], quote=True),
                blurb=html.escape(stage["blurb"]),
                tag=html.escape(stage["tag"]),
                beats=stage["beats"],
                duration=stage["duration"],
            )
        )

    for demo in DEMOS:
        slug = demo["slug"]
        frames = list_frames(ZIPS / slug)
        if not frames:
            continue
        total_frames += len(frames)
        cards.append(
            CARD_TPL.format(
                slug=slug,
                first=frames[0],
                title=html.escape(demo["title"]),
                title_attr=html.escape(demo["title"], quote=True),
                blurb=html.escape(demo["blurb"]),
                tag=html.escape(demo["tag"]),
                frames=len(frames),
            )
        )

    index = _render(
        INDEX_TPL,
        COUNT=str(len([d for d in DEMOS if list_frames(ZIPS / d["slug"])])),
        TOTAL_FRAMES=str(total_frames),
        CARDS="\n".join(cards),
    )
    (ROOT / "index.html").write_text(index, encoding="utf-8")

    # --- Emit /flipbooks/manifest.json -------------------------------------
    # Anything elsewhere in TGK 2.0 (story-shell hotspots, scene templates,
    # Headless IAM portals) can fetch this manifest to discover available
    # flipbooks programmatically. Paths are relative to /flipbooks/.
    manifest = {
        "version": 1,
        "generated_by": "_build_vignettes.py",
        "total_flipbooks": 0,
        "total_frames": 0,
        "embed_params": {
            "embed": "1 strips chrome (use inside iframe)",
            "autoplay": "1 starts playback on load",
            "loop": "1 cycles forever instead of stopping at end",
            "start": "N jumps to frame N (1-based)",
            "speed": "ms inter-frame delay (default 1000)",
        },
        "flipbooks": [],
    }
    for demo in DEMOS:
        slug = demo["slug"]
        frames = list_frames(ZIPS / slug)
        if not frames:
            continue
        manifest["flipbooks"].append({
            "slug": slug,
            "title": demo["title"],
            "tag": demo["tag"],
            "blurb": demo["blurb"],
            "url": f"./{slug}.html",
            "embed_url": f"./{slug}.html?embed=1",
            "first_frame": f"./zips/{slug}/{frames[0]}",
            "frames_dir": f"./zips/{slug}/",
            "frame_count": len(frames),
        })
    manifest["total_flipbooks"] = len(manifest["flipbooks"])
    manifest["total_frames"] = sum(fb["frame_count"] for fb in manifest["flipbooks"])

    # Stages — register HTML-scene-driven sibling pages
    manifest["stages"] = []
    for stage in STAGES:
        manifest["stages"].append({
            "slug": stage["slug"],
            "title": stage["title"],
            "tag": stage["tag"],
            "blurb": stage["blurb"],
            "beats": stage["beats"],
            "duration": stage["duration"],
            "url": f"./{stage['slug']}_stage.html",
            "embed_url": f"./{stage['slug']}_stage.html?embed=1",
        })
    manifest["total_stages"] = len(manifest["stages"])

    (ROOT / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )

    print(f"Built {len(built)} vignette pages from {TEMPLATE_PATH.name}:")
    for slug, n in built:
        print(f"  - {slug}.html ({n} frames)")
    if skipped:
        print(f"\nSkipped {len(skipped)}:")
        for slug, why in skipped:
            print(f"  - {slug} ({why})")
    print(f"\nRegistered {len(STAGES)} HTML stages (option 3 — manually authored, not regenerated):")
    for stage in STAGES:
        out = ROOT / f"{stage['slug']}_stage.html"
        present = "✓" if out.exists() else "✗ MISSING"
        print(f"  {present} {stage['slug']}_stage.html ({stage['beats']} beats · {stage['duration']})")
    print(f"\nWrote /flipbooks/index.html with {len(cards)} cards · {total_frames} flipbook frames + {len(STAGES)} stages.")
    print(f"Wrote /flipbooks/manifest.json with {manifest['total_flipbooks']} flipbooks + {manifest['total_stages']} stages.")


if __name__ == "__main__":
    build()
