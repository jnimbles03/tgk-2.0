#!/usr/bin/env node
/* =========================================================================
 * Apply Scene 1 archetype copy edits directly into story-shell.html
 *
 * Reads `_audits/audit-payloads-2026-04-27.json`, locates each vertical's
 * VERTICALS entry in the shell, and replaces:
 *   - scenes[0].tag
 *   - scenes[0].head
 *   - scenes[0].lede           (template-literal-quoted)
 *   - scenes[0].beats[0].head
 *
 * Idempotent — running twice produces the same file. Safe to re-run after
 * editing the audit payloads JSON.
 *
 * Does NOT change the iframe target for any vertical. The two D-archetype
 * stories (banking, wealth-discovery) still get the copy edits today; their
 * Scene 1 iframe swap to a Workspaces deal-room is a separate follow-up.
 *
 * Usage:
 *   node _audits/apply-archetype-edits.mjs                  # apply
 *   node _audits/apply-archetype-edits.mjs --dry-run        # report only
 * ========================================================================= */

import fs from 'node:fs';
import path from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');
const SHELL_PATH    = 'stories/_shared/story-shell.html';
const PAYLOADS_PATH = '_audits/audit-payloads-2026-04-27.json';

const payloads = JSON.parse(fs.readFileSync(PAYLOADS_PATH, 'utf8'));
let shell = fs.readFileSync(SHELL_PATH, 'utf8');
const originalLen = shell.length;

/* Find the start of a vertical's VERTICALS entry. Hyphenated keys are
 * quoted in the source ("banking-deposits": {); plain keys are bare
 * (wealth: {). We match either. The match anchors at start-of-line whitespace
 * so we don't trip on "key:" appearing inside a lede string. */
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

/* Within `text`, replace the first occurrence of a specific JS field
 * assignment. `field` is e.g. "tag" or "head". The new value is encoded
 * as a JSON string (double-quoted), which is valid JS. */
function replaceQuotedField(text, field, newValue) {
  const re = new RegExp(`${field}:"[^"]*"`);
  if (!re.test(text)) return { ok: false, text };
  return { ok: true, text: text.replace(re, `${field}:${JSON.stringify(newValue)}`) };
}

/* Replace a template-literal field (lede:`...`). Assumes ledes don't contain
 * backticks themselves (verified true across all 21 verticals — they're HTML
 * paragraphs without code blocks). Source format may use double-quoted
 * strings on rare occasions; handle that too. */
function replaceLedeField(text, newValue) {
  const reBT = /lede:`[^`]*`/;
  if (reBT.test(text)) {
    return { ok: true, text: text.replace(reBT, `lede:${JSON.stringify(newValue)}`) };
  }
  const reDQ = /lede:"[^"]*"/;
  if (reDQ.test(text)) {
    return { ok: true, text: text.replace(reDQ, `lede:${JSON.stringify(newValue)}`) };
  }
  return { ok: false, text };
}

const results = [];

for (const [key, story] of Object.entries(payloads.stories)) {
  const blockStart = findVerticalBlock(shell, key);
  if (blockStart === -1) { results.push({ key, ok: false, reason: 'vertical-not-found' }); continue; }

  /* Within the vertical block, locate `scenes:[` and the first scene's `{`. */
  const scenesIdx = shell.indexOf('scenes:[', blockStart);
  if (scenesIdx === -1) { results.push({ key, ok: false, reason: 'scenes-not-found' }); continue; }
  const firstSceneStart = shell.indexOf('{', scenesIdx);
  /* End the first scene at the start of the second scene (next "{tag:" after
   * the first one), or the closing `]` if there's no second scene. */
  const nextSceneIdx = shell.indexOf('{tag:', firstSceneStart + 1);
  const firstSceneEnd = (nextSceneIdx === -1) ? shell.indexOf(']', firstSceneStart) : nextSceneIdx;

  let sceneText = shell.substring(firstSceneStart, firstSceneEnd);
  const sceneTextOrig = sceneText;
  const fieldsApplied = [];

  for (const edit of story.edits) {
    const p = edit.path.join('.');
    if (p === 'scenes.0.tag') {
      const r = replaceQuotedField(sceneText, 'tag', edit.value);
      if (r.ok) { sceneText = r.text; fieldsApplied.push('tag'); }
      else fieldsApplied.push('tag:MISS');
    } else if (p === 'scenes.0.head') {
      const r = replaceQuotedField(sceneText, 'head', edit.value);
      if (r.ok) { sceneText = r.text; fieldsApplied.push('head'); }
      else fieldsApplied.push('head:MISS');
    } else if (p === 'scenes.0.lede') {
      const r = replaceLedeField(sceneText, edit.value);
      if (r.ok) { sceneText = r.text; fieldsApplied.push('lede'); }
      else fieldsApplied.push('lede:MISS');
    } else if (p === 'scenes.0.beats.0.head') {
      /* Find the first beat — `beats:[\n  {head:"OLD",` — and replace its head. */
      const beatRe = /(beats:\s*\[\s*\{\s*head:)"[^"]*"/;
      if (beatRe.test(sceneText)) {
        sceneText = sceneText.replace(beatRe, `$1${JSON.stringify(edit.value)}`);
        fieldsApplied.push('beats[0].head');
      } else fieldsApplied.push('beats[0].head:MISS');
    } else {
      fieldsApplied.push(`${p}:UNKNOWN-PATH`);
    }
  }

  if (sceneText !== sceneTextOrig) {
    shell = shell.substring(0, firstSceneStart) + sceneText + shell.substring(firstSceneEnd);
  }
  results.push({
    key,
    ok: !fieldsApplied.some(f => f.includes('MISS') || f.includes('UNKNOWN')),
    archetype: story.archetype,
    severity: story.severity,
    fields: fieldsApplied,
    follow_up: !!story.follow_up,
  });
}

console.log('=== Per-vertical results ===');
for (const r of results) {
  const flag = r.follow_up ? ' [follow-up: needs iframe swap]' : '';
  const status = r.ok ? 'OK' : 'PARTIAL';
  console.log(`${status.padEnd(7)} ${r.key.padEnd(28)} ${(r.archetype || '?').padEnd(8)} ${r.severity?.padEnd(8) || ''}  ${r.fields.join(', ')}${flag}`);
}

const ok    = results.filter(r => r.ok).length;
const fail  = results.filter(r => !r.ok).length;
const delta = shell.length - originalLen;
console.log(`\n=== Summary ===`);
console.log(`Verticals processed: ${results.length}`);
console.log(`Fully applied: ${ok}`);
console.log(`Partial / failed: ${fail}`);
console.log(`Shell delta: ${delta >= 0 ? '+' : ''}${delta} bytes`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN — no file written' : 'APPLIED'}`);

if (!DRY_RUN) {
  fs.writeFileSync(SHELL_PATH, shell);
  /* Quick syntax check: extract main <script> and try parsing as a Function. */
  const html = fs.readFileSync(SHELL_PATH, 'utf8');
  const scriptStart = html.indexOf('<script>');
  const scriptEnd   = html.lastIndexOf('</script>');
  const js = html.slice(scriptStart + 8, scriptEnd);
  try {
    new Function(js);
    console.log('JS syntax check: OK');
  } catch (e) {
    console.error('JS syntax check FAILED:', e.message);
    process.exit(1);
  }
}

if (fail) process.exit(1);
