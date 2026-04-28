#!/usr/bin/env node
/* =========================================================================
 * Story Arc Audit — push queue to /api/audit/submit
 *
 * Reads _audits/audit-payloads-2026-04-27.json, fetches the current
 * /api/audit/storylines from the configured base URL, applies each story's
 * proposed Scene 1 edits as a deep-overlay (matching audit.html's
 * buildChangeSet shape), and POSTs each vertical's overlay as its own
 * /api/audit/submit entry. Each submission gets a per-story rationale note
 * so /admin/audit shows WHY, not just WHAT.
 *
 * Usage:
 *   node _audits/push-audit-queue.mjs --base https://<replit-domain> \
 *        --file _audits/audit-payloads-2026-04-27.json \
 *        --author "Jimmy" \
 *        [--note "wrapper note prepended to each submission"] \
 *        [--include wealth,banking,...]   only push these keys
 *        [--exclude banking,wealth-discovery]   skip these keys
 *        [--dry-run]   print what would be submitted, don't POST
 *        [--skip-follow-up]   skip stories marked "follow_up: true" (default: skip)
 *
 * Notes:
 * - banking and wealth-discovery are marked follow_up:true because they
 *   need iframe re-routing in the shell beyond just copy edits. By default
 *   this script skips them. Pass --no-skip-follow-up to push them anyway.
 * - The endpoint expects {dataset, changes, author, note, source}. Each
 *   `changes` entry is the FULL overlay of the vertical with edits applied
 *   (matches audit.html's buildChangeSet).
 * ========================================================================= */

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = { dryRun: false, skipFollowUp: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') out.base = argv[++i];
    else if (a === '--file') out.file = argv[++i];
    else if (a === '--author') out.author = argv[++i];
    else if (a === '--note') out.note = argv[++i];
    else if (a === '--include') out.include = argv[++i].split(',').map(s => s.trim());
    else if (a === '--exclude') out.exclude = argv[++i].split(',').map(s => s.trim());
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--skip-follow-up') out.skipFollowUp = true;
    else if (a === '--no-skip-follow-up') out.skipFollowUp = false;
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  }
  return out;
}

function printHelp() {
  console.log(`Push story arc audit findings to /api/audit/submit.

Usage:
  node _audits/push-audit-queue.mjs --base <url> --file <payloads.json> --author <name>

Options:
  --base <url>             Replit domain (e.g. https://tgk-2-0.your-name.repl.co)
  --file <path>            Audit payloads JSON (default: _audits/audit-payloads-2026-04-27.json)
  --author <name>          Submitter name shown in the queue
  --note <str>             Wrapper note prepended to each submission
  --include <keys,csv>     Only push these vertical keys
  --exclude <keys,csv>     Skip these vertical keys
  --dry-run                Print payloads, don't POST
  --skip-follow-up         Skip stories with follow_up:true (default ON)
  --no-skip-follow-up      Push everything including follow-up entries
  -h, --help               Show this help
`);
}

function applyEdits(verticalObj, edits) {
  const overlay = JSON.parse(JSON.stringify(verticalObj));
  for (const { path: p, value } of edits) {
    let cur = overlay;
    for (let i = 0; i < p.length - 1; i++) {
      const key = p[i];
      if (cur[key] === undefined) {
        throw new Error(`Path not found: ${p.slice(0, i + 1).join('.')}`);
      }
      cur = cur[key];
    }
    cur[p[p.length - 1]] = value;
  }
  return overlay;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.base) { console.error('--base required (Replit domain)'); process.exit(1); }
  if (!args.author) { console.error('--author required'); process.exit(1); }
  args.file ||= '_audits/audit-payloads-2026-04-27.json';

  const payloadPath = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(payloadPath)) { console.error(`Payload file not found: ${payloadPath}`); process.exit(1); }
  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

  console.log(`-> base:    ${args.base}`);
  console.log(`-> file:    ${args.file}`);
  console.log(`-> dryRun:  ${args.dryRun}`);
  console.log(`-> stories: ${Object.keys(payload.stories).length}\n`);

  // Fetch current storylines from the live endpoint (skip in dry-run)
  let live = null;
  if (!args.dryRun) {
    const url = `${args.base.replace(/\/$/, '')}/api/audit/storylines`;
    process.stdout.write(`Fetching ${url} ... `);
    const r = await fetch(url);
    if (!r.ok) { console.error(`failed (${r.status})`); process.exit(1); }
    live = await r.json();
    console.log(`ok (${Object.keys(live).length} verticals)`);
  }

  const results = [];
  for (const [key, story] of Object.entries(payload.stories)) {
    if (args.include && !args.include.includes(key)) continue;
    if (args.exclude && args.exclude.includes(key)) continue;
    if (args.skipFollowUp && story.follow_up) {
      console.log(`SKIP ${key} (follow_up:true — needs shell iframe re-routing)`);
      continue;
    }

    const editsCount = story.edits.length;
    const note = [args.note, story.rationale].filter(Boolean).join(' — ');
    const summary = `${key} · archetype ${story.archetype} · ${editsCount} field edit${editsCount === 1 ? '' : 's'}`;

    if (args.dryRun) {
      console.log(`DRY ${summary}`);
      console.log(`    note: ${note}`);
      story.edits.forEach(e => console.log(`    set ${e.path.join('.')} = ${JSON.stringify(e.value).slice(0, 80)}${e.value.length > 80 ? '...' : ''}`));
      results.push({ key, status: 'dry-run' });
      continue;
    }

    if (!(key in live)) {
      console.log(`MISS ${key} not in /api/audit/storylines — skipping`);
      results.push({ key, status: 'missing-in-live' });
      continue;
    }

    const overlay = applyEdits(live[key], story.edits);
    const body = {
      dataset: 'storylines',
      changes: { [key]: overlay },
      author: args.author,
      note,
      source: 'cli/push-audit-queue.mjs',
    };

    const r = await fetch(`${args.base.replace(/\/$/, '')}/api/audit/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.log(`FAIL ${summary} :: ${j.error || r.status}`);
      results.push({ key, status: 'fail', error: j.error || r.status });
    } else {
      console.log(`OK   ${summary} :: ${(j.id || '').slice(0, 8)}`);
      results.push({ key, status: 'ok', id: j.id });
    }
  }

  console.log(`\n=== Summary ===`);
  const ok = results.filter(r => r.status === 'ok').length;
  const fail = results.filter(r => r.status === 'fail').length;
  const dry = results.filter(r => r.status === 'dry-run').length;
  console.log(`ok:${ok} fail:${fail} dry:${dry} total:${results.length}`);
  if (fail) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
