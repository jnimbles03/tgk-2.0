#!/usr/bin/env python3
"""
Extract persona/firm/document data for every (vertical, usecase) demo flow.

Reads:
  - stories/_shared/story-shell.html  (inline VERTICALS data + inlined JSON narration block)
  - _audits/usecase-narrations-2026-04-27.json  (per-usecase scene narrations)

Writes:
  - _audits/persona-fiction-data.json  (intermediate, structured rows)

The HTML audit page bakes this data inline; this script is the single source.
Re-run after editing demo data to refresh the audit.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHELL = ROOT / "stories" / "_shared" / "story-shell.html"
JSON_NARR = ROOT / "_audits" / "usecase-narrations-2026-04-27.json"
OUT = ROOT / "_audits" / "persona-fiction-data.json"


# ---------- Tenant metadata catalog ----------
# What we *believe* each tenant org is, by name. Used to reason about
# whether the sender role makes sense for that firm type.
TENANT_TYPE = {
    "Hillside": "RIA / wealth advisor",
    "Hillside Advisors": "RIA / wealth advisor",
    "Meridian": "regional commercial bank",
    "Meridian Bank": "regional commercial bank",
    "Cedar": "regional retail bank",
    "Cedar Bank": "regional retail bank",
    "Cedar Federal": "regional retail bank",
    "Sentinel": "P&C insurance carrier",
    "Beacon": "life insurance carrier",
    "Northgate": "P&C insurance carrier",
    "Riverside": "hospital / health system",
    "Unity": "health insurance payor",
    "Helix": "clinical research sponsor / CRO",
    "ARC": "clinical trial site (counterparty)",
    "Silver Mountain": "disability / ERISA payor",
    "Silver Mountain Disability": "disability / ERISA payor",
    "Maple Ridge": "K-12 school district",
    "Cascade": "state SNAP / human services agency",
    "Apex Logistics": "commercial counterparty",
    "Springfield": "municipal permits agency",
    "Northbrook": "municipal licensing agency",
    "Harbor": "state grants agency",
    "Atlas Manufacturing": "commercial borrower (counterparty)",
    "Aster Capital": "institutional client (counterparty)",
    "Ramirez": "homeowner (counterparty)",
    "DOL": "federal labor / unemployment agency",
    "DOL Workforce": "federal labor / unemployment agency",
    "Department of Labor": "federal labor / unemployment agency",
    "Harbor Foundation": "private foundation / grantmaker",
    "Northbrook Health": "hospital / health system",
    "Beacon Mutual": "life insurance carrier",
    "Northgate Mutual": "P&C insurance carrier",
    "Riverside Health": "hospital / health system",
    "Springfield Community Development": "municipal community development agency",
    "Greenhaven Public Works": "municipal public works agency",
    "Eastside Health & Human Services": "county health & human services agency",
    "Cascade County HR": "county HR / employee onboarding",
    "Northbrook Licensing Bureau": "municipal licensing agency",
    "Cascade Medicaid": "state Medicaid agency",
    "Ridgeview Procurement": "state procurement / vendor compliance agency",
    "Cypress Wealth": "RIA / wealth advisor",
    "Catalina Medical Center": "hospital / health system",
}

# What kind of *workflow* the demo is performing. Inferred from scene tags +
# story claim. Used to reason about whether the document type fits.
WORKFLOWS = {
    "wealth": {
        "default":       "institutional client onboarding (RIA → new client)",
        "intake":        "advisor-driven new engagement intake",
        "fraud-fabric":  "client portal login + identity verification",
        "maintenance":   "wealth account maintenance / change request",
        "workspaces":    "advisor-client deal room",
    },
    "wealth-discovery": {
        "default":       "wealth client discovery / process map",
        "intake":        "wealth client discovery intake",
        "fraud-fabric":  "wealth portal CLEAR-at-the-door",
        "maintenance":   "wealth client discovery maintenance",
    },
    "banking": {
        "default":       "commercial loan origination",
        "intake":        "commercial loan intake",
        "fraud-fabric":  "commercial banking portal CLEAR-at-the-door",
        "maintenance":   "commercial banking maintenance",
        "workspaces":    "deal-room driven loan closing",
    },
    "banking-deposits": {
        "default":       "retail account opening",
        "intake":        "retail deposit account intake",
        "fraud-fabric":  "high-value wire / fraud-fabric chain-of-custody",
        "maintenance":   "retail beneficiary / customer maintenance",
    },
    "insurance-pc": {
        "default":       "P&C new business binder issuance",
        "intake":        "P&C FNOL / claim intake",
        "fraud-fabric":  "P&C portal CLEAR-at-the-door",
        "maintenance":   "P&C policy maintenance",
    },
    "insurance-life": {
        "default":       "life new business application",
        "intake":        "life death claim intake (inbound notice)",
        "fraud-fabric":  "life portal CLEAR-at-the-door",
        "maintenance":   "life beneficiary maintenance",
    },
    "hls": {
        "default":       "patient pre-registration / new-patient onboarding",
        "intake":        "patient self-service intake",
        "fraud-fabric":  "patient portal CLEAR-at-the-door",
        "maintenance":   "patient records / consent maintenance",
    },
    "payor": {
        "default":       "health plan member enrollment",
    },
    "lifesciences": {
        "default":       "clinical trial site activation",
        "intake":        "clinical trial intake",
        "fraud-fabric":  "clinical trial portal CLEAR-at-the-door",
        "maintenance":   "clinical trial maintenance",
    },
    "edu": {
        "default":       "student onboarding",
        "intake":        "student records / FERPA intake",
        "fraud-fabric":  "student portal CLEAR-at-the-door",
        "maintenance":   "student records maintenance",
    },
    "education": {  # alias seen in JSON
        "default":       "student onboarding",
        "intake":        "student records / FERPA intake",
        "fraud-fabric":  "student portal CLEAR-at-the-door",
        "maintenance":   "student records maintenance",
    },
    "nonprofit": {
        "default":       "grant package configuration / grantee onboarding",
        "intake":        "nonprofit grant intake",
        "fraud-fabric":  "nonprofit portal CLEAR-at-the-door",
        "maintenance":   "grant maintenance",
    },
    "ps": {  # public sector / state-local-gov
        "default":       "permits / licensing self-service",
        "intake":        "PS self-service intake",
        "fraud-fabric":  "PS portal CLEAR-at-the-door",
        "maintenance":   "PS records maintenance",
    },
    "pubsec": {  # alias
        "default":       "public-sector self-service",
        "intake":        "public-sector intake",
        "fraud-fabric":  "public-sector portal CLEAR-at-the-door",
        "maintenance":   "public-sector maintenance",
    },
    "fedgov": {
        "default":       "federal-agency self-service",
        "intake":        "federal-agency intake",
        "fraud-fabric":  "federal-agency portal CLEAR-at-the-door",
        "maintenance":   "federal-agency maintenance",
    },
    "slgov": {
        "default":       "state benefits eligibility",
        "intake":        "state benefits intake",
        "fraud-fabric":  "state benefits CLEAR-at-the-door",
        "maintenance":   "state benefits maintenance",
    },
    "slgov-recertification": {
        "default":       "state benefits recertification (Maestro-triggered)",
        "intake":        "recertification intake",
        "fraud-fabric":  "recertification CLEAR-at-the-door",
        "maintenance":   "recertification maintenance",
    },
    "auto": {
        "default":       "auto financing / dealer F&I",
    },
    "insurance": {  # alias for general insurance flows
        "default":       "insurance new business",
        "intake":        "insurance intake",
        "fraud-fabric":  "insurance portal CLEAR-at-the-door",
        "maintenance":   "insurance policy maintenance",
    },
    "provider-roi": {  # records-of-information requests
        "default":       "patient records-of-information request fulfillment",
        "intake":        "ROI request intake",
        "fraud-fabric":  "ROI portal CLEAR-at-the-door",
        "maintenance":   "ROI maintenance",
    },
    "slgov-311": {
        "default":       "311 service request",
        "intake":        "311 self-service intake",
        "fraud-fabric":  "311 portal CLEAR-at-the-door",
        "maintenance":   "311 case maintenance",
    },
    "slgov-benefits": {
        "default":       "state benefits eligibility",
        "intake":        "state benefits intake",
        "fraud-fabric":  "state benefits portal CLEAR-at-the-door",
        "maintenance":   "state benefits maintenance",
    },
    "slgov-employee-onboarding": {
        "default":       "state/county employee onboarding",
        "intake":        "employee onboarding intake",
        "fraud-fabric":  "employee portal CLEAR-at-the-door",
        "maintenance":   "employee records maintenance",
    },
    "slgov-licensing": {
        "default":       "municipal licensing",
        "intake":        "licensing intake",
        "fraud-fabric":  "licensing portal CLEAR-at-the-door",
        "maintenance":   "licensing renewal / maintenance",
    },
    "slgov-vendor-compliance": {
        "default":       "state vendor compliance / procurement",
        "intake":        "vendor onboarding intake",
        "fraud-fabric":  "vendor portal CLEAR-at-the-door",
        "maintenance":   "vendor compliance maintenance",
    },
    "provider": {  # alias
        "default":       "patient pre-registration / new-patient onboarding",
        "intake":        "patient self-service intake",
        "fraud-fabric":  "patient portal CLEAR-at-the-door",
        "maintenance":   "patient records / consent maintenance",
    },
    "payor": {
        "default":       "health plan member enrollment",
        "intake":        "health plan enrollment intake",
        "fraud-fabric":  "health plan portal CLEAR-at-the-door",
        "maintenance":   "health plan member maintenance",
    },
}


def load_shell_text():
    return SHELL.read_text(encoding="utf-8")


def extract_inline_verticals(shell_text):
    """
    Walk the VERTICALS object literal. We do this with a JS-ish regex pass
    rather than full JS parsing; it's lossy but adequate because the shape
    is hand-edited and stable. We pull, per vertical, the top-level meta
    (label, tenant, subtitle) and the FIRST scene's tag/head/lede/persona.
    """
    rows = []

    # Find each `VERTICALS = { ... }` body. Walk top-level keys.
    m = re.search(r"const VERTICALS\s*=\s*\{", shell_text)
    if not m:
        return rows
    start = m.end()
    depth = 1
    i = start
    while depth > 0 and i < len(shell_text):
        c = shell_text[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        i += 1
    verticals_body = shell_text[start:i-1]

    # For each top-level key (vertical key followed by `:`), extract its body.
    # Top-level means we're at depth 0 inside verticals_body. Track manually.
    pos = 0
    n = len(verticals_body)
    while pos < n:
        # Skip whitespace and commas
        while pos < n and verticals_body[pos] in " \t\n,\r":
            pos += 1
        if pos >= n:
            break
        # Read a key up to the next `:` at depth 0
        key_match = re.match(r"([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*\{", verticals_body[pos:])
        if not key_match:
            # Probably a comment block — skip the line.
            nl = verticals_body.find("\n", pos)
            if nl == -1:
                break
            pos = nl + 1
            continue
        vkey = key_match.group(1)
        body_start = pos + key_match.end()
        depth = 1
        j = body_start
        while depth > 0 and j < n:
            c = verticals_body[j]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            elif c == '"' or c == "'" or c == "`":
                # skip string
                quote = c
                j += 1
                while j < n:
                    if verticals_body[j] == "\\":
                        j += 2
                        continue
                    if verticals_body[j] == quote:
                        break
                    j += 1
            j += 1
        body = verticals_body[body_start:j-1]
        rows.append({"key": vkey, "body": body})
        pos = j

    parsed = []
    for row in rows:
        body = row["body"]
        meta = {}
        # tenant
        tm = re.search(r'tenant\s*:\s*"([^"]+)"', body)
        meta["tenant"] = tm.group(1) if tm else None
        lm = re.search(r'label\s*:\s*"([^"]+)"', body)
        meta["label"] = lm.group(1) if lm else None
        sm = re.search(r'subtitle\s*:\s*"([^"]+)"', body)
        meta["subtitle"] = sm.group(1) if sm else None
        cm = re.search(r'category\s*:\s*"([^"]+)"', body)
        meta["category"] = cm.group(1) if cm else None
        pm = re.search(r'preset\s*:\s*"([^"]+)"', body)
        meta["preset"] = pm.group(1) if pm else None

        # First scene
        s1 = re.search(
            r'scenes\s*:\s*\[\s*\{\s*tag\s*:\s*"([^"]+)"\s*,\s*head\s*:\s*"([^"]+)"',
            body,
        )
        if s1:
            meta["s1_tag"] = s1.group(1)
            meta["s1_head"] = s1.group(2)
        # Scene-level persona on S1
        # Look for the first `persona:{...}` after `scenes:[`
        s_idx = body.find("scenes")
        if s_idx >= 0:
            persona_block = re.search(
                r'persona\s*:\s*\{\s*side\s*:\s*"([^"]+)"\s*,\s*name\s*:\s*"([^"]*)"\s*,\s*role\s*:\s*"([^"]*)"',
                body[s_idx:s_idx+4000],
            )
            if persona_block:
                meta["s1_persona_side"] = persona_block.group(1)
                meta["s1_persona_name"] = persona_block.group(2)
                meta["s1_persona_role"] = persona_block.group(3)
        # S1 lede — the next `lede:` after `head:` at scene level
        if "s1_head" in meta:
            head_idx = body.find(meta["s1_head"])
            if head_idx >= 0:
                tail = body[head_idx:head_idx+8000]
                lede_m = re.search(
                    r'lede\s*:\s*(["`])([\s\S]+?)\1\s*,',
                    tail,
                )
                if lede_m:
                    meta["s1_lede"] = lede_m.group(2).strip()
        # First beat head (B1 action)
        if "s1_head" in meta:
            head_idx = body.find(meta["s1_head"])
            if head_idx >= 0:
                tail = body[head_idx:head_idx+8000]
                b1 = re.search(
                    r'beats\s*:\s*\[\s*\{\s*head\s*:\s*"([^"]+)"',
                    tail,
                )
                if b1:
                    meta["b1_head"] = b1.group(1)

        meta["vertical_key"] = row["key"]
        meta["usecase"] = "default"
        meta["source"] = "inline VERTICALS"
        parsed.append(meta)
    return parsed


def extract_json_usecases():
    """Parse the per-usecase narrations JSON. Pull S1 head/lede/persona."""
    if not JSON_NARR.exists():
        return []
    try:
        data = json.loads(JSON_NARR.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"WARN: could not parse {JSON_NARR}: {e}", file=sys.stderr)
        return []

    rows = []
    # The JSON shape: { "audit": "...", "scope": [...], "verticals": { vkey: { usecases: { usecase_key: { scenes: [...] } } } } }
    verticals = data.get("verticals") or {}
    for vkey, vbody in verticals.items():
        usecases = (vbody.get("usecases") or {})
        for usecase_key, ucbody in usecases.items():
            scenes = ucbody.get("scenes") or []
            if not scenes:
                continue
            s1 = scenes[0]
            beats = s1.get("beats") or []
            b1 = beats[0] if beats else {}
            row = {
                "vertical_key": vkey,
                "usecase": usecase_key,
                "source": f"JSON · {JSON_NARR.name}",
                "tenant": ucbody.get("tenant") or vbody.get("tenant"),
                "label": vbody.get("label") or vkey,
                "subtitle": ucbody.get("subtitle"),
                "category": ucbody.get("category"),
                "s1_tag": s1.get("tag"),
                "s1_head": s1.get("head"),
                "s1_lede": s1.get("lede"),
                "b1_head": b1.get("head"),
            }
            persona = s1.get("persona") or b1.get("persona") or {}
            if persona:
                row["s1_persona_side"] = persona.get("side")
                row["s1_persona_name"] = persona.get("name")
                row["s1_persona_role"] = persona.get("role")
            rows.append(row)
    return rows


# ---------- Coherence verdict logic ----------
def detect_counterparty(row):
    """Try to pull a counterparty firm/person name from the heads/ledes."""
    text = " ".join(filter(None, [row.get("s1_head"), row.get("s1_lede"), row.get("b1_head"), row.get("subtitle")]))
    if not text:
        return None
    # Subtitle pattern "× FirmName — Action"
    sub = row.get("subtitle") or ""
    m = re.search(r"×\s*([A-Z][A-Za-z0-9 &.'-]+?)\s*—", sub)
    if m:
        return m.group(1).strip()
    # Look for known counterparty markers in the head
    candidates = ["Aster Capital", "Atlas Manufacturing", "Ramirez", "Whitfield",
                  "Apex Logistics", "ARC", "Tan", "Park", "Holcomb", "Avalon"]
    for c in candidates:
        if c in text:
            return c
    return None


def detect_documents(row):
    text = " ".join(filter(None, [row.get("s1_head"), row.get("s1_lede"),
                                   row.get("b1_head"), row.get("subtitle"),
                                   row.get("s1_tag")]))
    if not text:
        return []
    docs = []
    DOC_PATTERNS = {
        "IMA / Investment Management Agreement": r"\b(IMA|Investment Management Agreement|investment advisory agreement)\b",
        "Subadvisory Agreement": r"\b(subadvisory|sub-advisory)\b",
        "Producer Agreement / Advisor Recruiting": r"\b(producer agreement|advisor onboarding|advisor recruiting|U-?4 transfer|protocol)\b",
        "Loan Agreement / Credit Facility": r"\b(loan agreement|credit facility|UCC-?1|personal guaranty|security agreement)\b",
        "HO3 Binder / P&C": r"\b(HO3|binder|prior-claims disclosure|mortgagee notice)\b",
        "FNOL / Claim": r"\b(FNOL|claim|first notice of loss|adjuster)\b",
        "Death Claim Package": r"\b(death claim|death notice|beneficiary claim)\b",
        "Patient Pre-Registration / HIPAA": r"\b(pre-registration|HIPAA|consent to treat|patient portal)\b",
        "SNAP Eligibility": r"\bSNAP\b",
        "Building Permit": r"\b(building permit|permit application)\b",
        "Restaurant License": r"\b(restaurant license|food permit)\b",
        "311 / Civic Service Request": r"\b(311|pothole|service request)\b",
        "Health Plan Enrollment": r"\b(Silver HMO|HMO|health plan|marketplace enroll)\b",
        "Site Activation": r"\b(site activation|investigator|FD&A)\b",
        "Grant Package": r"\b(grant package|grantee|grant agreement)\b",
        "UI Claim": r"\bUI claim|unemployment\b",
    }
    for label, pat in DOC_PATTERNS.items():
        if re.search(pat, text, re.IGNORECASE):
            docs.append(label)
    return docs


def verdict(row):
    """Apply coherence checks. Returns (verdict, [notes])."""
    notes = []
    sender_role = (row.get("s1_persona_role") or "").lower()
    sender_name = row.get("s1_persona_name") or ""
    sender_side = row.get("s1_persona_side")
    tenant = row.get("tenant") or ""
    tenant_type = TENANT_TYPE.get(tenant)
    workflow = WORKFLOWS.get(row.get("vertical_key"), {}).get(row.get("usecase"))
    head = (row.get("s1_head") or "")
    lede = (row.get("s1_lede") or "")
    counterparty = detect_counterparty(row)
    docs = detect_documents(row)

    row["_tenant_type"] = tenant_type
    row["_workflow"] = workflow
    row["_counterparty"] = counterparty
    row["_documents"] = docs

    severity = "OK"

    # Check 1 — tenant type known?
    if not tenant_type:
        severity = "AMBIGUOUS"
        notes.append(f'Tenant "{tenant}" is not in the catalog — workflow type cannot be inferred.')

    # Check 2 — workflow known?
    if not workflow:
        severity = "AMBIGUOUS"
        notes.append(f'No workflow defined for ({row.get("vertical_key")}, {row.get("usecase")}).')

    # Check 3 — sender role coherent with workflow
    if workflow and sender_role:
        # Specific traps:
        # (a) "head of compliance" sending IMAs to a NEW INSTITUTIONAL CLIENT for "advisor onboarding" intent
        if "compliance" in sender_role and "advisor onboarding" in head.lower():
            severity = "MISMATCH"
            notes.append(
                'Sender is "Head of Compliance" but the head implies advisor onboarding (book transfer). '
                'Advisor onboarding is typically owned by Head of Recruiting / Director of Advisor Onboarding, '
                'not Compliance. Document would be a Subadvisory Agreement / Producer Agreement, not an IMA.'
            )
        # (b) Wealth onboarding with IMA where intent is unclear
        if "IMA" in (" ".join(docs)) and tenant_type == "RIA / wealth advisor":
            if "advisor onboarding" in head.lower() or "advisor onboarding" in lede.lower():
                severity = "MISMATCH"
                notes.append(
                    'Document is IMA but story claim mentions "advisor onboarding" — these are two different workflows. '
                    'IMA = client signs to engage RIA. Advisor onboarding = advisor signs to join the firm.'
                )
        # (c) Patient as sender filing their own intake — should be a self-service flow
        if "patient" in sender_role.lower() and "sender" in (row.get("s1_tag") or "").lower():
            severity = "AMBIGUOUS"
            notes.append('Sender is patient but tag says "SENDER WEBFORM" — verify whether patient is sending or self-serving.')

    # Check 4 — document type vs counterparty role
    if "Subadvisory" in " ".join(docs) and "Capital" in (counterparty or ""):
        # Subadvisory implies advisor-to-firm, not advisor-to-client
        notes.append('Subadvisory Agreement detected with institutional-client counterparty — verify document type matches.')

    # Check 5 — fraud-fabric should NOT have document signing in S1
    if row.get("usecase") == "fraud-fabric":
        if any(d for d in docs if "Agreement" in d or "Binder" in d or "Claim" in d):
            notes.append('fraud-fabric usecase shows a document in S1 — this flow should be CLEAR-at-the-door, not signing.')

    # Check 6 — workspaces usecase should mention deal room
    if row.get("usecase") == "workspaces":
        if "deal room" not in (head + " " + lede).lower() and "workspace" not in (head + " " + lede).lower():
            notes.append('workspaces usecase but S1 doesn\'t mention "deal room" or "workspace" — verify orientation.')

    if severity == "OK" and notes:
        severity = "AMBIGUOUS"
    return severity, notes


def main():
    shell = load_shell_text()
    inline = extract_inline_verticals(shell)
    json_rows = extract_json_usecases()
    rows = inline + json_rows

    out_rows = []
    for r in rows:
        sev, notes = verdict(r)
        out_rows.append({**r, "_verdict": sev, "_notes": notes})

    # Sort: MISMATCH first, then AMBIGUOUS, then OK; within group by vertical/usecase
    sev_order = {"MISMATCH": 0, "AMBIGUOUS": 1, "OK": 2}
    out_rows.sort(key=lambda r: (sev_order.get(r["_verdict"], 9),
                                 r.get("vertical_key") or "",
                                 r.get("usecase") or ""))

    payload = {
        "generated": "2026-04-30",
        "source_files": [str(SHELL.relative_to(ROOT)), str(JSON_NARR.relative_to(ROOT))],
        "tenant_catalog": TENANT_TYPE,
        "workflow_catalog": WORKFLOWS,
        "rows": out_rows,
        "counts": {
            "total": len(out_rows),
            "MISMATCH": sum(1 for r in out_rows if r["_verdict"] == "MISMATCH"),
            "AMBIGUOUS": sum(1 for r in out_rows if r["_verdict"] == "AMBIGUOUS"),
            "OK":        sum(1 for r in out_rows if r["_verdict"] == "OK"),
        },
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}")
    print(f"  total rows: {payload['counts']['total']}")
    print(f"  MISMATCH:   {payload['counts']['MISMATCH']}")
    print(f"  AMBIGUOUS:  {payload['counts']['AMBIGUOUS']}")
    print(f"  OK:         {payload['counts']['OK']}")


if __name__ == "__main__":
    main()
