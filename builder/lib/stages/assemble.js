'use strict';
const fs   = require('fs');
const path = require('path');
const { CATALOG, resolveId, embedUrl } = require('../demo-catalog');

/* =========================================================================
   assemble.js — stitch the matched demo modules into a single tabbed portal.

   Each tab is one demo from the new /demos/ library, embedded via the shared
   engine in embed mode and re-skinned for this tenant entirely through URL
   params (engine reads brand/lw/sub/mark/accent/pack). No string-replacement,
   no copies of the demo HTML — the portal references the live demos so they
   stay current.

   NOTE: the demos load via absolute /demos/<file> URLs, so the assembled
   portal is meant to be opened on the hosted site (Replit / Pages), matching
   the rest of TGK 2.0's absolute-path convention.
   ========================================================================= */

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

async function runAssemble(jobId, jobStore) {
  jobStore.updateStage(jobId, 'assemble', { status:'running', started_at:new Date().toISOString() });
  try {
    const match = jobStore.readBlob(jobId, 'match.json');
    if (!match) return jobStore.failStage(jobId, 'assemble', 'cannot_proceed', 'no match.json');

    // Resolve + de-dupe template ids (drop anything not in the catalog).
    const seen = new Set();
    let ids = (match.templates || [])
      .map(resolveId)
      .filter(id => id && !seen.has(id) && seen.add(id));
    if (!ids.length) ids = ['workspaces'];

    const accent = match.primaryColor || '#4C00FF';
    const brand  = {
      tenantName:   match.tenantName,
      primaryColor: accent,
      vertical:     match.vertical,
      logoWord:     match.logoWord,
      logoSub:      match.logoSub,
      mark:         match.mark,
    };

    const navItems = ids.map((id, i) =>
      '<button class="nav-btn' + (i === 0 ? ' active' : '') + '" data-i="' + i + '" onclick="showDemo(' + i + ')">'
      + esc(CATALOG[id].label) + '</button>'
    ).join('');

    const frames = ids.map((id, i) => {
      const url = embedUrl(id, brand);
      return '<iframe class="demo-frame' + (i === 0 ? '' : ' hidden') + '" id="frame-' + i + '"'
        + ' src="' + esc(url) + '" loading="lazy"'
        + ' title="' + esc(CATALOG[id].label) + '"></iframe>';
    }).join('');

    const tenant  = esc(match.tenantName || 'Demo');
    const summary = esc(match.summary || '');

    const out =
'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>' + tenant + ' — TGK Demo</title>' +
'<style>' +
':root{--accent:' + accent + ';--ink:#1B1B29;--muted:#6A6A7B;--line:#E7E4DE;--bg:#F4F1EC;--chrome:#FFFFFF}' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'html,body{height:100%}' +
'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;' +
'background:var(--bg);color:var(--ink);display:flex;flex-direction:column;height:100vh}' +
'.top-bar{background:var(--chrome);border-bottom:1px solid var(--line);padding:14px 24px;' +
'display:flex;align-items:center;gap:16px;flex-shrink:0}' +
'.logo{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}' +
'.title{font-size:15px;font-weight:650;flex-shrink:0}' +
'.dot{width:4px;height:4px;border-radius:50%;background:var(--line)}' +
'.summary{font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
'.nav-bar{background:var(--chrome);border-bottom:1px solid var(--line);padding:10px 24px;' +
'display:flex;gap:8px;flex-shrink:0;overflow-x:auto}' +
'.nav-btn{background:transparent;border:1px solid var(--line);border-radius:999px;color:var(--muted);' +
'font:inherit;font-size:13px;font-weight:550;padding:7px 15px;cursor:pointer;white-space:nowrap;' +
'transition:border-color .15s,color .15s,background .15s}' +
'.nav-btn:hover{border-color:var(--accent);color:var(--ink)}' +
'.nav-btn.active{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent);color:var(--ink)}' +
'.demo-area{flex:1;position:relative;background:var(--bg)}' +
'.demo-frame{position:absolute;inset:0;width:100%;height:100%;border:none;background:#fff}' +
'.demo-frame.hidden{display:none}' +
'</style></head><body>' +
'<div class="top-bar"><div class="logo">Docusign</div><div class="title">' + tenant + '</div>' +
(summary ? '<div class="dot"></div><div class="summary">' + summary + '</div>' : '') +
'</div>' +
'<div class="nav-bar">' + navItems + '</div>' +
'<div class="demo-area">' + frames + '</div>' +
'<script>function showDemo(i){' +
'document.querySelectorAll(".demo-frame").forEach((f,j)=>f.classList.toggle("hidden",j!==i));' +
'document.querySelectorAll(".nav-btn").forEach((b,j)=>b.classList.toggle("active",j===i));}' +
'</script></body></html>';

    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const outFile = ts + '__tgk-demo.html';
    jobStore.writeOutput(jobId, outFile, out);

    const outputsDir = path.join(__dirname, '../../../builder/outputs');
    if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true });
    fs.writeFileSync(path.join(outputsDir, outFile), out);

    jobStore.updateStage(jobId, 'assemble', { status:'completed', completed_at:new Date().toISOString(), output_file:outFile });
    return { ok:true };
  } catch(err) {
    return jobStore.failStage(jobId, 'assemble', 'error', String(err.message||err));
  }
}

module.exports = { runAssemble };
