#!/usr/bin/env node
/**
 * audit/authenticity-grid.js
 *
 * Generate a single-page HTML grid that shows, for every vertical and every
 * scene+beat in the canonical default arc:
 *
 *   - the inferred Docusign UI template (what plays in the iframe)
 *   - the resolved persona (who's acting at this beat)
 *   - the narration head + lede (truncated)
 *   - drift flags — places where the persona, the template, and the
 *     narration don't all line up.
 *
 * The grid is the tool Jimmy uses to spot scenes where the screen says
 * "signer authenticates" but the narration is voiced from the advisor's
 * POV, or where Scene 2 (Identity) is rendered with a system persona on a
 * client-action template, etc.
 *
 * Output: audit/reports/authenticity-grid-YYYY-MM-DD.html
 *
 * Run:    node audit/authenticity-grid.js
 *
 * No deps beyond the Node standard library + vm (eval the VERTICALS literal).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.resolve(__dirname, '..');
const STORY_SHELL = path.join(REPO_ROOT, 'stories', '_shared', 'story-shell.html');
const OUT_DIR = path.join(__dirname, 'reports');
const today = new Date().toISOString().slice(0, 10);
const OUT_PATH = path.join(OUT_DIR, `authenticity-grid-${today}.html`);

// ---------------------------------------------------------------------------
// VERTICALS literal extraction (mirrors server.js helpers)
// ---------------------------------------------------------------------------

function sliceVerticalsLiteral(src) {
  const m = /const\s+VERTICALS\s*=\s*\{/m.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth=0, i=start, inS=false, inD=false, inT=false, inLC=false, inBC=false;
  const n = src.length;
  while (i < n) {
    const c = src[i], nxt = src[i+1] || '';
    if (inLC) { if (c==='\n') inLC=false; i++; continue; }
    if (inBC) { if (c==='*'&&nxt==='/') {inBC=false;i+=2;continue;} i++; continue; }
    if (inS)  { if (c==='\\') {i+=2;continue;} if (c==="'") inS=false; i++; continue; }
    if (inD)  { if (c==='\\') {i+=2;continue;} if (c==='"') inD=false; i++; continue; }
    if (inT)  { if (c==='\\') {i+=2;continue;} if (c==='`') inT=false; i++; continue; }
    if (c==='/'&&nxt==='/') {inLC=true;i+=2;continue;}
    if (c==='/'&&nxt==='*') {inBC=true;i+=2;continue;}
    if (c==="'") {inS=true;i++;continue;}
    if (c==='"') {inD=true;i++;continue;}
    if (c==='`') {inT=true;i++;continue;}
    if (c==='{') depth++;
    else if (c==='}') { depth--; if (depth===0) return src.slice(start, i+1); }
    i++;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Heuristics: template inference + canonical persona expectation per act
// ---------------------------------------------------------------------------

// Map a scene tag to the Docusign UI template that plays on the right.
// Mirrors the inference table in builder.html and the live shell.
function inferTemplate(tag) {
  const t = String(tag || '').toUpperCase();
  if (/CHAIN[\s-]?OF[\s-]?CUSTODY|CUSTODY/.test(t)) return 'Agreement Desk · COC';
  if (/WORKSPACE|DEAL ROOM/.test(t)) return 'Workspace';
  if (/IDENTITY|IDV|CLEAR/.test(t)) return 'CLEAR';
  if (/SIGNING|SIGN/.test(t))      return 'Signing Ceremony';
  if (/DATA|NAVIGATOR|EXTRACT/.test(t)) return 'Navigator';
  if (/WEBFORM|TRIAGE|QUEUE/.test(t)) return 'Webform';
  if (/MAESTRO/.test(t))           return 'Maestro';
  if (/AGENT/.test(t))             return 'Agents';
  if (/PORTAL/.test(t))            return 'Portal';
  if (/EHR|CLINICAL/.test(t))      return 'EHR';
  return 'Agreement Desk';
}

// Canonical 5-act persona expectations. Scene tag → preferred persona side.
// If a scene's resolved side doesn't match, we flag it for inspection.
function expectedPersonaSideForTag(tag) {
  const t = String(tag || '').toUpperCase();
  if (/IDENTITY|IDV|CLEAR/.test(t))                         return ['client', 'system'];
  if (/SIGNING/.test(t))                                    return ['client'];
  if (/DATA|NAVIGATOR|EXTRACT/.test(t))                     return ['advisor', 'system'];
  if (/WORKSPACE|DEAL ROOM/.test(t))                        return ['advisor', 'handoff'];
  if (/INTAKE|WEBFORM|TRIAGE|QUEUE|SENDER/.test(t))         return ['advisor'];
  if (/CHAIN[\s-]?OF[\s-]?CUSTODY|CUSTODY/.test(t))         return ['advisor', 'system'];
  if (/AGENT/.test(t))                                      return ['system'];
  if (/PORTAL|EHR|CLINICAL/.test(t))                        return ['client'];
  return null; // unknown — don't flag
}

// 5-act fallback (mirrors story-shell.html personaFallback)
function personaFallback(sceneIdx) {
  const map = ['advisor','client','client','advisor','advisor'];
  return { side: map[sceneIdx] || 'system' };
}

// Resolve a beat's persona using the same precedence as renderSidebar:
// per-beat override → scene-level → 5-act fallback.
function resolvePersona(scene, sceneIdx, beat) {
  if (beat && beat.persona) return beat.persona;
  if (scene.persona) return scene.persona;
  return personaFallback(sceneIdx);
}

// Drift heuristics. Returns array of { severity, reason } for one beat row.
//
// The narration-name check now only applies to *human* personas (advisor or
// client). System personas have product-like names ("AI assistant",
// "Onboarding Agent", "CLEAR") that fire false positives when their first
// word is also a common noun. Handoff personas have composite names
// ("Hillside × Aster") that don't read as actors in the narration.
//
// The side-expectation check skips multi-party scenes (Workspace) and
// transitional sides (handoff) — those are legitimate by design.
function detectDrift(scene, sceneIdx, beat, beatIdx, persona, allActorsInScene) {
  const flags = [];
  const tag = scene.tag || '';
  const tagU = tag.toUpperCase();
  const expected = expectedPersonaSideForTag(tag);
  const side = (persona && persona.side) || '';
  const isMultiParty = /WORKSPACE|DEAL ROOM/.test(tagU);

  // 1. Persona side mismatched against scene act.
  //    - skip handoff (legitimate transition in any scene)
  //    - skip workspace scenes (multi-party by design)
  if (expected && side && !expected.includes(side)
      && side !== 'handoff' && !isMultiParty) {
    flags.push({
      severity: 'medium',
      reason: `Scene act implies ${expected.join(' or ')}, persona side is ${side}`
    });
  }

  // 2. Narration name doesn't match persona name (and another known actor's
  //    name appears in the head). Only meaningful when persona is a human
  //    actor (advisor/client). Handoff/system personas have descriptive
  //    names that don't read as actors in narration.
  if (side === 'advisor' || side === 'client') {
    const head = (beat && beat.head) || scene.head || '';
    const personaName = (persona && persona.name) ? persona.name.split(/\s+/)[0] : '';
    if (personaName && head && !head.includes(personaName)) {
      const otherActors = allActorsInScene.filter(a => a && a !== personaName);
      const otherInHead = otherActors.find(a => head.includes(a));
      if (otherInHead) {
        flags.push({
          severity: 'high',
          reason: `Persona is ${personaName} but head names ${otherInHead}`
        });
      }
    }
  }

  return flags;
}

// Collect every named *human* actor across this scene's beats + scene-level
// persona, so detectDrift can spot "head names a different known actor"
// cases. Only advisor + client personas count — system and handoff personas
// have product-like / composite names that pollute the actor set with
// non-actor tokens (e.g. "AI assistant", "Onboarding Agent", "Hillside ×
// Aster") and produce false-positive drift hits.
function collectActors(scene, sceneIdx) {
  const set = new Set();
  const add = (p) => {
    if (!p || !p.name) return;
    if (p.side !== 'advisor' && p.side !== 'client') return;
    const first = p.name.split(/\s+/)[0];
    if (first) set.add(first);
  };
  add(scene.persona);
  if (Array.isArray(scene.beats)) scene.beats.forEach(b => add(b.persona));
  return [...set];
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function shorten(s, n) {
  const t = stripHtml(s);
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

// ---------------------------------------------------------------------------
// Build rows: one per (vertical × scene × beat)
// ---------------------------------------------------------------------------

function buildRows(verticals) {
  const rows = [];
  for (const [key, entry] of Object.entries(verticals)) {
    const scenes = Array.isArray(entry.scenes) ? entry.scenes : null;
    if (!scenes) continue; // per-usecase shape — handled separately when needed
    scenes.forEach((scene, sceneIdx) => {
      const tag = scene.tag || '';
      const tmpl = inferTemplate(tag);
      const actors = collectActors(scene, sceneIdx);
      const beats = Array.isArray(scene.beats) ? scene.beats : [{}];
      // Always emit a scene-opening row first (beatIdx = -1) so the grid shows
      // scene-level persona/head/lede even if beats are empty.
      const sceneOpenPersona = scene.persona || personaFallback(sceneIdx);
      rows.push({
        verticalKey: key,
        verticalLabel: entry.label || key,
        tenant: entry.tenant || '',
        sceneIdx, sceneTag: tag, template: tmpl,
        beatIdx: -1, beatLabel: 'OPEN',
        persona: sceneOpenPersona,
        head: scene.head || '',
        lede: scene.lede || '',
        drift: detectDrift(scene, sceneIdx, null, -1, sceneOpenPersona, actors)
      });
      beats.forEach((beat, beatIdx) => {
        const persona = resolvePersona(scene, sceneIdx, beat);
        rows.push({
          verticalKey: key,
          verticalLabel: entry.label || key,
          tenant: entry.tenant || '',
          sceneIdx, sceneTag: tag, template: tmpl,
          beatIdx, beatLabel: `B${beatIdx + 1}`,
          persona,
          head: beat.head || '',
          lede: beat.lede || '',
          drift: detectDrift(scene, sceneIdx, beat, beatIdx, persona, actors)
        });
      });
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderHtml(rows) {
  const totals = {
    rows: rows.length,
    verticals: new Set(rows.map(r => r.verticalKey)).size,
    drift_high:   rows.filter(r => r.drift.some(d => d.severity === 'high')).length,
    drift_medium: rows.filter(r => r.drift.some(d => d.severity === 'medium')).length,
    drift_low:    rows.filter(r => r.drift.some(d => d.severity === 'low')).length,
  };
  const sideClass = (s) => ({
    advisor:  'side-advisor',
    client:   'side-client',
    system:   'side-system',
    handoff:  'side-handoff'
  })[s] || 'side-unknown';

  const tableRows = rows.map((r, i) => {
    const top = r.drift.find(d => d.severity === 'high')
             || r.drift.find(d => d.severity === 'medium')
             || r.drift.find(d => d.severity === 'low');
    const driftCls = top ? 'has-drift drift-' + top.severity : '';
    const driftCell = top
      ? `<span class="drift-pill drift-${top.severity}" title="${esc(r.drift.map(d=>d.severity+': '+d.reason).join('\n'))}">${top.severity.toUpperCase()}<small>${esc(top.reason)}</small></span>`
      : `<span class="drift-pill drift-ok">OK</span>`;
    const personaName = r.persona && r.persona.name ? r.persona.name : '<em>—</em>';
    const personaRole = r.persona && r.persona.role ? r.persona.role : '';
    const sideTxt = (r.persona && r.persona.side) || '?';
    return `
      <tr class="${driftCls}"
          data-vertical="${esc(r.verticalKey)}"
          data-side="${esc(sideTxt)}"
          data-template="${esc(r.template)}"
          data-scene="${r.sceneIdx + 1}"
          data-drift="${top ? top.severity : 'ok'}">
        <td class="cell-v"><strong>${esc(r.verticalKey)}</strong><br><span class="meta">${esc(r.tenant)}</span></td>
        <td class="cell-scene"><span class="scene-num">S${r.sceneIdx + 1}</span><span class="beat-num">${esc(r.beatLabel)}</span></td>
        <td class="cell-tag"><code>${esc(shorten(r.sceneTag, 60))}</code></td>
        <td class="cell-tmpl"><span class="tmpl-pill">${esc(r.template)}</span></td>
        <td class="cell-persona ${sideClass(sideTxt)}">
          <span class="side-tag">${esc(sideTxt)}</span>
          <strong>${typeof personaName === 'string' ? esc(personaName) : personaName}</strong>
          ${personaRole ? `<span class="persona-role">${esc(personaRole)}</span>` : ''}
        </td>
        <td class="cell-head">${esc(shorten(r.head, 100))}</td>
        <td class="cell-lede">${esc(shorten(r.lede, 130))}</td>
        <td class="cell-drift">${driftCell}</td>
      </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>TGK 2.0 — Authenticity grid (${today})</title>
<style>
  @font-face { font-family:"DSIndigo"; src:url("https://docucdn-a.akamaihd.net/olive/fonts/3.1.0/DSIndigo-Regular.woff2") format("woff2"); font-weight:400; font-display:swap; }
  @font-face { font-family:"DSIndigo"; src:url("https://docucdn-a.akamaihd.net/olive/fonts/3.1.0/DSIndigo-Semibold.woff2") format("woff2"); font-weight:600; font-display:swap; }
  @font-face { font-family:"DSIndigo"; src:url("https://docucdn-a.akamaihd.net/olive/fonts/3.1.0/DSIndigo-Bold.woff2") format("woff2"); font-weight:700; font-display:swap; }
  :root {
    --ds-deep-violet: #26065D;
    --ds-inkwell:     #130032;
    --ds-ecru:        #F8F3F0;
    --ds-white:       #FFFFFF;
    --ds-mist:        #CBC2FF;
    --ds-poppy:       #FF5252;
    --ds-cobalt:      #4C00FF;
    --ds-mint:        #3FDA99;
    --ds-amber:       #E8A438;
    --hair:           rgba(19,0,50,0.10);
    --hair-strong:    rgba(19,0,50,0.20);
    --ink-soft:       rgba(19,0,50,0.55);
    --ds-font:        "DSIndigo", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --ds-mono:        "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    font-family: var(--ds-font);
    color: var(--ds-inkwell);
    background: var(--ds-ecru);
  }
  header.top {
    padding: 28px 32px 18px;
    border-bottom: 1px solid var(--hair);
    background: var(--ds-white);
    position: sticky; top: 0; z-index: 30;
  }
  header.top h1 {
    margin: 0 0 6px; font-size: 1.5rem; font-weight: 700;
    letter-spacing: -0.015em;
  }
  header.top h1 em { font-style: italic; font-weight: 500; color: var(--ds-cobalt); }
  header.top .meta {
    display: flex; gap: 18px; flex-wrap: wrap;
    font-size: 0.875rem; color: var(--ink-soft);
    margin-bottom: 14px;
  }
  header.top .meta strong { color: var(--ds-inkwell); font-weight: 600; }
  header.top .legend {
    display: flex; gap: 14px; flex-wrap: wrap;
    font-size: 0.8125rem; align-items: center;
    margin-bottom: 12px;
  }
  header.top .legend-item {
    display: inline-flex; align-items: center; gap: 6px;
  }
  .swatch {
    width: 12px; height: 12px; border-radius: 3px;
    flex-shrink: 0; border: 1px solid var(--hair);
  }
  .swatch.advisor  { background: var(--ds-mint); }
  .swatch.client   { background: var(--ds-cobalt); }
  .swatch.system   { background: var(--ink-soft); }
  .swatch.handoff  { background: linear-gradient(135deg,var(--ds-mint) 0% 50%, var(--ds-cobalt) 50% 100%); }

  .filter-bar {
    display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
    font-size: 0.875rem;
  }
  .filter-bar input, .filter-bar select {
    font-family: var(--ds-font);
    font-size: 0.875rem;
    padding: 6px 10px;
    border: 1px solid var(--hair-strong);
    border-radius: 6px;
    background: var(--ds-white);
    color: var(--ds-inkwell);
    min-width: 130px;
  }
  .filter-bar input:focus, .filter-bar select:focus {
    outline: none; border-color: var(--ds-cobalt);
  }
  .filter-bar label {
    font-size: 0.75rem; color: var(--ink-soft);
    text-transform: uppercase; letter-spacing: 0.08em;
    font-weight: 600;
  }
  .filter-bar .toggle {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 0.875rem; cursor: pointer;
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid var(--hair-strong);
    background: var(--ds-white);
    user-select: none;
  }
  .filter-bar .toggle.is-on {
    background: var(--ds-deep-violet);
    color: var(--ds-ecru);
    border-color: var(--ds-deep-violet);
  }
  .filter-bar .count {
    margin-left: auto; font-family: var(--ds-mono);
    font-size: 0.75rem; color: var(--ink-soft);
  }

  table.grid {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
    background: var(--ds-white);
  }
  table.grid thead th {
    position: sticky; top: 162px;
    background: var(--ds-deep-violet);
    color: var(--ds-ecru);
    font-size: 0.6875rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 700;
    text-align: left;
    padding: 9px 10px;
    border-bottom: 2px solid var(--ds-deep-violet);
    z-index: 5;
  }
  table.grid tbody td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--hair);
    vertical-align: top;
    line-height: 1.4;
  }
  table.grid tbody tr:hover td { background: rgba(76, 0, 255, 0.04); }

  /* Drift row tinting */
  table.grid tbody tr.has-drift.drift-high td   { background: rgba(255, 82, 82, 0.06); }
  table.grid tbody tr.has-drift.drift-medium td { background: rgba(232, 164, 56, 0.06); }
  table.grid tbody tr.has-drift.drift-low td    { background: rgba(203, 194, 255, 0.10); }

  /* Cells */
  .cell-v { white-space: nowrap; min-width: 110px; }
  .cell-v strong {
    font-family: var(--ds-mono);
    font-size: 0.75rem;
    color: var(--ds-deep-violet);
    text-transform: lowercase;
  }
  .cell-v .meta {
    font-size: 0.6875rem;
    color: var(--ink-soft);
  }
  .cell-scene { white-space: nowrap; }
  .cell-scene .scene-num {
    display: inline-block;
    font-family: var(--ds-mono);
    font-size: 0.6875rem; font-weight: 700;
    background: var(--ds-deep-violet);
    color: var(--ds-ecru);
    padding: 1px 6px;
    border-radius: 3px;
    margin-right: 6px;
  }
  .cell-scene .beat-num {
    font-family: var(--ds-mono);
    font-size: 0.6875rem;
    color: var(--ink-soft);
    font-weight: 600;
  }
  .cell-tag code {
    font-family: var(--ds-mono); font-size: 0.6875rem;
    background: rgba(19, 0, 50, 0.04);
    padding: 1px 5px;
    border-radius: 3px;
    color: var(--ds-deep-violet);
  }
  .cell-tmpl .tmpl-pill {
    display: inline-block;
    font-family: var(--ds-mono);
    font-size: 0.6875rem; font-weight: 700;
    padding: 2px 8px; border-radius: 999px;
    background: rgba(76, 0, 255, 0.08);
    color: var(--ds-cobalt);
    border: 1px solid rgba(76, 0, 255, 0.2);
    white-space: nowrap;
  }
  .cell-persona { min-width: 200px; }
  .cell-persona .side-tag {
    display: inline-block;
    font-family: var(--ds-mono); font-size: 0.625rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
    padding: 1px 6px; border-radius: 3px;
    margin-right: 6px; vertical-align: middle;
  }
  .cell-persona.side-advisor .side-tag { background: rgba(63, 218, 153, 0.18); color: #1F7A5C; }
  .cell-persona.side-client  .side-tag { background: rgba(76, 0, 255, 0.10); color: var(--ds-cobalt); }
  .cell-persona.side-system  .side-tag { background: rgba(19, 0, 50, 0.06); color: var(--ink-soft); }
  .cell-persona.side-handoff .side-tag { background: linear-gradient(90deg, rgba(63,218,153,0.18) 0% 50%, rgba(76,0,255,0.10) 50% 100%); color: var(--ds-deep-violet); }
  .cell-persona strong { font-size: 0.8125rem; color: var(--ds-inkwell); }
  .cell-persona .persona-role {
    display: block;
    font-size: 0.6875rem;
    color: var(--ink-soft);
    margin-top: 2px;
  }
  .cell-head { max-width: 280px; font-weight: 500; }
  .cell-lede { max-width: 360px; color: rgba(19,0,50,0.7); font-size: 0.75rem; }

  .drift-pill {
    display: inline-block;
    font-family: var(--ds-mono); font-size: 0.625rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
    padding: 2px 8px; border-radius: 999px;
    line-height: 1.4;
    cursor: help;
  }
  .drift-pill small {
    display: block;
    font-size: 0.625rem;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    margin-top: 2px;
    color: var(--ds-inkwell);
    max-width: 200px;
  }
  .drift-pill.drift-ok     { background: rgba(63, 218, 153, 0.14); color: #1F7A5C; }
  .drift-pill.drift-low    { background: rgba(203, 194, 255, 0.32); color: var(--ds-deep-violet); }
  .drift-pill.drift-medium { background: rgba(232, 164, 56, 0.18); color: #8C5C0E; }
  .drift-pill.drift-high   { background: rgba(255, 82, 82, 0.18); color: #B23030; }

  /* Hide rows when filter says so */
  tr.is-hidden { display: none; }

  /* Compact mode toggle */
  body.compact .cell-lede { display: none; }
  body.compact .cell-head { max-width: none; }

  @media print {
    header.top { position: static; }
    table.grid thead th { position: static; }
  }
</style>
</head>
<body>

<header class="top">
  <h1>Authenticity grid · <em>persona × template × narration</em></h1>
  <div class="meta">
    <span><strong>${totals.verticals}</strong> verticals</span>
    <span><strong>${totals.rows}</strong> rows</span>
    <span><strong style="color:#B23030">${totals.drift_high}</strong> high-severity drift</span>
    <span><strong style="color:#8C5C0E">${totals.drift_medium}</strong> medium drift</span>
    <span><strong style="color:var(--ds-deep-violet)">${totals.drift_low}</strong> low drift</span>
    <span style="color: var(--ink-soft); font-size: 0.75rem;">Source: stories/_shared/story-shell.html · canonical default usecase only</span>
  </div>

  <div class="legend">
    <span class="legend-item"><span class="swatch advisor"></span> Advisor</span>
    <span class="legend-item"><span class="swatch client"></span> Client / Signer</span>
    <span class="legend-item"><span class="swatch system"></span> System</span>
    <span class="legend-item"><span class="swatch handoff"></span> Handoff</span>
    <span style="color: var(--ink-soft); font-size: 0.75rem;">·</span>
    <span class="legend-item"><span class="drift-pill drift-high">HIGH</span></span>
    <span class="legend-item"><span class="drift-pill drift-medium">MED</span></span>
    <span class="legend-item"><span class="drift-pill drift-low">LOW</span></span>
  </div>

  <div class="filter-bar">
    <label>Search</label>
    <input id="q" type="search" placeholder="vertical / persona / head / lede" />
    <label>Vertical</label>
    <select id="filter-vertical"><option value="">all</option></select>
    <label>Side</label>
    <select id="filter-side">
      <option value="">all</option>
      <option value="advisor">advisor</option>
      <option value="client">client</option>
      <option value="system">system</option>
      <option value="handoff">handoff</option>
    </select>
    <label>Template</label>
    <select id="filter-template"><option value="">all</option></select>
    <label>Scene</label>
    <select id="filter-scene">
      <option value="">all</option>
      <option value="1">1</option><option value="2">2</option><option value="3">3</option>
      <option value="4">4</option><option value="5">5</option>
    </select>
    <span class="toggle" id="toggle-drift">drift only</span>
    <span class="toggle" id="toggle-compact">compact</span>
    <span class="count" id="count">${totals.rows} / ${totals.rows}</span>
  </div>
</header>

<table class="grid">
  <thead>
    <tr>
      <th>Vertical</th>
      <th>S · Beat</th>
      <th>Scene tag</th>
      <th>Template</th>
      <th>Persona</th>
      <th>Head</th>
      <th>Lede</th>
      <th>Drift</th>
    </tr>
  </thead>
  <tbody id="rows">
${tableRows}
  </tbody>
</table>

<script>
(function () {
  const rows = Array.from(document.querySelectorAll('#rows tr'));
  const $q = document.getElementById('q');
  const $fv = document.getElementById('filter-vertical');
  const $fs = document.getElementById('filter-side');
  const $ft = document.getElementById('filter-template');
  const $fsc = document.getElementById('filter-scene');
  const $count = document.getElementById('count');
  const $tog = document.getElementById('toggle-drift');
  const $tog2 = document.getElementById('toggle-compact');
  let driftOnly = false;

  // Populate filter selects from data
  const verticals = [...new Set(rows.map(r => r.dataset.vertical))].sort();
  for (const v of verticals) {
    const o = document.createElement('option'); o.value = v; o.textContent = v;
    $fv.appendChild(o);
  }
  const templates = [...new Set(rows.map(r => r.dataset.template))].sort();
  for (const t of templates) {
    const o = document.createElement('option'); o.value = t; o.textContent = t;
    $ft.appendChild(o);
  }

  function apply() {
    const q = $q.value.toLowerCase().trim();
    const fv = $fv.value, fs = $fs.value, ft = $ft.value, fsc = $fsc.value;
    let visible = 0;
    for (const r of rows) {
      let show = true;
      if (fv && r.dataset.vertical !== fv) show = false;
      if (show && fs && r.dataset.side !== fs) show = false;
      if (show && ft && r.dataset.template !== ft) show = false;
      if (show && fsc && r.dataset.scene !== fsc) show = false;
      if (show && driftOnly && r.dataset.drift === 'ok') show = false;
      if (show && q) {
        const hay = r.textContent.toLowerCase();
        if (!hay.includes(q)) show = false;
      }
      r.classList.toggle('is-hidden', !show);
      if (show) visible++;
    }
    $count.textContent = visible + ' / ' + rows.length;
  }

  [$q, $fv, $fs, $ft, $fsc].forEach(el => el.addEventListener('input', apply));
  $tog.addEventListener('click', () => {
    driftOnly = !driftOnly;
    $tog.classList.toggle('is-on', driftOnly);
    apply();
  });
  $tog2.addEventListener('click', () => {
    document.body.classList.toggle('compact');
    $tog2.classList.toggle('is-on', document.body.classList.contains('compact'));
  });
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const src = fs.readFileSync(STORY_SHELL, 'utf-8');
const lit = sliceVerticalsLiteral(src);
if (!lit) {
  console.error('Could not slice VERTICALS literal — aborting.');
  process.exit(1);
}
const verticals = vm.runInNewContext('(' + lit + ')', {}, { timeout: 2000 });
const rows = buildRows(verticals);
const html = renderHtml(rows);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_PATH, html);

const driftRows = rows.filter(r => r.drift.length > 0);
console.log(`Wrote ${OUT_PATH}`);
console.log(`  ${rows.length} rows · ${new Set(rows.map(r => r.verticalKey)).size} verticals`);
console.log(`  ${driftRows.length} rows with drift flags`);
console.log(`    high:   ${rows.filter(r => r.drift.some(d=>d.severity==='high')).length}`);
console.log(`    medium: ${rows.filter(r => r.drift.some(d=>d.severity==='medium')).length}`);
console.log(`    low:    ${rows.filter(r => r.drift.some(d=>d.severity==='low')).length}`);
