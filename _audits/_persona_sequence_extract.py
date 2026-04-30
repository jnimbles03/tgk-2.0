#!/usr/bin/env python3
"""
Extract per-scene persona/actor data for two new audits:

  1) persona-sequence-audit  — for each (vertical, usecase) flow, capture
     the actor in every scene (S1..Sn) and apply canonical-spine rules
     to flag sequencing violations.

  2) character-naming-audit  — flat directory of every named character
     and tenant firm appearing anywhere in the data, with flow-membership
     and risk flags.

Reads:
  - stories/_shared/story-shell.html (inline VERTICALS + inlined JSON
    narration block)
  - _audits/usecase-narrations-2026-04-27.json

Writes:
  - _audits/persona-sequence-data.json
  - _audits/character-naming-data.json
"""
import json
import re
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
SHELL = ROOT / "stories" / "_shared" / "story-shell.html"
JSON_NARR = ROOT / "_audits" / "usecase-narrations-2026-04-27.json"
OUT_SEQ = ROOT / "_audits" / "persona-sequence-data.json"
OUT_NAMES = ROOT / "_audits" / "character-naming-data.json"

# ---------- Canonical spines per (vertical-shape, usecase) ----------
# An "expected side" sequence; "*" means anything is OK.
CANONICAL_SPINES = {
    "default": {
        "scenes": ["Sender", "Identity", "Signing", "Data", "Workspace"],
        # Identity at S2 is performed by the client (the recipient verifies)
        "expected_sides": ["advisor", "client", "client", "advisor", "advisor"],
    },
    "intake": {
        "scenes": ["Sender", "Identity", "Signing", "Data"],
        # Identity in self-service intake: client OR system (Maestro/CLEAR
        # orchestrates verification on the client) — accept either via
        # special-case in audit_sequence below.
        "expected_sides": ["advisor", "client|system", "client", "advisor"],
    },
    "fraud-fabric": {
        "scenes": ["Portal Entry", "Identity", "Action"],
        # Portal entry is the client logging in; identity is system; action is advisor
        "expected_sides": ["client", "system", "advisor"],
    },
    "maintenance": {
        "scenes": ["Portal Entry", "Form", "Confirmation"],
        # Form scene: the client fills it OR the system orchestrates
        "expected_sides": ["client", "client|system", "advisor"],
    },
    "workspaces": {
        "scenes": ["Workspace"],
        "expected_sides": ["advisor"],
    },
}

# Roles that DON'T match an "advisor" side (the trap that caught Hillside).
# "Advisor" side should imply some front-office / origination / customer-facing
# role. Per-domain notes:
#   - Wealth: advisor / financial advisor / portfolio manager / wealth manager
#   - Banking: relationship manager / loan officer / commercial banker
#   - INSURANCE: agent ≡ advisor. Producer ≡ advisor. Underwriter, claims
#     adjuster, FNOL handler all count as front-office actors.
#   - HLS / health: physician / medical assistant / nurse / case manager
#   - Public sector: caseworker / permit clerk / licensing specialist
ADVISOR_ROLE_KEYWORDS = [
    # Wealth
    "advisor", "advis", "wealth manager", "portfolio manager",
    "private banker", "private wealth",
    # Banking / lending
    "relationship manager", "rm", "originator", "loan officer",
    "commercial relationship", "commercial banker", "credit officer",
    # Insurance — the user-confirmed rule: Agent = Advisor for insurance
    "agent", "insurance agent", "producer", "broker", "captive agent",
    "underwriter", "underwriting", "claims adjuster", "field adjuster",
    "claims handler", "claims rep", "claim", "fnol", "siu", "examiner",
    # Generic front-office
    "account executive", "account manager", "branch", "client services",
    "service rep", "csr", "intake specialist", "case manager",
    "investigator", "case worker", "caseworker",
    # Network / firm onboarding
    "onboarding", "recruiting", "growth", "partnerships",
    "managing director", "senior associate", "associate",
    "head of advisor", "director of advisor", "recruiter",
    "head of strategic partnerships", "network",
    # Healthcare provider-side
    "admissions", "registrar", "enrollment", "intake",
    "medical assistant", "nurse", "physician", "dr.", "doctor",
    "care coordinator", "social worker",
    # Public sector / state-local-gov
    "officer", "permit", "licensing", "permits", "license",
    "fleet manager", "head of compliance and onboarding",
]
# Roles that scream "back office" — flagged if shown on the advisor side
# (compliance and legal don't ORIGINATE workflows; they review/gate them).
BACK_OFFICE_ROLE_KEYWORDS = [
    "head of compliance", "compliance officer", "chief compliance",
    "general counsel", "operations", "back office",
    "legal", "ops",
]


def looks_advisor_appropriate(role: str) -> bool:
    if not role:
        return False
    r = role.lower()
    if any(k in r for k in BACK_OFFICE_ROLE_KEYWORDS):
        return False
    if any(k in r for k in ADVISOR_ROLE_KEYWORDS):
        return True
    return False


# ---------- Inline VERTICALS parser ----------
def parse_inline_verticals(content):
    """Returns list of {key, body} for each top-level VERTICALS entry."""
    m = re.search(r"const VERTICALS\s*=\s*\{", content)
    if not m:
        return []
    start = m.end()
    depth = 1
    i = start
    while depth > 0 and i < len(content):
        c = content[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        i += 1
    body = content[start:i-1]

    out = []
    pos = 0
    n = len(body)
    while pos < n:
        while pos < n and body[pos] in " \t\n,\r":
            pos += 1
        if pos >= n:
            break
        km = re.match(r'([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*\{', body[pos:])
        if not km:
            nl = body.find("\n", pos)
            if nl == -1:
                break
            pos = nl + 1
            continue
        key = km.group(1)
        body_start = pos + km.end()
        depth = 1
        j = body_start
        while depth > 0 and j < n:
            c = body[j]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            elif c in '"\'`':
                q = c
                j += 1
                while j < n:
                    if body[j] == "\\":
                        j += 2
                        continue
                    if body[j] == q:
                        break
                    j += 1
            j += 1
        out.append({"key": key, "body": body[body_start:j-1]})
        pos = j
    return out


def extract_meta_from_block(block):
    def grab(field, kind="string"):
        if kind == "string":
            m = re.search(rf'{field}\s*:\s*"([^"]*)"', block)
            return m.group(1) if m else None
        return None
    return {
        "label": grab("label"),
        "tenant": grab("tenant"),
        "subtitle": grab("subtitle"),
        "category": grab("category"),
        "preset": grab("preset"),
    }


def extract_scenes_from_inline_block(block):
    """
    Walk the `scenes:[ ... ]` array inside a vertical's body. For each
    scene, return its tag, head, scene-level persona, and the per-beat
    persona overrides (if any).
    """
    scenes = []
    sm = re.search(r'scenes\s*:\s*\[', block)
    if not sm:
        return scenes
    pos = sm.end()
    n = len(block)
    # Walk array elements (objects starting with `{`)
    while pos < n:
        while pos < n and block[pos] in " \t\n,\r":
            pos += 1
        if pos >= n or block[pos] != "{":
            break
        # Find matching brace
        depth = 1
        j = pos + 1
        while depth > 0 and j < n:
            c = block[j]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            elif c in '"\'`':
                q = c
                j += 1
                while j < n:
                    if block[j] == "\\":
                        j += 2
                        continue
                    if block[j] == q:
                        break
                    j += 1
            j += 1
        scene_body = block[pos:j]
        scenes.append(parse_scene_body(scene_body))
        pos = j
        # Skip trailing comma/whitespace
        while pos < n and block[pos] in " \t\n,\r":
            pos += 1
        # Stop if we've hit array close
        if pos < n and block[pos] == "]":
            break
    return scenes


def parse_scene_body(scene_body):
    """Pull tag, head, scene persona, and beat personas from a scene literal."""
    tag = re.search(r'tag\s*:\s*"([^"]*)"', scene_body)
    # head: try the scene-level head (non-beat one) — first `head:` outside `beats:[`
    # Find beats block bounds
    beats_match = re.search(r'beats\s*:\s*\[', scene_body)
    if beats_match:
        head_search_region = scene_body[: beats_match.start()]
    else:
        head_search_region = scene_body
    head = re.search(r'head\s*:\s*"([^"]*)"', head_search_region)
    persona = parse_persona_from_block(head_search_region)
    # Beat personas: walk inside the beats array
    beat_personas = []
    if beats_match:
        # Find the matching ] for the beats array
        bpos = beats_match.end()
        depth = 1
        i = bpos
        while depth > 0 and i < len(scene_body):
            c = scene_body[i]
            if c == "[":
                depth += 1
            elif c == "]":
                depth -= 1
            elif c in '"\'`':
                q = c
                i += 1
                while i < len(scene_body):
                    if scene_body[i] == "\\":
                        i += 2
                        continue
                    if scene_body[i] == q:
                        break
                    i += 1
            i += 1
        beats_body = scene_body[bpos:i-1]
        # Walk beat objects
        bp = 0
        bn = len(beats_body)
        while bp < bn:
            while bp < bn and beats_body[bp] in " \t\n,\r":
                bp += 1
            if bp >= bn or beats_body[bp] != "{":
                break
            d = 1
            j = bp + 1
            while d > 0 and j < bn:
                cc = beats_body[j]
                if cc == "{":
                    d += 1
                elif cc == "}":
                    d -= 1
                elif cc in '"\'`':
                    q = cc
                    j += 1
                    while j < bn:
                        if beats_body[j] == "\\":
                            j += 2
                            continue
                        if beats_body[j] == q:
                            break
                        j += 1
                j += 1
            beat_body = beats_body[bp:j]
            bhead = re.search(r'head\s*:\s*"([^"]*)"', beat_body)
            bpersona = parse_persona_from_block(beat_body)
            beat_personas.append({
                "head": bhead.group(1) if bhead else None,
                "persona": bpersona,
            })
            bp = j
    return {
        "tag": tag.group(1) if tag else None,
        "head": head.group(1) if head else None,
        "persona": persona,
        "beats": beat_personas,
    }


def parse_persona_from_block(block):
    """
    Parse a `persona:{side:..., name:..., role:...}` literal anywhere in `block`.
    Returns dict or None. Handles balanced braces (a persona body may itself
    contain inner braces in HTML strings — though uncommon).
    """
    pm = re.search(r'persona\s*:\s*\{', block)
    if not pm:
        return None
    # Find the matching closing brace
    pos = pm.end()
    depth = 1
    n = len(block)
    while depth > 0 and pos < n:
        c = block[pos]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
        elif c in '"\'`':
            q = c
            pos += 1
            while pos < n:
                if block[pos] == '\\':
                    pos += 2
                    continue
                if block[pos] == q:
                    break
                pos += 1
        pos += 1
    inner = block[pm.end():pos-1]
    side = re.search(r'side\s*:\s*"([^"]*)"', inner)
    name = re.search(r'name\s*:\s*"([^"]*)"', inner)
    role = re.search(r'role\s*:\s*"([^"]*)"', inner)
    if not (side or name or role):
        return None
    return {
        "side": side.group(1) if side else None,
        "name": name.group(1) if name else None,
        "role": role.group(1) if role else None,
    }


# ---------- Combine: build flow rows ----------
def usecase_for_flow_default():
    return "default"


def build_flows():
    flows = []

    shell_text = SHELL.read_text(encoding="utf-8")

    # 1) Inline VERTICALS — one flow per top-level key, usecase=default
    inline = parse_inline_verticals(shell_text)
    for v in inline:
        meta = extract_meta_from_block(v["body"])
        scenes = extract_scenes_from_inline_block(v["body"])
        flows.append({
            "vertical_key": v["key"],
            "usecase": "default",
            "source": "inline VERTICALS",
            "meta": meta,
            "scenes": scenes,
        })

    # 2) Inlined JSON narration block (second <script> with type="application/json")
    #    + standalone JSON file. Both have the same shape.
    def add_from_json_payload(data, source_label):
        verticals = data.get("verticals") or {}
        for vk, vbody in verticals.items():
            usecases = vbody.get("usecases") or {}
            for uk, uc in usecases.items():
                scenes_raw = uc.get("scenes") or []
                scenes = []
                for s in scenes_raw:
                    scene = {
                        "tag": s.get("tag"),
                        "head": s.get("head"),
                        "persona": s.get("persona"),
                        "beats": [],
                    }
                    for b in (s.get("beats") or []):
                        scene["beats"].append({
                            "head": b.get("head"),
                            "persona": b.get("persona"),
                        })
                    scenes.append(scene)
                flows.append({
                    "vertical_key": vk,
                    "usecase": uk,
                    "source": source_label,
                    "meta": {
                        "tenant": uc.get("tenant") or vbody.get("tenant"),
                        "label": vbody.get("label") or vk,
                        "subtitle": uc.get("subtitle"),
                    },
                    "scenes": scenes,
                })

    # Pull inlined JSON narration block
    script_blocks = list(re.finditer(r'<script[^>]*>(.*?)</script>', shell_text, re.DOTALL))
    for blk in script_blocks:
        body = blk.group(1).strip()
        if body.startswith("{") and '"verticals"' in body[:1000]:
            try:
                data = json.loads(body)
                add_from_json_payload(data, "inline JSON narrations")
            except Exception as e:
                print(f"WARN: inlined JSON narrations parse failed: {e}", file=sys.stderr)
            break

    # Standalone JSON file
    if JSON_NARR.exists():
        try:
            data = json.loads(JSON_NARR.read_text(encoding="utf-8"))
            add_from_json_payload(data, JSON_NARR.name)
        except Exception as e:
            print(f"WARN: standalone JSON parse failed: {e}", file=sys.stderr)

    # Deduplicate (vertical_key, usecase) — prefer the first source seen
    seen = {}
    for f in flows:
        key = (f["vertical_key"], f["usecase"])
        if key not in seen:
            seen[key] = f
    return list(seen.values())


# ---------- Sequence audit ----------
def usecase_spine_key(usecase):
    if usecase in CANONICAL_SPINES:
        return usecase
    return "default"


def audit_sequence(flow):
    """Apply canonical-spine rules. Return dict of {verdict, notes, strip}."""
    spine_key = usecase_spine_key(flow["usecase"])
    spine = CANONICAL_SPINES[spine_key]
    notes = []
    severity = "OK"

    # Build the actor strip — one entry per scene
    # Prefer the SCENE-level persona; fall back to beat-0 only if there's no
    # scene-level persona (some flows define persona only at beat granularity).
    # If neither is present, fall back to the canonical-spine expected side.
    # The shell does this fallback at runtime via personaFallback(sceneIndex);
    # the audit needs to mirror that to compare apples to apples.
    strip = []
    for i, scene in enumerate(flow.get("scenes") or []):
        scene_persona = scene.get("persona") or {}
        beat_personas = [(b or {}).get("persona") for b in (scene.get("beats") or [])]
        beat_personas = [bp for bp in beat_personas if bp]
        # Use scene-level persona if present; else first beat-level persona;
        # else canonical-side fallback so verdict isn't poisoned by missing data.
        if scene_persona and scene_persona.get("side"):
            persona = scene_persona
        elif beat_personas:
            persona = beat_personas[0]
        elif i < len(spine["expected_sides"]):
            persona = {"side": spine["expected_sides"][i],
                       "name": None, "role": None, "_inferred": True}
        else:
            persona = {}
        # Collect all sides seen in this scene (incl. beat overrides)
        sides_in_scene = set()
        if scene_persona.get("side"):
            sides_in_scene.add(scene_persona["side"])
        for bp in beat_personas:
            if bp.get("side"):
                sides_in_scene.add(bp["side"])
        strip.append({
            "tag": scene.get("tag") or "",
            "head": (scene.get("head") or "")[:160],
            "persona_side": persona.get("side"),
            "persona_name": persona.get("name"),
            "persona_role": persona.get("role"),
            "sides_in_scene": sorted(sides_in_scene),
            "expected_side": spine["expected_sides"][i] if i < len(spine["expected_sides"]) else None,
            "expected_label": spine["scenes"][i] if i < len(spine["scenes"]) else None,
        })

    # Rule A: scene count must match the spine
    if len(strip) != len(spine["scenes"]):
        severity = "MISMATCH"
        notes.append(
            f'Scene count {len(strip)} ≠ canonical {len(spine["scenes"])} for usecase '
            f'"{spine_key}" (expected {spine["scenes"]}).'
        )

    # Rule B: per-scene side must match expected (only for scenes that exist,
    # only when expected_side is not None, and only when the persona was
    # explicitly DEFINED — not when we inferred it from the canonical fallback).
    for i, scene in enumerate(flow.get("scenes") or []):
        s = strip[i]
        if not s["expected_side"]:
            continue
        # Skip if persona was inferred (not in source data) — comparing the
        # fallback to itself would always pass and tell us nothing.
        scene_persona = scene.get("persona") or {}
        beat0_persona = ((scene.get("beats") or [{}])[0] or {}).get("persona") or {}
        explicit_side = scene_persona.get("side") or beat0_persona.get("side")
        if not explicit_side:
            continue
        # expected_side may be "client|system" — split and accept any match
        allowed = set((s["expected_side"] or "").split("|"))
        if explicit_side not in allowed:
            if severity != "MISMATCH":
                severity = "MISMATCH"
            notes.append(
                f'S{i+1}: persona side "{explicit_side}" ≠ canonical "{s["expected_side"]}" '
                f'(scene = {s["expected_label"]})'
            )

    # Rule C: advisor side requires advisor-y role keyword
    # (skip if role is empty — no role to check, not a violation)
    for i, s in enumerate(strip):
        if s["persona_side"] == "advisor" and s["persona_role"]:
            if not looks_advisor_appropriate(s["persona_role"]):
                if severity != "MISMATCH":
                    severity = "AMBIGUOUS"
                notes.append(
                    f'S{i+1}: persona side is "advisor" but role "{s["persona_role"]}" doesn\'t '
                    f'read as advisor/origination — back-office role on the front-office side.'
                )

    # Rule H: the SENDER scene should always have a named persona — that's
    # the orientation actor for the demo. Missing it is a content gap, not
    # a structural mismatch, so flag as AMBIGUOUS rather than MISMATCH.
    for i, lbl in enumerate(spine["scenes"]):
        if lbl == "Sender" and i < len(strip):
            scene = (flow.get("scenes") or [])[i]
            scene_persona = scene.get("persona") or {}
            beat0_persona = ((scene.get("beats") or [{}])[0] or {}).get("persona") or {}
            named = scene_persona.get("name") or beat0_persona.get("name")
            if not named:
                if severity == "OK":
                    severity = "AMBIGUOUS"
                notes.append(
                    f'S{i+1} (Sender): no named persona — orientation actor is unclear. '
                    f'Add a sender persona definition for clarity.'
                )

    # Helper to read explicit (non-inferred) side from a scene's data
    def explicit_side_at(idx):
        scene = (flow.get("scenes") or [])[idx] if idx < len(flow.get("scenes") or []) else {}
        sp = (scene.get("persona") or {}).get("side")
        if sp: return sp
        b0 = ((scene.get("beats") or [{}])[0] or {}).get("persona") or {}
        return b0.get("side")

    # Rule D: identity scene (if present in spine) must be system OR client
    # (never advisor — the SENDER should not be the one verifying)
    for i, lbl in enumerate(spine["scenes"]):
        if lbl == "Identity" and i < len(strip):
            ps = explicit_side_at(i)
            if ps == "advisor":
                severity = "MISMATCH"
                notes.append(
                    f'S{i+1} (Identity): sender (advisor) is the verifying actor — should be '
                    f'client or system. The package recipient verifies, not the sender.'
                )

    # Rule E: signing scene must be on the client side (the recipient signs)
    for i, lbl in enumerate(spine["scenes"]):
        if lbl == "Signing" and i < len(strip):
            ps = explicit_side_at(i)
            if ps and ps != "client":
                severity = "MISMATCH"
                notes.append(
                    f'S{i+1} (Signing): persona side is "{ps}" — signing should be done by the client '
                    f'(the side that received the package), not the sender.'
                )

    # Rule F: workspace scene (last in default spine) must be advisor or handoff
    for i, lbl in enumerate(spine["scenes"]):
        if lbl == "Workspace" and i < len(strip):
            ps = explicit_side_at(i)
            if ps and ps not in ("advisor", "handoff"):
                if severity == "OK":
                    severity = "AMBIGUOUS"
                notes.append(
                    f'S{i+1} (Workspace): persona side is "{ps}" — Workspace usually anchors back '
                    f'on the advisor/tenant side once the relationship is in motion.'
                )

    # Rule G: same person shouldn't span sender + signer (they'd be on both sides
    # of the transaction) unless it's a self-service usecase
    sender_name = strip[0].get("persona_name") if strip else None
    self_service_usecases = {"intake", "fraud-fabric", "maintenance"}
    if sender_name and flow["usecase"] not in self_service_usecases:
        for i, lbl in enumerate(spine["scenes"]):
            if lbl == "Signing" and i < len(strip):
                if strip[i].get("persona_name") == sender_name:
                    severity = "MISMATCH"
                    notes.append(
                        f'S1 sender and S{i+1} signer are the same person ({sender_name}) — '
                        f'sender shouldn\'t also be the signer in a non-self-service flow.'
                    )

    return {
        "spine_key": spine_key,
        "spine": spine,
        "strip": strip,
        "verdict": severity,
        "notes": notes,
    }


# ---------- Naming directory ----------
def collect_names(flows):
    """Walk every persona slot in every scene/beat and aggregate."""
    by_name = defaultdict(lambda: {
        "name": None,
        "roles": set(),
        "sides": set(),
        "flows": [],
        "first_appearance": None,
    })
    by_tenant = defaultdict(lambda: {
        "tenant": None,
        "verticals": set(),
        "usecases": set(),
        "flows": [],
    })
    for f in flows:
        flow_id = f"{f['vertical_key']}|{f['usecase']}"
        tenant = f.get("meta", {}).get("tenant")
        if tenant:
            t = by_tenant[tenant]
            t["tenant"] = tenant
            t["verticals"].add(f["vertical_key"])
            t["usecases"].add(f["usecase"])
            if flow_id not in t["flows"]:
                t["flows"].append(flow_id)
        for scene_idx, scene in enumerate(f.get("scenes") or []):
            personas_to_check = []
            if scene.get("persona"):
                personas_to_check.append(scene["persona"])
            for b in (scene.get("beats") or []):
                if b.get("persona"):
                    personas_to_check.append(b["persona"])
            for p in personas_to_check:
                name = (p.get("name") or "").strip()
                if not name:
                    continue
                role = (p.get("role") or "").strip()
                side = p.get("side")
                rec = by_name[name]
                rec["name"] = name
                if role:
                    rec["roles"].add(role)
                if side:
                    rec["sides"].add(side)
                if flow_id not in rec["flows"]:
                    rec["flows"].append(flow_id)
                if rec["first_appearance"] is None:
                    rec["first_appearance"] = f"{flow_id} S{scene_idx+1}"
    # Convert sets → sorted lists for JSON serialization
    out_names = []
    for nm, rec in by_name.items():
        out_names.append({
            "name": nm,
            "roles": sorted(rec["roles"]),
            "sides": sorted(rec["sides"]),
            "flows": rec["flows"],
            "flow_count": len(rec["flows"]),
            "first_appearance": rec["first_appearance"],
            "_flags": flag_name(nm, rec),
        })
    out_tenants = []
    for tn, rec in by_tenant.items():
        out_tenants.append({
            "tenant": tn,
            "verticals": sorted(rec["verticals"]),
            "usecases": sorted(rec["usecases"]),
            "flows": rec["flows"],
            "flow_count": len(rec["flows"]),
            "_flags": flag_tenant(tn),
        })
    out_names.sort(key=lambda r: (-len(r["_flags"]), -r["flow_count"], r["name"]))
    out_tenants.sort(key=lambda r: (-len(r["_flags"]), -r["flow_count"], r["tenant"]))
    return out_names, out_tenants


# Patterns to detect risk
REAL_PERSON_PATTERNS = [
    (r"^Cathie Woods?$", "Real-person echo: Cathie Wood is the real founder of ARK Invest."),
    (r"^Warren Buffett", "Real-person reference."),
    (r"^Ray Dalio", "Real-person reference."),
    (r"^Jamie Dimon", "Real-person reference."),
    (r"^Larry Fink", "Real-person reference."),
    (r"^Mary Barra", "Real-person reference."),
]
TM_PATTERNS = [
    (r"\bSchwab\b", "Trademark riff: Schwab evokes Charles Schwab."),
    (r"\bFidelis\b", "Trademark riff: Fidelis evokes Fidelity."),
    (r"\bPershing\b", "Real custodian: Pershing (BNY Mellon)."),
    (r"\bCiti\b|\bCitibank\b", "Real bank reference."),
    (r"\bChase\b", "Real bank reference (JP Morgan Chase)."),
    (r"\bWells Fargo", "Real bank reference."),
    (r"\bAT&T\b", "Real company reference."),
]
GENERIC_NAME_PATTERNS = [
    (r"^(the |Aster |TGK )?signatory$", "Generic placeholder — no named signer."),
    (r"^Authorized Signatory", "Role-as-name placeholder."),
    (r"^AI [Aa]ssistant$", "System persona — by design."),
    (r"^identity verification$", "System persona — by design."),
    (r"^Onboarding Agent$", "System persona — by design."),
]


def flag_name(name, rec):
    flags = []
    for pat, label in REAL_PERSON_PATTERNS:
        if re.search(pat, name):
            flags.append({"type": "real-person", "note": label})
    for pat, label in GENERIC_NAME_PATTERNS:
        if re.search(pat, name):
            flags.append({"type": "placeholder", "note": label})
    # Inconsistent side
    if len(rec["sides"]) > 1:
        flags.append({
            "type": "inconsistent-side",
            "note": f'Same name appears with multiple sides: {sorted(rec["sides"])}.',
        })
    return flags


def flag_tenant(tenant):
    flags = []
    for pat, label in TM_PATTERNS:
        if re.search(pat, tenant, re.IGNORECASE):
            flags.append({"type": "trademark", "note": label})
    # Real bank/firm names
    REAL_FIRMS = ["Citibank", "Chase", "Wells Fargo", "Bank of America", "JPMorgan",
                  "Morgan Stanley", "Goldman Sachs", "BlackRock", "Vanguard",
                  "Fidelity", "Anthropic", "Google", "Meta", "Apple"]
    for r in REAL_FIRMS:
        if r.lower() in tenant.lower():
            flags.append({"type": "real-firm", "note": f"Real firm name: {r}"})
    return flags


# ---------- Main ----------
def main():
    flows = build_flows()
    print(f"Total flows: {len(flows)}")

    # Sequence audit
    seq_rows = []
    for f in flows:
        a = audit_sequence(f)
        seq_rows.append({**f, **a})
    seq_counts = {"OK": 0, "AMBIGUOUS": 0, "MISMATCH": 0}
    for r in seq_rows:
        seq_counts[r["verdict"]] += 1
    sev_order = {"MISMATCH": 0, "AMBIGUOUS": 1, "OK": 2}
    seq_rows.sort(key=lambda r: (sev_order[r["verdict"]],
                                  r["vertical_key"] or "",
                                  r["usecase"] or ""))
    OUT_SEQ.write_text(json.dumps({
        "generated": "2026-04-30",
        "spine_catalog": CANONICAL_SPINES,
        "rows": seq_rows,
        "counts": {**seq_counts, "total": len(seq_rows)},
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUT_SEQ.relative_to(ROOT)}")
    print(f"  total: {len(seq_rows)}  MISMATCH: {seq_counts['MISMATCH']}  "
          f"AMBIGUOUS: {seq_counts['AMBIGUOUS']}  OK: {seq_counts['OK']}")

    # Naming audit
    names, tenants = collect_names(flows)
    OUT_NAMES.write_text(json.dumps({
        "generated": "2026-04-30",
        "characters": names,
        "tenants": tenants,
        "counts": {
            "characters": len(names),
            "tenants": len(tenants),
            "characters_flagged": sum(1 for r in names if r["_flags"]),
            "tenants_flagged": sum(1 for r in tenants if r["_flags"]),
        },
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUT_NAMES.relative_to(ROOT)}")
    print(f"  characters: {len(names)} ({sum(1 for r in names if r['_flags'])} flagged)")
    print(f"  tenants:    {len(tenants)} ({sum(1 for r in tenants if r['_flags'])} flagged)")


if __name__ == "__main__":
    main()
