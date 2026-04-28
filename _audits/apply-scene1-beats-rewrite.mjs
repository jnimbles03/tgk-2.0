#!/usr/bin/env node
/* =========================================================================
 * Replace canonical Scene 1's beats[0..4] with intake-mechanics Scene 1
 * beats for the 19 webform-archetype verticals. Skips insurance-life and
 * provider-roi (genuine C-archetype inbound — Agreement Desk beats remain
 * correct).
 *
 * The audit pass updated Scene 1 tag/head/lede/beat-1-head; this fixes
 * beats 2-5 which still describe Agreement Desk queue mechanics ("ticket
 * surfaces", "open the activity feed", "Documents tab", etc.) instead of
 * the webform journey ("select entity type", "configuration drives doc
 * set", "Maestro packaging preview", etc.).
 *
 * Source for the new beats: _audits/usecase-narrations-2026-04-27.json
 * → verticals[<key>].usecases.intake.scenes[0].beats
 *
 * Usage:
 *   node _audits/apply-scene1-beats-rewrite.mjs               # apply
 *   node _audits/apply-scene1-beats-rewrite.mjs --dry-run     # report only
 * ========================================================================= */

import fs from 'node:fs';

const DRY_RUN = process.argv.includes('--dry-run');
const SHELL_PATH      = 'stories/_shared/story-shell.html';
const NARRATIONS_PATH = '_audits/usecase-narrations-2026-04-27.json';

/* C-archetype verticals — skip these (Agreement Desk beats remain correct
 * because the flow IS genuinely inbound). */
const SKIP = new Set(['insurance-life', 'provider-roi']);

const narrations = JSON.parse(fs.readFileSync(NARRATIONS_PATH, 'utf8'));
let shell = fs.readFileSync(SHELL_PATH, 'utf8');
const originalLen = shell.length;

function findVerticalBlock(shell, key) {
  const escKey = key.replace(/-/g, '\\-');
  const patterns = [
    new RegExp(`\\n\\s*"${escKey}":\\s*\\{`, 'g'),
    new RegExp(`\\n\\s*${escKey}:\\s*\\{`, 'g'),
  ];
  for (const p of patterns) {
    const m = p.exec(shell);
    if (m) return m.index;
  }
  return -1;
}

/* Render the beats array as JS source matching the existing shell style:
 * one beat per line, `head:"..."` (double-quoted) and `lede:`...`` (template
 * literal). Falls back to JSON.stringify if the lede contains backticks. */
function renderBeats(beats) {
  const lines = beats.map(b => {
    const headJs = JSON.stringify(b.head);
    let ledeJs;
    if (b.lede.includes('`') || b.lede.includes('${')) {
      ledeJs = JSON.stringify(b.lede);
    } else {
      ledeJs = '`' + b.lede + '`';
    }
    return `         {head:${headJs}, lede:${ledeJs}}`;
  });
  return '[\n' + lines.join(',\n') + '\n       ]';
}

const results = [];

for (const [key, data] of Object.entries(narrations.verticals || {})) {
  if (SKIP.has(key)) {
    results.push({ key, status: 'skip-C-archetype' });
    continue;
  }
  const newBeats = data?.usecases?.intake?.scenes?.[0]?.beats;
  if (!newBeats || !Array.isArray(newBeats) || newBeats.length === 0) {
    results.push({ key, status: 'no-intake-beats' });
    continue;
  }

  const blockStart = findVerticalBlock(shell, key);
  if (blockStart === -1) { results.push({ key, status: 'vertical-not-found' }); continue; }

  /* Locate `scenes:[` then the first scene's `{`, then the beats:[...]
   * array within that first scene. End of beats array is the first `]`
   * after `beats:[`, accounting for the template literals (which don't
   * contain `]`). */
  const scenesIdx = shell.indexOf('scenes:[', blockStart);
  if (scenesIdx === -1) { results.push({ key, status: 'scenes-not-found' }); continue; }
  const firstSceneStart = shell.indexOf('{', scenesIdx);
  const beatsKeyIdx = shell.indexOf('beats:', firstSceneStart);
  if (beatsKeyIdx === -1) { results.push({ key, status: 'beats-not-found' }); continue; }
  const beatsArrStart = shell.indexOf('[', beatsKeyIdx);
  if (beatsArrStart === -1) { results.push({ key, status: 'beats-array-not-found' }); continue; }
  /* Walk forward to find matching close bracket, treating `[` / `]` inside
   * template-literal strings as not nesting. */
  let depth = 1;
  let i = beatsArrStart + 1;
  let inBacktick = false;
  let inDouble = false;
  while (i < shell.length && depth > 0) {
    const c = shell[i];
    const prev = shell[i - 1];
    if (!inBacktick && !inDouble) {
      if (c === '`') inBacktick = true;
      else if (c === '"') inDouble = true;
      else if (c === '[') depth++;
      else if (c === ']') depth--;
    } else if (inBacktick) {
      if (c === '`' && prev !== '\\') inBacktick = false;
    } else if (inDouble) {
      if (c === '"' && prev !== '\\') inDouble = false;
    }
    i++;
  }
  if (depth !== 0) { results.push({ key, status: 'unmatched-bracket' }); continue; }
  const beatsArrEnd = i;  /* position just past the closing `]` */

  const oldBeats = shell.substring(beatsArrStart, beatsArrEnd);
  const newBeatsSrc = renderBeats(newBeats);

  if (oldBeats === newBeatsSrc) {
    results.push({ key, status: 'unchanged' });
    continue;
  }

  shell = shell.substring(0, beatsArrStart) + newBeatsSrc + shell.substring(beatsArrEnd);
  results.push({ key, status: 'replaced', beatCount: newBeats.length });
}

console.log('=== Per-vertical results ===');
for (const r of results) {
  console.log(`${r.status.padEnd(22)} ${r.key}${r.beatCount ? `  (${r.beatCount} beats)` : ''}`);
}
const replaced = results.filter(r => r.status === 'replaced').length;
const skipped  = results.filter(r => r.status === 'skip-C-archetype').length;
const fail     = results.filter(r => !['replaced','skip-C-archetype','unchanged'].includes(r.status)).length;
const delta    = shell.length - originalLen;
console.log(`\nReplaced: ${replaced}  Skipped (C-archetype): ${skipped}  Failed: ${fail}`);
console.log(`Shell delta: ${delta >= 0 ? '+' : ''}${delta} bytes`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLIED'}`);

if (!DRY_RUN) {
  fs.writeFileSync(SHELL_PATH, shell);
  const html = fs.readFileSync(SHELL_PATH, 'utf8');
  const ss = html.indexOf('<script>');
  const se = html.lastIndexOf('</script>');
  try { new Function(html.slice(ss + 8, se)); console.log('JS syntax check: OK'); }
  catch (e) { console.error('JS syntax FAIL:', e.message); process.exit(1); }
}

if (fail > 0) process.exit(1);
