#!/usr/bin/env python3
"""Generate current-state vendor 'console' component mocks for TGK 2.0 discovery
pages, reusing the exact CSS skeleton from the ServiceNow reference component so
every mock stays visually consistent. Per-vendor chrome (head color, accent,
tabs, nav, main detail, aside, friction) comes from a compact spec list."""
import re, json, os

ROOT = ".."
REF  = os.path.join(ROOT, "components/current-state/component-servicenow-public-sector-csm-public-sector.html")
OUT  = os.path.join(ROOT, "components/current-state")

# Pull the shared <style> block from the reference component verbatim.
ref = open(REF, encoding="utf-8").read()
STYLE = re.search(r'<style>.*?</style>', ref, re.S).group(0)

def themed_style(headbg, accent, bg, headink="#fff"):
    # Override the :root vendor vars with per-vendor values.
    return STYLE.replace(
        "--v-head:#032D42;--v-accent:#62D84E;--v-bg:#F3F5F7;--v-head-ink:#fff;",
        f"--v-head:{headbg};--v-accent:{accent};--v-bg:{bg};--v-head-ink:{headink};")

def tabs_html(tabs):
    return "".join(f'<span class="{ "on" if on else "" }">{t}</span>' for t, on in tabs)

def nav_html(nav):
    out = []
    for item in nav:
        if item.get("head"):
            out.append(f'<h6>{item["head"]}</h6>'); continue
        on = " on" if item.get("on") else ""
        badge = ""
        if item.get("badge"):
            badge = f'<span style="margin-left:auto;background:rgba(0,0,0,0.06);padding:0 6px;border-radius:9px;font-size:9px;">{item["badge"]}</span>'
        if item.get("alert"):
            badge = f'<span style="margin-left:auto;color:#A93434;font-weight:600;">{item["alert"]}</span>'
        ic = item.get("svg", '<rect x="3" y="4" width="18" height="16" rx="2"/>')
        out.append(f'<div class="ni{on}"><svg viewBox="0 0 24 24">{ic}</svg> {item["label"]}{badge}</div>')
    return "".join(out)

def kv_html(kv):
    return "".join(f'<div class="kv"><span class="k">{k}</span><span class="v">{v}</span></div>' for k, v in kv)

def table_html(tbl):
    if not tbl: return ""
    th = "".join(f"<th>{c}</th>" for c in tbl["cols"])
    rows = ""
    for r in tbl["rows"]:
        rows += "<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>"
    return f'<div class="sec"><table><thead><tr>{th}</tr></thead><tbody>{rows}</tbody></table></div>'

def aside_html(aside):
    tasks = "".join(f'<div class="task"><div>{t}</div><div class="due">{d}</div></div>' for t, d in aside.get("tasks", []))
    note = f'<h5 style="margin-top:8px;">{aside["noteHead"]}</h5><div style="font-size:9.5px;color:var(--ink-mid);">{aside["note"]}</div>' if aside.get("note") else ""
    return f'<h5>{aside["h5"]}</h5>{tasks}{note}'

def build(spec):
    style = themed_style(spec["headbg"], spec["accent"], spec.get("bg", "#F3F5F7"), spec.get("headink", "#fff"))
    crumbchip = f' <span class="chip {spec["crumbChipClass"]}">{spec["crumbChip"]}</span>' if spec.get("crumbChip") else ""
    body = f'''<body>
<div class="mock">
<div class="console">
  <div class="c-head">
    <span class="c-logo">{spec["logo"]}</span>
    <span class="c-tabs">{tabs_html(spec["tabs"])}</span>
    <span class="c-user">{spec["user"]}</span>
  </div>
  <div class="c-crumb">{spec["crumb"]}{crumbchip}</div>
  <div class="c-body">
    <div class="c-nav">{nav_html(spec["nav"])}</div>
    <div class="c-main">
<h2>{spec["mainTitle"]}</h2>
{kv_html(spec["kv"])}
{table_html(spec.get("table"))}
</div>
    <div class="c-aside">{aside_html(spec["aside"])}</div>
  </div>
  <div class="c-foot"><div class="friction"><svg viewBox="0 0 24 24"><path d="M12 2 2 22h20z"/><path d="M12 10v5"/><circle cx="12" cy="18" r="0.6" fill="currentColor"/></svg>{spec["friction"]}</div></div>
</div>
</div>
<script id="component-config" type="application/json">
{json.dumps(spec["config"], indent=2)}
</script>
</body>
</html>'''
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Current State — {spec["title"]} | TGK 2.0</title>
<meta name="description" content="{spec["desc"]}">
{style}
</head>
{body}'''
    path = os.path.join(OUT, spec["slug"])
    open(path, "w", encoding="utf-8").write(html)
    return spec["slug"]

if __name__ == "__main__":
    import importlib.util, sys
    specmod = sys.argv[1]
    spec = importlib.util.spec_from_file_location("specs", specmod)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    for s in m.SPECS:
        print("wrote", build(s))
