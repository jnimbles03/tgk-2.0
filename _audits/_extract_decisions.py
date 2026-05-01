#!/usr/bin/env python3
"""
Extract per-flow decision blocks from the 7 vertical rewrite proposal docs into
a single JSON file the interactive review page consumes.

Reads:
  _audits/<vertical>-rewrite-2026-04-30.md  (×7)

Writes:
  _audits/decisions-2026-04-30.json

Each decision is one (vertical, usecase) flow. Tier-sorted: mechanical first.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# ---------- Vertical → tier classification ----------
# Tier 1: mostly mechanical fixes (side flips, missing-name additions)
# Tier 2: judgment calls (intent vs. data, structural fixes)
# Tier 3: introduces new fictional cast names that need approval
TIER = {
    "education":       1,
    "nonprofit":       1,
    "slgov":           1,
    "slgov-recertification": 1,
    "slgov-benefits":  1,
    "slgov-employee-onboarding": 1,
    "slgov-licensing": 1,
    "slgov-vendor-compliance": 1,
    "slgov-311":       1,
    "fedgov":          2,
    "wealth-discovery":2,
    "insurance":       3,
    "insurance-pc":    3,
    "insurance-life":  3,
    "provider":        3,  # HLS family
    "payor":           3,
    "lifesciences":    3,
    "provider-roi":    3,
}

# Color label for the tier
TIER_LABELS = {
    1: "Mechanical · low-risk",
    2: "Judgment call · medium-risk",
    3: "New cast · review names",
}

# Map each proposal file to (vertical_keys it covers, friendly title)
PROPOSAL_FILES = [
    ("education-rewrite-2026-04-30.md",        ["education"],                         "Education · Maple Ridge"),
    ("nonprofit-rewrite-2026-04-30.md",        ["nonprofit"],                          "Nonprofit · Harbor Foundation"),
    ("slgov-rewrite-2026-04-30.md",            ["slgov","slgov-recertification","slgov-benefits","slgov-employee-onboarding","slgov-licensing","slgov-vendor-compliance","slgov-311"], "State/Local Gov family"),
    ("fedgov-rewrite-2026-04-30.md",           ["fedgov"],                             "Fedgov · DOL"),
    ("wealth-discovery-rewrite-2026-04-30.md", ["wealth-discovery"],                   "Wealth Discovery · Cypress"),
    ("insurance-rewrite-2026-04-30.md",        ["insurance","insurance-pc","insurance-life"], "Insurance family"),
    ("hls-rewrite-2026-04-30.md",              ["provider","payor","lifesciences","provider-roi"], "HLS family"),
]

# ---------- Markdown section walker ----------
def split_into_flow_sections(md_text):
    """
    Walk a proposal markdown and split into per-flow sections.

    A "flow section" is a heading that names a (vertical, usecase) pair, like:
      ### insurance · default ...
      ## nonprofit/intake (usecase, 4 scenes)
      ### education/default — Fall 2026 Student Onboarding
      ## insurance-pc · maintenance (3 scenes)
      ## fedgov · default
      etc.

    We accept any heading line containing one of:
      <vertical>·<usecase>     (with bullet/centerdot)
      <vertical>/<usecase>
      <vertical>-<usecase>     (rare; ambiguous)

    Returns list of {heading, vertical, usecase, body_md}.
    """
    sections = []

    # Match heading lines that look like flow markers
    # Permissive: catch various separators and decorations
    pattern = re.compile(
        r'^(#{2,4})\s+'
        r'((?:[a-zA-Z][a-zA-Z0-9_-]*)|(?:[a-zA-Z][a-zA-Z0-9_-]*-[a-zA-Z]+))'  # vertical key
        r'\s*[·/]\s*'
        r'([a-zA-Z][a-zA-Z0-9_-]*)'  # usecase
        r'(.*)$',
        re.MULTILINE
    )

    matches = list(pattern.finditer(md_text))
    if not matches:
        return sections

    for i, m in enumerate(matches):
        heading_start = m.start()
        next_start = matches[i+1].start() if i+1 < len(matches) else len(md_text)
        body = md_text[heading_start:next_start].strip()
        vk = m.group(2).strip()
        uc = m.group(3).strip()
        # Filter out obvious false positives (e.g., "## Intent · vs · Data")
        if vk.lower() in {"intent", "scope", "scene", "audit", "domain", "fix"}:
            continue
        sections.append({
            "heading": m.group(0).strip(),
            "vertical_key": vk,
            "usecase": uc.lower(),
            "body_md": body,
        })
    return sections


def parse_persona_changes(body_md):
    """
    Pull out 'Persona — was' / 'Persona — now' lines so the decision card can
    summarize them above the full proposal text. Returns a list of dicts:
      [{"scene": "S1", "was": "...", "now": "..."}]
    Also captures stand-alone 'Scene head was/now' and 'Scene lede was/now'.
    """
    changes = []
    # Heuristic: parse blocks of the shape:
    #   ### SCENE N — Label
    #   ...
    #   **Persona — was**:
    #   > ...
    #   **Persona — now**:
    #   > ...
    scene_pattern = re.compile(
        r'(?:^|\n)#{2,4}\s+SCENE\s+(\d+)[^\n]*\n([\s\S]*?)(?=\n#{2,4}\s|\Z)',
        re.IGNORECASE
    )
    for sm in scene_pattern.finditer(body_md):
        scene_num = sm.group(1)
        scene_body = sm.group(2)
        was_m = re.search(r'\*\*Persona\s*[—-]\s*was\*\*:?\s*\n>\s*(.+?)(?=\n\n|\Z)',
                          scene_body, re.DOTALL)
        now_m = re.search(r'\*\*Persona\s*[—-]\s*now\*\*:?\s*\n>\s*(.+?)(?=\n\n|\Z)',
                          scene_body, re.DOTALL)
        if was_m or now_m:
            changes.append({
                "scene": f"S{scene_num}",
                "was": (was_m.group(1).strip() if was_m else "").replace('\n>', ' '),
                "now": (now_m.group(1).strip() if now_m else "").replace('\n>', ' '),
            })
    return changes


def main():
    decisions = []
    proposals_summary = []

    for fname, vkeys, title in PROPOSAL_FILES:
        path = ROOT / "_audits" / fname
        if not path.exists():
            print(f"  WARN: {fname} missing")
            continue
        text = path.read_text()
        proposals_summary.append({
            "file": fname,
            "title": title,
            "verticals": vkeys,
            "tier": TIER[vkeys[0].split('-')[0]] if vkeys[0] not in TIER else TIER[vkeys[0]],
        })

        # Use the proposal_key as the tier source
        tier_key = vkeys[0]
        # Find the family root (insurance-pc → insurance, etc.)
        if tier_key not in TIER:
            for k in TIER:
                if tier_key.startswith(k.replace('-discovery', '')):
                    tier_key = k
                    break
        tier = TIER.get(tier_key, 2)

        sections = split_into_flow_sections(text)
        if not sections:
            # Fallback: treat the whole doc as one decision
            decisions.append({
                "id": f"{vkeys[0]}|whole-doc",
                "vertical_key": vkeys[0],
                "usecase": "(whole doc)",
                "title": title,
                "tier": tier,
                "tier_label": TIER_LABELS[tier],
                "source_file": fname,
                "heading": "(no flow-level sections detected)",
                "persona_changes": [],
                "body_md": text,
            })
            continue
        for s in sections:
            # Skip sections whose vertical_key isn't in vkeys (false positives)
            if s["vertical_key"] not in vkeys:
                # Maybe the agent used a slightly different key — accept anyway
                pass
            decisions.append({
                "id": f"{s['vertical_key']}|{s['usecase']}",
                "vertical_key": s["vertical_key"],
                "usecase": s["usecase"],
                "title": title,
                "tier": tier,
                "tier_label": TIER_LABELS[tier],
                "source_file": fname,
                "heading": s["heading"],
                "persona_changes": parse_persona_changes(s["body_md"]),
                "body_md": s["body_md"],
            })

    # Sort: tier ascending, then vertical_key, then usecase
    USECASE_ORDER = {"default":0, "intake":1, "maintenance":2, "fraud-fabric":3, "workspaces":4}
    decisions.sort(key=lambda d: (
        d["tier"],
        d["vertical_key"],
        USECASE_ORDER.get(d["usecase"], 99),
        d["usecase"],
    ))

    out = ROOT / "_audits" / "decisions-2026-04-30.json"
    payload = {
        "generated": "2026-04-30",
        "proposals": proposals_summary,
        "decisions": decisions,
        "counts": {
            "total": len(decisions),
            "tier_1": sum(1 for d in decisions if d["tier"] == 1),
            "tier_2": sum(1 for d in decisions if d["tier"] == 2),
            "tier_3": sum(1 for d in decisions if d["tier"] == 3),
        },
    }
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"Wrote {out.relative_to(ROOT)}")
    print(f"  total decisions: {payload['counts']['total']}")
    print(f"    tier 1 (mechanical): {payload['counts']['tier_1']}")
    print(f"    tier 2 (judgment):   {payload['counts']['tier_2']}")
    print(f"    tier 3 (new cast):   {payload['counts']['tier_3']}")

if __name__ == "__main__":
    main()
