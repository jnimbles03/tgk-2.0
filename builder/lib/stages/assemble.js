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

// Short, on-brand taglines for the auto-advance splash card shown before each
// demo. Keyed by catalog id; falls back to '' (card still renders with the
// label) for any id not listed. No emoji, per brand.
const BLURB = {
  'web-forms':         'Capture the request up front — one link, fully triaged.',
  'esignature':        'Sign anywhere, on any device — no print, no courier.',
  'idv-clear':         'Verify identity once with CLEAR; trust it everywhere downstream.',
  'idv-idme':          'Government-grade identity proofing with ID.me.',
  'idv-apple-wallet':  'Tap to verify with a digital ID in Apple Wallet.',
  'idv-idverse':       'Document scan and liveness check in seconds.',
  'idv-risk':          'Adaptive, risk-based step-up — friction only when it is warranted.',
  'navigator':         'Every clause and counterparty, extracted and queryable.',
  'search':            'Ask in plain language; find the agreement that matters.',
  'workspaces':        'One shared room where the deal lives after signing.',
  'maestro':           'Orchestration in the open — fan out, wait, retry, audit.',
  'agreement-desk':    'The queue where agreements are assembled and dispatched.',
  'agreement-manager': 'Track obligations, renewals, and lifecycle in one place.',
  'monitor':           'Continuous compliance monitoring with real-time alerts.',
  'data-verification': 'Verify income, employment, and identity data at the source.',
  'app-center':        'Extend the platform with connectors and integrations.',
  'ai-review':         'AI redlines clauses and flags risk before you sign.',
  'agentforce':        'Let an AI agent pick up the next action automatically.',
  'clm':               'Author, negotiate, and redline contracts end to end.',
};

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

    // Per-demo title-card content for the client-side auto-advance splash.
    const splashMeta = JSON.stringify(
      ids.map(id => ({ label: CATALOG[id].label, blurb: BLURB[id] || '' }))
    ).replace(/</g, '\\u003c');

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
// auto-advance splash / title card shown before each demo
'.splash{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;' +
'text-align:center;padding:40px;color:#fff;' +
'background:radial-gradient(circle at 30% 20%,color-mix(in srgb,var(--accent) 24%,#15082E),#15082E);' +
'opacity:1;transition:opacity .4s}' +
'.splash.hidden{opacity:0;pointer-events:none}' +
'.splash-inner{max-width:560px}' +
'.splash-eyebrow{font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;' +
'color:var(--accent);margin-bottom:18px}' +
'.splash-title{font-size:38px;font-weight:680;letter-spacing:-.5px;line-height:1.1;margin-bottom:16px}' +
'.splash-blurb{font-size:15px;line-height:1.55;color:#cfc7e6;margin-bottom:30px;min-height:1px}' +
'.splash-bar{width:200px;height:3px;border-radius:3px;background:rgba(255,255,255,.18);' +
'margin:0 auto;overflow:hidden}' +
'.splash-bar-fill{height:100%;width:0;background:var(--accent);border-radius:3px}' +
'.splash-skip{margin-top:24px;background:transparent;border:1px solid rgba(255,255,255,.3);' +
'color:#cfc7e6;font:inherit;font-size:12px;font-weight:550;padding:7px 16px;border-radius:999px;cursor:pointer}' +
'.splash-skip:hover{border-color:#fff;color:#fff}' +
'</style></head><body>' +
'<div class="top-bar"><div class="logo">Docusign</div><div class="title">' + tenant + '</div>' +
(summary ? '<div class="dot"></div><div class="summary">' + summary + '</div>' : '') +
'</div>' +
'<div class="nav-bar">' + navItems + '</div>' +
'<div class="demo-area">' + frames +
'<div class="splash hidden" id="splash"><div class="splash-inner">' +
'<div class="splash-eyebrow" id="splashEyebrow"></div>' +
'<h2 class="splash-title" id="splashTitle"></h2>' +
'<p class="splash-blurb" id="splashBlurb"></p>' +
'<div class="splash-bar"><div class="splash-bar-fill" id="splashFill"></div></div>' +
'<button class="splash-skip" id="splashSkip" onclick="revealNow()">Skip</button>' +
'</div></div>' +
'</div>' +
'<script>' +
'var DEMOS=' + splashMeta + ';' +
'var SPLASH_MS=2600;var splashTimer=null;var curIdx=0;' +
'function revealNow(){if(splashTimer){clearTimeout(splashTimer);splashTimer=null;}' +
'document.getElementById("splash").classList.add("hidden");}' +
'function showSplash(i){var sp=document.getElementById("splash");var d=DEMOS[i]||{};' +
'document.getElementById("splashEyebrow").textContent="Up next \\u00b7 Demo "+(i+1)+" of "+DEMOS.length;' +
'document.getElementById("splashTitle").textContent=d.label||"";' +
'document.getElementById("splashBlurb").textContent=d.blurb||"";' +
'sp.classList.remove("hidden");' +
'var fill=document.getElementById("splashFill");' +
'fill.style.transition="none";fill.style.width="0%";void fill.offsetWidth;' +
'fill.style.transition="width "+SPLASH_MS+"ms linear";fill.style.width="100%";' +
'if(splashTimer)clearTimeout(splashTimer);splashTimer=setTimeout(revealNow,SPLASH_MS);}' +
'function showDemo(i){' +
'document.querySelectorAll(".demo-frame").forEach((f,j)=>f.classList.toggle("hidden",j!==i));' +
'document.querySelectorAll(".nav-btn").forEach((b,j)=>b.classList.toggle("active",j===i));' +
'curIdx=i;showSplash(i);}' +
// play the title card for the first demo on load
'showSplash(0);' +
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
