#!/usr/bin/env python3
"""
Scaffold a new flipbook end-to-end.

This is the front door for "I dropped a new MP4 in /flipbooks/vids/, what
now?" It composes the existing pieces:

  1. _extract_frames.py     → zips/<slug>/frame_NNN.jpg + contact_sheets/<slug>.jpg
  2. Generates a DEMOS dict snippet you paste into _build_vignettes.py
  3. Suggests a row to add to INTEGRATION.md's scene→flipbook table
  4. Reminds you to run the trim audit before _build_vignettes.py

It deliberately does NOT mutate _build_vignettes.py for you. The DEMOS list
is hand-curated (title/blurb/tag are copywriting decisions), so the script
prints a pasteable snippet and stops. The trim audit also stays manual —
you eyeball the contact sheet and move marketing frames into _trimmed/.

Usage
-----
    # Most common — slug matches a file in /flipbooks/vids/
    python3 flipbooks/_new_flipbook.py Workspaces_Demo_Video \
        --title "Workspaces — multi-party collaboration" \
        --tag "Workspaces" \
        --blurb "A persistent shared room for an agreement…"

    # Explicit source path
    python3 flipbooks/_new_flipbook.py renewals_pilot \
        --src /tmp/renewals.mp4 \
        --title "Renewals pilot — Q3" \
        --tag "Renewals" \
        --blurb "..." \
        --scene "navigator"

    # Interactive (prompts for title/tag/blurb/scene)
    python3 flipbooks/_new_flipbook.py renewals_pilot --interactive

The --scene flag (optional) records which canonical TGK scene this flipbook
is the default drill-down for — values match SCENE_LIBRARY in builder.html
(agreement-desk, clear-idv, signing-ceremony, navigator, workspace, webform,
maestro-loop, agents, etc). It's printed as a suggested addition to the
scene→flipbook mapping table in INTEGRATION.md.
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXTRACT = ROOT / "_extract_frames.py"
BUILD = ROOT / "_build_vignettes.py"
INTEGRATION = ROOT / "INTEGRATION.md"


# --- Scene catalog (mirrors SCENE_LIBRARY in /builder.html) -------------------
# Used to validate --scene and to suggest the right INTEGRATION.md row.
SCENES = {
    "agreement-desk":     "Agreement Desk",
    "clear-idv":          "Identity",
    "signing-ceremony":   "Signing",
    "navigator":          "Search & Ask",
    "workspace":          "Workspace",
    "webform":            "Intake",
    "webform-intake":     "Intake (queue)",
    "maestro-loop":       "Orchestration",
    "maestro-package":    "Orchestration (package)",
    "agents":             "Agents",
    "ehr-desktop":        "Clinical embed",
    "portal-shell":       "Portal",
    "agreement-desk-coc": "Custody (fraud-fabric)",
}


def prompt(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    raw = input(f"{label}{suffix}: ").strip()
    return raw or default


def slug_ok(slug: str) -> bool:
    """Match the existing convention — alnum + underscore, no spaces."""
    return bool(re.match(r"^[A-Za-z0-9][A-Za-z0-9_]*$", slug))


def py_str(s: str) -> str:
    """Format an arbitrary string as a Python-source double-quoted literal."""
    escaped = s.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def py_blurb(blurb: str, indent: str = "        ") -> str:
    """Wrap a long blurb to ~70 chars per line, formatted as a Python tuple
    of adjacent string literals (matches the existing DEMOS style)."""
    blurb = " ".join(blurb.split())  # collapse whitespace
    lines = textwrap.wrap(blurb, width=68, break_long_words=False)
    if len(lines) == 1:
        return py_str(lines[0])
    out = ["("]
    for i, line in enumerate(lines):
        suffix = " " if i < len(lines) - 1 else ""
        out.append(f"{indent}    {py_str(line + suffix)}")
    out.append(f"{indent})")
    return "\n".join(out)


def emit_demos_snippet(slug: str, title: str, tag: str, blurb: str) -> str:
    """Build the dict literal to paste into _build_vignettes.py's DEMOS list."""
    return (
        "    {\n"
        f"        \"slug\": {py_str(slug)},\n"
        f"        \"title\": {py_str(title)},\n"
        f"        \"tag\": {py_str(tag)},\n"
        f"        \"blurb\": {py_blurb(blurb)},\n"
        "    },"
    )


def emit_integration_row(slug: str, scene_id: str | None) -> str | None:
    if not scene_id or scene_id not in SCENES:
        return None
    return f"| {SCENES[scene_id]:<20} | `{slug}` |"


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("slug", help="Folder name under /flipbooks/zips/ (alnum + underscore)")
    ap.add_argument("--src", type=Path, help="Source MP4 path (auto-resolved from /flipbooks/vids/ if omitted)")
    ap.add_argument("--title", help="Vignette title (shown at top of the rendered HTML)")
    ap.add_argument("--tag", help="Short pill — Identity / Workspaces / Intake / etc.")
    ap.add_argument("--blurb", help="One-paragraph caption under the stage")
    ap.add_argument("--scene", choices=sorted(SCENES.keys()),
                    help="Canonical TGK scene this flipbook is the default drill-down for. "
                         "Used to suggest an INTEGRATION.md mapping row.")
    ap.add_argument("--fps", type=float, default=1.0, help="Sampling rate (default 1.0 fps)")
    ap.add_argument("--force", action="store_true", help="Re-extract frames even if already present")
    ap.add_argument("--interactive", action="store_true", help="Prompt for any missing metadata")
    args = ap.parse_args()

    if not slug_ok(args.slug):
        raise SystemExit(
            f"Slug '{args.slug}' has spaces or punctuation. Use alnum + underscore "
            f"(matches the existing folder convention under /flipbooks/zips/)."
        )

    title = args.title or ""
    tag   = args.tag or ""
    blurb = args.blurb or ""
    scene = args.scene or ""

    if args.interactive or not (title and tag and blurb):
        if sys.stdin.isatty():
            print(f"\nNew flipbook: {args.slug}", file=sys.stderr)
            print("Press <enter> to accept defaults; type 'q' to abort.\n", file=sys.stderr)
            title = title or prompt("title", default=args.slug.replace("_", " "))
            if title == "q": raise SystemExit("aborted")
            tag = tag or prompt("tag", default="Identity")
            if tag == "q": raise SystemExit("aborted")
            if not blurb:
                print("blurb (paste a paragraph; end with empty line):", file=sys.stderr)
                lines = []
                while True:
                    try:
                        ln = input()
                    except EOFError:
                        break
                    if ln == "":
                        break
                    lines.append(ln)
                blurb = " ".join(lines)
            if not scene and SCENES:
                scene = prompt(f"scene (one of: {', '.join(sorted(SCENES.keys()))} — blank to skip)")
                if scene and scene not in SCENES:
                    print(f"  warn: '{scene}' not a known scene; skipping mapping row.", file=sys.stderr)
                    scene = ""
        else:
            missing = [k for k, v in (("title", title), ("tag", tag), ("blurb", blurb)) if not v]
            if missing:
                raise SystemExit(
                    f"Missing required metadata: {', '.join(missing)}. "
                    f"Pass --{missing[0]} '...' or run with --interactive."
                )

    # --- Step 1: extract frames ---------------------------------------------
    print(f"\n→ step 1/3 — extracting frames for {args.slug}", file=sys.stderr)
    cmd = [sys.executable, str(EXTRACT), args.slug, "--fps", str(args.fps)]
    if args.src:
        cmd += ["--src", str(args.src)]
    if args.force:
        cmd += ["--force"]
    rc = subprocess.run(cmd).returncode
    if rc != 0:
        raise SystemExit(f"frame extraction failed (exit {rc})")

    # --- Step 2: emit DEMOS snippet -----------------------------------------
    snippet = emit_demos_snippet(args.slug, title, tag, blurb)
    print(
        f"\n→ step 2/3 — paste this into the DEMOS list in {BUILD.name}\n"
        + ("─" * 72),
        file=sys.stderr,
    )
    print(snippet)
    print("─" * 72, file=sys.stderr)

    # --- Step 3: optional INTEGRATION.md mapping row ------------------------
    row = emit_integration_row(args.slug, scene if scene else None)
    if row:
        print(
            f"\n→ step 3/3 — and add this row to the scene→flipbook table in "
            f"{INTEGRATION.name}\n" + ("─" * 72),
            file=sys.stderr,
        )
        print(row)
        print("─" * 72, file=sys.stderr)
    else:
        print(
            f"\n→ step 3/3 — no scene mapping (pass --scene <id> to suggest "
            f"an INTEGRATION.md row)",
            file=sys.stderr,
        )

    # --- Reminders ---------------------------------------------------------
    print(
        textwrap.dedent(f"""
        Next steps (manual):
          • Eyeball flipbooks/contact_sheets/{args.slug}.jpg for marketing frames.
          • mv flagged frames to flipbooks/_trimmed/{args.slug}/ and renumber.
          • Paste the snippet above into DEMOS in _build_vignettes.py.
          • python3 flipbooks/_build_vignettes.py
        """),
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
