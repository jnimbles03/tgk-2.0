#!/usr/bin/env python3
"""
tgk-audit — mechanical pass.

Walks TGK 2.0 HTML files and emits a JSON findings list covering the rule-based
checks from _docusign-template-spec.md. Story-arc, workspaces-coherence, point-
solution-validity, and interface-parity checks are done by the LLM pass (see
SKILL.md) — this script exists to get the deterministic stuff out of the way so
the LLM can spend its judgment budget on the hard calls.

Usage:
    python3 audit.py                       # audit every known target in the repo
    python3 audit.py <file.html> [...]     # audit specific files
    python3 audit.py --scope swim-lane     # only top-level current-vs-future assets
    python3 audit.py --scope component-current
    python3 audit.py --scope component-future
    python3 audit.py --scope index
    python3 audit.py --format markdown     # pretty punch list (default: json)

Designed to be run from the repo root or from anywhere — it resolves paths
relative to its own location.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Paths & rule loading
# ---------------------------------------------------------------------------

AUDIT_DIR = Path(__file__).resolve().parent
REPO_ROOT = AUDIT_DIR.parent
RULES_PATH = AUDIT_DIR / "rules.json"


def load_rules() -> dict[str, Any]:
    with RULES_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


# ---------------------------------------------------------------------------
# Finding model
# ---------------------------------------------------------------------------

@dataclass
class Finding:
    file: str                       # relative path from repo root
    line: int | None                # 1-indexed
    category: str                   # Brand | Voice | Icon | Structure | Points | Tags | Parity-Hint
    severity: str                   # Critical | High | Medium | Low
    message: str                    # short, actionable
    hint: str = ""                  # optional fix hint
    context: str = ""               # optional snippet

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Target discovery
# ---------------------------------------------------------------------------

SWIM_LANE_FILES = [
    "_template.html",
    "auto.html",
    "insurance-life.html",
    "insurance-pc.html",
    "wealth-onboarding.html",
    "banking-deposits.html",
]

INDEX_FILES = [
    "index.html",
    "index-playbook.html",
    "landing.html",
]

COMPONENT_CURRENT_DIR = REPO_ROOT / "components" / "current-state"
COMPONENT_FUTURE_DIR = REPO_ROOT / "components" / "future-state"
STORY_SHELL_PATH = REPO_ROOT / "stories" / "_shared" / "story-shell.html"


def discover_targets(scope: str | None, explicit: list[str]) -> list[Path]:
    if explicit:
        return [Path(p).resolve() for p in explicit]

    targets: list[Path] = []
    if scope in (None, "swim-lane"):
        for name in SWIM_LANE_FILES:
            p = REPO_ROOT / name
            if p.exists():
                targets.append(p)
    if scope in (None, "index"):
        for name in INDEX_FILES:
            p = REPO_ROOT / name
            if p.exists():
                targets.append(p)
    if scope in (None, "component-current"):
        if COMPONENT_CURRENT_DIR.exists():
            targets.extend(sorted(COMPONENT_CURRENT_DIR.glob("*.html")))
    if scope in (None, "component-future"):
        if COMPONENT_FUTURE_DIR.exists():
            # Skip _base.css.html — it's a shared stylesheet wrapper, not a mock.
            targets.extend(
                sorted(p for p in COMPONENT_FUTURE_DIR.glob("*.html") if p.name != "_base.css.html")
            )
    if scope in (None, "story-shell"):
        if STORY_SHELL_PATH.exists():
            targets.append(STORY_SHELL_PATH)
    return targets


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

STEP_SCRIPT_RE = re.compile(
    r'<script\s+id="(steps-[a-zA-Z0-9_-]+)"\s+type="application/json"\s*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE,
)

HEX_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b")

# Emoji ranges cover most pictographic and symbol emoji. Excludes ASCII.
EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001F5FF"   # symbols & pictographs
    "\U0001F600-\U0001F64F"   # emoticons
    "\U0001F680-\U0001F6FF"   # transport
    "\U0001F700-\U0001F77F"
    "\U0001F780-\U0001F7FF"
    "\U0001F800-\U0001F8FF"
    "\U0001F900-\U0001F9FF"   # supplemental symbols
    "\U0001FA00-\U0001FA6F"
    "\U0001FA70-\U0001FAFF"
    "\U00002600-\U000026FF"   # misc symbols
    "\U00002700-\U000027BF"   # dingbats
    "\U0001F1E6-\U0001F1FF"   # flags
    "]+",
    flags=re.UNICODE,
)


def line_of(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def extract_steps_blocks(html: str) -> list[tuple[str, int, list[dict[str, Any]] | None, str | None]]:
    """Return (id, line, parsed_list, parse_error) for each <script id='steps-*'> block."""
    blocks = []
    for m in STEP_SCRIPT_RE.finditer(html):
        sid = m.group(1)
        body = m.group(2)
        body_line = line_of(html, m.start(2))
        try:
            parsed = json.loads(body)
            if not isinstance(parsed, list):
                blocks.append((sid, body_line, None, "steps block is not a JSON array"))
            else:
                blocks.append((sid, body_line, parsed, None))
        except json.JSONDecodeError as e:
            blocks.append((sid, body_line, None, f"JSON parse error: {e}"))
    return blocks


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def check_banned_colors(html: str, rel: str, rules: dict, findings: list[Finding]) -> None:
    banned = {b["hex"].lower(): b["reason"] for b in rules["banned_colors"]}
    for m in HEX_RE.finditer(html):
        hx = m.group(0).lower()
        if hx in banned:
            findings.append(
                Finding(
                    file=rel,
                    line=line_of(html, m.start()),
                    category="Brand",
                    severity="High",
                    message=f"Banned color {hx} found",
                    hint=banned[hx],
                    context=html[max(0, m.start() - 40):m.end() + 40].replace("\n", " ").strip(),
                )
            )


def check_banned_fonts(html: str, rel: str, rules: dict, findings: list[Finding]) -> None:
    for entry in rules["banned_fonts"]:
        name = entry["name"]
        for m in re.finditer(re.escape(name), html, re.IGNORECASE):
            findings.append(
                Finding(
                    file=rel,
                    line=line_of(html, m.start()),
                    category="Brand",
                    severity="High",
                    message=f"Banned font '{name}' referenced",
                    hint=entry["reason"],
                    context=html[max(0, m.start() - 40):m.end() + 40].replace("\n", " ").strip(),
                )
            )


def check_required_fonts_and_head(html: str, rel: str, rules: dict, findings: list[Finding]) -> None:
    # DSIndigo @font-face presence
    if "DSIndigo" not in html:
        findings.append(
            Finding(
                file=rel, line=None, category="Brand", severity="Critical",
                message="No DSIndigo @font-face block found",
                hint="Add the five-weight @font-face block from _docusign-template-spec.md §2.3.",
            )
        )
    # Inter import
    if rules["required_head_references"]["inter_google"] not in html:
        findings.append(
            Finding(
                file=rel, line=None, category="Brand", severity="High",
                message="Inter (Google Fonts) not imported",
                hint="Add @import url('https://fonts.googleapis.com/css2?family=Inter:...').",
            )
        )
    # Favicon set (only enforce on swim-lane + index pages, not component mocks).
    # Component mocks live under components/ — their path won't start with a slash when
    # relative, so check for the directory prefix at the start of the path.
    rel_posix = rel.replace("\\", "/")
    is_component = rel_posix.startswith("components/") or "/components/" in rel_posix
    if not is_component:
        needed = rules["required_head_references"]["favicon_set"]
        missing = [n for n in needed if n not in html]
        if missing:
            findings.append(
                Finding(
                    file=rel, line=None, category="Brand", severity="Medium",
                    message=f"Missing favicon asset(s): {', '.join(missing)}",
                    hint="Link the DSIcon favicon set in <head> — see _docusign-template-spec.md §2.4.",
                )
            )


def check_emoji(html: str, rel: str, rules: dict, findings: list[Finding]) -> None:
    # Dingbats characters often used as CSS typography (not pictographic emoji).
    # We still flag them, but at Low/Typography so real emoji findings aren't drowned.
    TYPOGRAPHY_DINGBATS = {
        "\u2713",  # ✓ CHECK MARK
        "\u2714",  # ✔ HEAVY CHECK MARK
        "\u2715",  # ✕ MULTIPLICATION X
        "\u2716",  # ✖ HEAVY MULTIPLICATION X
        "\u2717",  # ✗ BALLOT X
        "\u2718",  # ✘ HEAVY BALLOT X
        "\u2605",  # ★ BLACK STAR
        "\u2606",  # ☆ WHITE STAR
        "\u2022",  # • BULLET (already ASCII-safe but defensive)
    }
    for m in EMOJI_RE.finditer(html):
        ch = m.group(0)
        if ch in TYPOGRAPHY_DINGBATS:
            findings.append(
                Finding(
                    file=rel,
                    line=line_of(html, m.start()),
                    category="Typography",
                    severity="Low",
                    message=f"Typography symbol {ch!r} used (U+{ord(ch):04X})",
                    hint="Prefer an inline feather-style SVG from the icon library where possible (spec §6). Acceptable in CSS content: for stamps/decorative checks, but call it out.",
                    context=html[max(0, m.start() - 30):m.end() + 30].replace("\n", " ").strip(),
                )
            )
        else:
            findings.append(
                Finding(
                    file=rel,
                    line=line_of(html, m.start()),
                    category="Icon",
                    severity="Critical",
                    message=f"Emoji found: {ch!r} (U+{ord(ch[0]):04X})",
                    hint="Replace with an inline feather-style SVG from the icon library (spec §6).",
                    context=html[max(0, m.start() - 30):m.end() + 30].replace("\n", " ").strip(),
                )
            )


def check_banned_adverbs(html: str, rel: str, rules: dict, findings: list[Finding]) -> None:
    # Only scan within the steps JSON blocks — the spec rule is about user-facing content,
    # not CSS class names or comments that happen to contain "powerful".
    for sid, body_line, parsed, err in extract_steps_blocks(html):
        if parsed is None:
            continue
        for i, step in enumerate(parsed):
            for side in ("current", "future"):
                state = step.get(side, {}) or {}
                texts = [state.get("heading", "")] + list(state.get("items", []) or [])
                for text in texts:
                    if not text:
                        continue
                    for adv in rules["banned_adverbs"]:
                        if re.search(r"\b" + re.escape(adv) + r"\b", text, re.IGNORECASE):
                            findings.append(
                                Finding(
                                    file=rel,
                                    line=body_line,
                                    category="Voice",
                                    severity="Medium",
                                    message=f"Marketing adverb '{adv}' in {sid} step {i + 1} ({side})",
                                    hint="Rewrite in concrete, outcome-oriented language (spec §7).",
                                    context=text[:120],
                                )
                            )


def check_step_structure(html: str, rel: str, rules: dict, findings: list[Finding]) -> None:
    nc = rules["node_constraints"]
    for sid, body_line, parsed, err in extract_steps_blocks(html):
        if err:
            findings.append(
                Finding(
                    file=rel, line=body_line, category="Structure", severity="Critical",
                    message=f"{sid}: {err}",
                    hint="The steps block must be valid JSON — see spec §5.",
                )
            )
            continue
        if parsed is None:
            continue

        n = len(parsed)
        if n < nc["min_nodes_per_lane"] or n > nc["max_nodes_per_lane"]:
            findings.append(
                Finding(
                    file=rel, line=body_line, category="Structure", severity="High",
                    message=f"{sid} has {n} nodes — outside the {nc['min_nodes_per_lane']}-{nc['max_nodes_per_lane']} range",
                    hint="Split into two lanes if >8; merge micro-steps if <4.",
                )
            )

        endpoint_count = sum(1 for s in parsed if s.get("endpoint"))
        if endpoint_count != nc["endpoints_per_lane"]:
            findings.append(
                Finding(
                    file=rel, line=body_line, category="Structure", severity="High",
                    message=f"{sid} has {endpoint_count} endpoint nodes (expected {nc['endpoints_per_lane']})",
                    hint="Exactly one step should carry '\"endpoint\": true' — the terminal step.",
                )
            )
        elif parsed and not parsed[-1].get("endpoint"):
            findings.append(
                Finding(
                    file=rel, line=body_line, category="Structure", severity="Medium",
                    message=f"{sid}: endpoint step is not the last step in the array",
                    hint="Move the '\"endpoint\": true' step to the end of the steps array.",
                )
            )

        for i, step in enumerate(parsed):
            label = (step.get("label") or "").strip()
            if label:
                # Count meaningful words only — treat &, +, /, and lowercase "and" as joiners,
                # so "Delivery & Acceptance" and "Settlement & Payment" read as compound labels,
                # not three-word violations.
                JOINERS = {"&", "+", "/", "and"}
                words = [w for w in label.split() if w.lower() not in JOINERS]
                if len(words) > nc["max_label_words"]:
                    findings.append(
                        Finding(
                            file=rel, line=body_line, category="Structure", severity="Low",
                            message=f"{sid} step {i + 1} label '{label}' is {len(words)} meaningful words (max {nc['max_label_words']})",
                            hint="Node labels are 1-2 words, title case (spec §7). Joiners like '&', '/', 'and' don't count.",
                        )
                    )

            icon = (step.get("icon") or "").strip()
            if icon and icon not in rules["icon_library_keys"]:
                findings.append(
                    Finding(
                        file=rel, line=body_line, category="Icon", severity="Medium",
                        message=f"{sid} step {i + 1} icon '{icon}' is not in the library",
                        hint=f"Add it to the icon-library block or swap for an existing key: {', '.join(rules['icon_library_keys'][:8])}...",
                    )
                )

            for side in ("current", "future"):
                state = step.get(side, {}) or {}
                items = state.get("items", []) or []
                if len(items) < nc["min_bullets_per_state"] or len(items) > nc["max_bullets_per_state"]:
                    findings.append(
                        Finding(
                            file=rel, line=body_line, category="Structure", severity="Low",
                            message=f"{sid} step {i + 1} {side}: {len(items)} bullets (expected {nc['min_bullets_per_state']}-{nc['max_bullets_per_state']})",
                            hint="Scan-friendly panel — not a doc (spec §5).",
                        )
                    )
                for j, bullet in enumerate(items):
                    if isinstance(bullet, str) and len(bullet) > nc["max_bullet_chars"]:
                        findings.append(
                            Finding(
                                file=rel, line=body_line, category="Voice", severity="Low",
                                message=f"{sid} step {i + 1} {side} bullet {j + 1} is {len(bullet)} chars (max {nc['max_bullet_chars']})",
                                hint="Trim to ≤90 chars; no filler.",
                                context=bullet[:140],
                            )
                        )


VERTICALS_OPEN_RE = re.compile(r"const\s+VERTICALS\s*=\s*\{", re.MULTILINE)

# head: "..."  |  head: '...'  |  head: `...`
# Captures the field name and the inner string content. Handles backslash escapes.
NARRATION_FIELD_RE = re.compile(
    r"\b(head|lede|headline)\s*:\s*([\"'`])((?:\\.|(?!\2).)*?)\2",
    re.DOTALL,
)

HTML_TAG_STRIP_RE = re.compile(r"<[^>]+>")


def find_verticals_block(html: str) -> tuple[int, int] | None:
    """Find (start, end) byte offsets of the VERTICALS object literal — from the
    opening `{` after `const VERTICALS = ` through its matching `}`. Walks JS
    strings (single, double, template), block comments, and line comments so a
    `}` inside a backtick string doesn't end the block early."""
    m = VERTICALS_OPEN_RE.search(html)
    if not m:
        return None
    start = m.end() - 1  # position of opening `{`
    depth = 0
    i = start
    n = len(html)
    in_s = in_d = in_t = False
    in_lc = in_bc = False
    while i < n:
        c = html[i]
        nxt = html[i + 1] if i + 1 < n else ""
        if in_lc:
            if c == "\n":
                in_lc = False
            i += 1
            continue
        if in_bc:
            if c == "*" and nxt == "/":
                in_bc = False
                i += 2
                continue
            i += 1
            continue
        if in_s:
            if c == "\\":
                i += 2
                continue
            if c == "'":
                in_s = False
            i += 1
            continue
        if in_d:
            if c == "\\":
                i += 2
                continue
            if c == '"':
                in_d = False
            i += 1
            continue
        if in_t:
            if c == "\\":
                i += 2
                continue
            if c == "`":
                in_t = False
            i += 1
            continue
        if c == "/" and nxt == "/":
            in_lc = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_bc = True
            i += 2
            continue
        if c == "'":
            in_s = True
        elif c == '"':
            in_d = True
        elif c == "`":
            in_t = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return (start, i + 1)
        i += 1
    return None


def check_capability_language(html: str, rel: str, rules: dict, findings: list[Finding]) -> None:
    """Flag IAM product names inside scene narration prose (head / lede / beats[].head /
    beats[].lede). Capabilities-not-products rule: the story arc should describe the
    transaction, not the IAM product line. Tags, SoR badges, persona role labels, and
    scene tag/label fields are exempt — those are deliberate product-naming surfaces.

    Scope: story-shell.html (and any file with a top-level `const VERTICALS = {…}` literal).
    """
    cfg = rules.get("narration_banned_products")
    if not cfg:
        return

    # Only run on files that actually carry the VERTICALS registry.
    block = find_verticals_block(html)
    if block is None:
        return
    block_start, block_end = block
    region = html[block_start:block_end]

    # Build a case-insensitive single regex of all banned product names.
    replacements = cfg.get("replacements", {}) or {}
    if not replacements:
        return
    # Sort by length descending so multi-word names match before their substrings
    # ("Web Forms" before "Forms", "Agreement Desk" before "Agreement").
    products = sorted(replacements.keys(), key=len, reverse=True)
    product_re = re.compile(
        r"\b(?:" + "|".join(re.escape(p) for p in products) + r")\b",
        re.IGNORECASE,
    )

    seen: set[tuple[int, str, int]] = set()  # dedupe (line, product_lower, value_offset)

    for nm in NARRATION_FIELD_RE.finditer(region):
        field = nm.group(1)
        value = nm.group(3)
        value_start_in_html = block_start + nm.start(3)
        # Strip HTML tags for cleaner context output, but match offsets in the raw value
        # since findings reference the raw line in the source file.
        for pm in product_re.finditer(value):
            product = pm.group(0)
            line = line_of(html, value_start_in_html + pm.start())
            key = (line, product.lower(), value_start_in_html + pm.start())
            if key in seen:
                continue
            seen.add(key)
            canonical = next((p for p in products if p.lower() == product.lower()), product)
            suggestions = replacements.get(canonical, [])
            hint_suggestions = "; ".join(suggestions[:3]) if suggestions else "rewrite as a capability the transaction demands"
            stripped = HTML_TAG_STRIP_RE.sub("", value).strip()
            findings.append(
                Finding(
                    file=rel,
                    line=line,
                    category="Capabilities",
                    severity="High",
                    message=f"Product name '{product}' in scene narration ({field}:)",
                    hint=f"Story arc should describe the capability, not the product. Try: {hint_suggestions}.",
                    context=stripped[:140],
                )
            )


def check_iam_tags(html: str, rel: str, rules: dict, findings: list[Finding]) -> None:
    valid = set(rules["iam_products"])
    for sid, body_line, parsed, err in extract_steps_blocks(html):
        if parsed is None:
            continue
        for i, step in enumerate(parsed):
            tags = (step.get("future", {}) or {}).get("tags", []) or []
            for tag in tags:
                if tag not in valid:
                    findings.append(
                        Finding(
                            file=rel, line=body_line, category="Tags", severity="High",
                            message=f"{sid} step {i + 1}: IAM tag '{tag}' is not a known product",
                            hint=f"Valid IAM products: {', '.join(sorted(valid))}.",
                        )
                    )


def check_point_solutions_mechanical(html: str, rel: str, rules: dict, findings: list[Finding]) -> None:
    """Surface obvious non-vendor point chips so the LLM pass has less to re-check."""
    rejected = {s.lower() for s in rules["process_nouns_rejected_as_point_solutions"]["list"]}

    flat_vendor_list: set[str] = set()
    for industry, items in rules["known_vendor_point_solutions"].items():
        if industry.startswith("_"):
            continue
        for v in items:
            flat_vendor_list.add(v.lower())

    for sid, body_line, parsed, err in extract_steps_blocks(html):
        if parsed is None:
            continue
        for i, step in enumerate(parsed):
            points = (step.get("current", {}) or {}).get("points", []) or []
            for chip in points:
                chip_norm = chip.lower().strip()
                # Only strip outer brackets/parens if the whole chip is wrapped
                # (handles e.g. "[LOS / CRM]") — don't mangle mid-string parens
                # like "Death Verification (SSDI / DMF)".
                if chip_norm.startswith("[") and chip_norm.endswith("]"):
                    chip_norm = chip_norm[1:-1].strip()
                elif chip_norm.startswith("(") and chip_norm.endswith(")"):
                    chip_norm = chip_norm[1:-1].strip()
                if chip_norm in rejected:
                    findings.append(
                        Finding(
                            file=rel, line=body_line, category="Points", severity="High",
                            message=f"{sid} step {i + 1}: '{chip}' reads as a workflow step, not a vendor",
                            hint="Replace with the actual incumbent vendor name (e.g. 'identification' → 'Jumio' or 'LexisNexis ThreatMetrix'), or drop if the step has no non-displaceable vendor.",
                        )
                    )
                elif chip_norm not in flat_vendor_list:
                    # Soft flag — the LLM pass should confirm, because we don't maintain a
                    # total allowlist. Mark as Parity-Hint so the LLM can adjudicate.
                    findings.append(
                        Finding(
                            file=rel, line=body_line, category="Parity-Hint", severity="Low",
                            message=f"{sid} step {i + 1}: '{chip}' is not in the vendor allowlist — LLM should confirm it's a real point solution",
                            hint="If it is a real incumbent, add it to rules.json → known_vendor_point_solutions. If not, replace or remove.",
                        )
                    )


def check_svg_style(html: str, rel: str, rules: dict, findings: list[Finding]) -> None:
    """Every inline SVG should be feather-style. Flag any <svg> without stroke='currentColor'."""
    # Only run on swim-lane/index files — component mocks intentionally break this rule for UI elements.
    rel_posix = rel.replace("\\", "/")
    if rel_posix.startswith("components/") or "/components/" in rel_posix:
        return
    for m in re.finditer(r"<svg\b[^>]*>", html, re.IGNORECASE):
        tag = m.group(0)
        if 'stroke="currentColor"' not in tag and "stroke='currentColor'" not in tag \
                and 'stroke: currentColor' not in tag:
            # Allow if a parent <style> block sets svg stroke globally (common pattern).
            # This is a heuristic — if the file has 'svg{...stroke:currentColor' we skip.
            if re.search(r"svg\s*\{[^}]*stroke\s*:\s*currentColor", html, re.IGNORECASE):
                continue
            findings.append(
                Finding(
                    file=rel, line=line_of(html, m.start()), category="Icon", severity="Low",
                    message="Inline <svg> without stroke='currentColor'",
                    hint="Feather-style SVGs should use stroke='currentColor', fill='none', stroke-width='1.7' (spec §6).",
                    context=tag[:100],
                )
            )


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

CHECKERS = [
    check_banned_colors,
    check_banned_fonts,
    check_required_fonts_and_head,
    check_emoji,
    check_banned_adverbs,
    check_step_structure,
    check_iam_tags,
    check_point_solutions_mechanical,
    check_svg_style,
    check_capability_language,
]

SEVERITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


def audit_file(path: Path, rules: dict) -> list[Finding]:
    findings: list[Finding] = []
    try:
        html = path.read_text(encoding="utf-8")
    except Exception as e:
        return [Finding(
            file=str(path.relative_to(REPO_ROOT)) if REPO_ROOT in path.parents else str(path),
            line=None, category="Structure", severity="Critical",
            message=f"Could not read file: {e}",
        )]

    try:
        rel = str(path.relative_to(REPO_ROOT))
    except ValueError:
        rel = str(path)

    for checker in CHECKERS:
        try:
            checker(html, rel, rules, findings)
        except Exception as e:
            findings.append(Finding(
                file=rel, line=None, category="Structure", severity="High",
                message=f"Audit checker {checker.__name__} raised: {e}",
            ))
    return findings


def render_markdown(grouped: dict[str, list[Finding]]) -> str:
    lines: list[str] = []
    lines.append("# TGK 2.0 — Mechanical audit report")
    lines.append("")
    total = sum(len(v) for v in grouped.values())
    files_with_findings = sum(1 for v in grouped.values() if v)
    lines.append(f"**{total}** findings across **{files_with_findings}** files "
                 f"(of {len(grouped)} audited).")
    lines.append("")
    lines.append("> Mechanical pass only — story-arc, workspaces coherence, point-solution "
                 "validity, and interface parity require the LLM pass. See `SKILL.md`.")
    lines.append("")

    for file, findings in sorted(grouped.items()):
        if not findings:
            continue
        lines.append(f"## `{file}` — {len(findings)} finding(s)")
        lines.append("")
        findings.sort(key=lambda f: (SEVERITY_ORDER.get(f.severity, 9), f.line or 0, f.category))
        for f in findings:
            loc = f":{f.line}" if f.line else ""
            lines.append(f"- **[{f.severity}][{f.category}]** {f.message} — _{file}{loc}_")
            if f.hint:
                lines.append(f"  - **Fix:** {f.hint}")
            if f.context:
                lines.append(f"  - **Context:** `{f.context}`")
        lines.append("")

    clean = [f for f, v in grouped.items() if not v]
    if clean:
        lines.append("## Clean files")
        lines.append("")
        for f in sorted(clean):
            lines.append(f"- `{f}` — no mechanical findings")
        lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Mechanical audit pass for TGK 2.0 discovery assets.")
    parser.add_argument("files", nargs="*", help="Specific files to audit (absolute or repo-relative paths).")
    parser.add_argument("--scope", choices=["swim-lane", "index", "component-current", "component-future", "story-shell"],
                        help="Limit to a scope when no files are given. Default: all scopes.")
    parser.add_argument("--format", choices=["json", "markdown"], default="json",
                        help="Output format. Default: json (consumed by the LLM pass).")
    args = parser.parse_args()

    rules = load_rules()
    targets = discover_targets(args.scope, args.files)
    if not targets:
        print("No targets found.", file=sys.stderr)
        return 1

    grouped: dict[str, list[Finding]] = {}
    for t in targets:
        findings = audit_file(t, rules)
        try:
            rel = str(t.relative_to(REPO_ROOT))
        except ValueError:
            rel = str(t)
        grouped[rel] = findings

    if args.format == "markdown":
        print(render_markdown(grouped))
    else:
        payload = {
            "repo_root": str(REPO_ROOT),
            "files_audited": len(grouped),
            "total_findings": sum(len(v) for v in grouped.values()),
            "findings_by_file": {k: [f.to_dict() for f in v] for k, v in grouped.items()},
        }
        print(json.dumps(payload, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
