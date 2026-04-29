#!/usr/bin/env python3
"""
Extract frame stills + a contact-sheet montage from a flipbook source MP4.

This is the committed version of the step that INTEGRATION.md previously
described as "any tool — ffmpeg's `-vf fps=1`". It wraps:

  1. ffmpeg -vf fps=<N> → frames/frame_NNN.jpg in /flipbooks/zips/<slug>/
  2. ImageMagick montage → contact_sheets/<slug>.jpg

so a new flipbook only needs the source MP4, a slug, and a single command.

Usage
-----
    # Extract from /flipbooks/vids/<slug>.MP4 (slug-with-underscores convention)
    python3 flipbooks/_extract_frames.py IAM_for_Sales_and_Agentforce_Demo

    # Or point at any source path explicitly
    python3 flipbooks/_extract_frames.py my_slug --src /path/to/source.mp4

    # Force re-extraction (default skips if zips/<slug>/ already has frames)
    python3 flipbooks/_extract_frames.py my_slug --force

    # Sample at 2 frames per second instead of 1
    python3 flipbooks/_extract_frames.py my_slug --fps 2

    # Skip the contact sheet (faster; useful in CI)
    python3 flipbooks/_extract_frames.py my_slug --no-contact-sheet

What this does NOT do
---------------------
- Trim audit (`_trim_plan.json`). After extraction, eyeball the contact
  sheet and move marketing/title frames to `_trimmed/<slug>/`, then
  renumber survivors so frame_001…frame_N is contiguous.
- Add the slug to `DEMOS` in `_build_vignettes.py`. Use
  `_new_flipbook.py` for that, or paste the snippet by hand.
- Run `_build_vignettes.py`. Run that yourself once the trim audit
  is done — the build is idempotent and fast.

Exits 0 on success, non-zero on any failure. Safe to re-run.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VIDS = ROOT / "vids"
ZIPS = ROOT / "zips"
SHEETS = ROOT / "contact_sheets"

VALID_VID_SUFFIXES = (".mp4", ".MP4", ".mov", ".MOV", ".m4v")


def find_source(slug: str, explicit: Path | None) -> Path:
    """Resolve the source MP4 for a slug.

    Tries (in order): explicit --src path, then a few likely filenames inside
    /flipbooks/vids/. Existing source MP4s in this folder use mixed
    conventions ("CLEAR IAL2 Returning User.MP4" vs the slug
    "CLEAR_IAL2_Returning_User"), so we try a few permutations.
    """
    if explicit:
        if explicit.is_file():
            return explicit
        raise SystemExit(f"--src points at a missing file: {explicit}")

    if not VIDS.is_dir():
        raise SystemExit(f"Missing folder: {VIDS}. Drop the source MP4 there or pass --src.")

    candidates: list[Path] = []
    # 1. Direct slug match (slug.MP4)
    for ext in VALID_VID_SUFFIXES:
        candidates.append(VIDS / f"{slug}{ext}")
    # 2. Slug with underscores → spaces
    spaced = slug.replace("_", " ")
    for ext in VALID_VID_SUFFIXES:
        candidates.append(VIDS / f"{spaced}{ext}")
    # 3. Substring fallback — any file whose normalized name matches
    norm_slug = slug.lower().replace("_", "").replace(" ", "").replace("-", "")
    for f in sorted(VIDS.iterdir()):
        if not f.is_file():
            continue
        if f.suffix not in VALID_VID_SUFFIXES:
            continue
        norm_name = f.stem.lower().replace("_", "").replace(" ", "").replace("-", "")
        if norm_slug == norm_name:
            candidates.append(f)

    for c in candidates:
        if c.is_file():
            return c

    listing = "\n  ".join(sorted(p.name for p in VIDS.iterdir() if p.is_file())) or "(empty)"
    raise SystemExit(
        f"Could not find a source MP4 for slug '{slug}'. Tried:\n  "
        + "\n  ".join(str(c.relative_to(ROOT)) for c in candidates[:5])
        + f"\n\nFiles in {VIDS}:\n  {listing}\n\nPass --src /absolute/path/to/source.mp4 to disambiguate."
    )


def probe_duration(src: Path) -> float:
    """Return duration in seconds via ffprobe. Returns 0.0 on failure."""
    try:
        out = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(src),
            ],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return float(out)
    except Exception:
        return 0.0


def extract_frames(src: Path, dest: Path, fps: float) -> int:
    """Run ffmpeg, return number of frames written."""
    dest.mkdir(parents=True, exist_ok=True)
    pattern = str(dest / "frame_%03d.jpg")
    cmd = [
        "ffmpeg",
        "-hide_banner", "-loglevel", "error",
        "-y",                        # overwrite (we already gated on emptiness above)
        "-i", str(src),
        "-vf", f"fps={fps}",
        "-q:v", "3",                 # JPEG quality, 2-5 is the visually-good band
        pattern,
    ]
    subprocess.run(cmd, check=True)
    frames = sorted(dest.glob("frame_*.jpg"))
    return len(frames)


def make_contact_sheet(slug: str, frames_dir: Path) -> Path | None:
    """Use ImageMagick `montage` to build a contact sheet for visual audit."""
    if shutil.which("montage") is None:
        print("note: ImageMagick `montage` not installed — skipping contact sheet.", file=sys.stderr)
        return None
    SHEETS.mkdir(parents=True, exist_ok=True)
    out = SHEETS / f"{slug}.jpg"
    frames = sorted(frames_dir.glob("frame_*.jpg"))
    if not frames:
        return None
    # 5-wide grid, thumbnail height 240px, light label below each frame.
    cmd = [
        "montage",
        *[str(f) for f in frames],
        "-tile", "5x",
        "-geometry", "+6+6",
        "-thumbnail", "320x180^",   # cover-fit
        "-gravity", "center",
        "-background", "#F8F3F0",
        "-bordercolor", "#CBC2FF",
        "-border", "1",
        "-label", "%t",
        "-font", "DejaVu-Sans",
        "-pointsize", "10",
        str(out),
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        return out
    except subprocess.CalledProcessError as e:
        print(f"contact sheet failed (non-fatal): {e.stderr.strip()[:300]}", file=sys.stderr)
        return None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug", help="Folder name under /flipbooks/zips/ — e.g. IAM_for_Sales_and_Agentforce_Demo")
    ap.add_argument("--src", type=Path, help="Explicit source MP4 path (otherwise auto-resolved from /flipbooks/vids/)")
    ap.add_argument("--fps", type=float, default=1.0, help="Frames per second to sample (default 1.0)")
    ap.add_argument("--force", action="store_true", help="Re-extract even if zips/<slug>/ already has frames")
    ap.add_argument("--no-contact-sheet", action="store_true", help="Skip the ImageMagick montage step")
    args = ap.parse_args()

    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg not found in PATH. Install: `brew install ffmpeg` or apt equivalent.")

    src = find_source(args.slug, args.src)
    dest = ZIPS / args.slug

    existing = sorted(dest.glob("frame_*.jpg")) if dest.is_dir() else []
    if existing and not args.force:
        print(
            f"ok: zips/{args.slug}/ already has {len(existing)} frames — skipping extraction.\n"
            f"    Pass --force to re-extract, or delete the folder first.",
            file=sys.stderr,
        )
        # Still regenerate contact sheet on demand
        if not args.no_contact_sheet:
            sheet = make_contact_sheet(args.slug, dest)
            if sheet:
                print(f"ok: contact sheet refreshed → {sheet.relative_to(ROOT)}", file=sys.stderr)
        return

    if existing and args.force:
        # Wipe just the frame files, leave the folder (other tooling may
        # have artifacts in it).
        for f in existing:
            f.unlink()

    duration = probe_duration(src)
    expected = max(1, int(duration * args.fps)) if duration else None
    print(f"→ extracting {src.name}", file=sys.stderr)
    print(f"  duration : {duration:.1f}s" + (f"  (≈{expected} frames @ fps={args.fps})" if expected else ""), file=sys.stderr)
    print(f"  output   : {dest.relative_to(ROOT)}/frame_NNN.jpg", file=sys.stderr)

    n = extract_frames(src, dest, args.fps)
    print(f"ok: wrote {n} frames", file=sys.stderr)

    if not args.no_contact_sheet:
        sheet = make_contact_sheet(args.slug, dest)
        if sheet:
            print(f"ok: contact sheet → {sheet.relative_to(ROOT)}", file=sys.stderr)

    # Reminder of the manual steps that still follow extraction
    print(
        "\nnext steps:\n"
        f"  1. eyeball contact_sheets/{args.slug}.jpg — note any frame numbers that\n"
        "     are title slides, summary cards, or vendor marketing.\n"
        "  2. mkdir -p _trimmed/" + args.slug + "/  &&  mv flagged frames there.\n"
        "  3. renumber the survivors so frame_001…frame_N is contiguous.\n"
        f"  4. add an entry to DEMOS in _build_vignettes.py for slug '{args.slug}'\n"
        "     (use _new_flipbook.py if you want this scaffolded for you).\n"
        "  5. python3 _build_vignettes.py  →  emits the new <slug>.html + manifest.\n",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
