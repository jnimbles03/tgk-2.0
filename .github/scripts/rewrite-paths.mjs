#!/usr/bin/env node
// =============================================================================
// rewrite-paths.mjs
// -----------------------------------------------------------------------------
// Rewrites root-relative paths in HTML/CSS/JS to be prefixed with /tgk-2.0/
// so the site works under https://jnimbles03.github.io/tgk-2.0/.
//
// Operates on a STAGING DIRECTORY (default ./_site) — does NOT modify source
// files in the repo. Source must keep `/foo` style paths so Replit (which
// serves at the domain root) continues to work unchanged.
//
// Run:  node .github/scripts/rewrite-paths.mjs ./_site
// =============================================================================

import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] || './_site';
const PREFIX = '/tgk-2.0';

// Directories we never recurse into when walking the staging tree.
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.github',
  'Youtube demos', 'youtube_demos',
  '.replit_integration_files', 'attached_assets', 'audit',
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

// -----------------------------------------------------------------------------
// Path-rewrite passes. Each pass matches a leading `/` that is NOT followed by
// another `/` (so protocol-relative `//cdn.example.com/...` is left alone) and
// is NOT followed by a non-path char. Schemes like http://, https://, data:,
// mailto:, javascript:, blob:, about: never start with `/`, so they're safe.
// -----------------------------------------------------------------------------
function rewrite(content) {
  // 1. HTML attributes (whitespace-bounded so `data-foo` doesn't match `data`)
  content = content.replace(
    /(\s(?:src|href|action|formaction|poster|data|content|srcset|manifest)\s*=\s*)("|')\/(?!\/)/gi,
    (_m, attr, q) => `${attr}${q}${PREFIX}/`,
  );

  // 2. CSS url(...) — covers standalone .css files AND inline <style> blocks
  //    inside HTML. Matches optional quote inside the parens.
  content = content.replace(
    /url\(\s*(["']?)\/(?!\/)/g,
    (_m, q) => `url(${q}${PREFIX}/`,
  );

  // 3. JS fetch('/foo') — backticks included for template literals
  content = content.replace(
    /\bfetch\(\s*(["'`])\/(?!\/)/g,
    (_m, q) => `fetch(${q}${PREFIX}/`,
  );

  // 4. JS navigations: location.href / window.location[.href] / .replace / .assign
  content = content.replace(
    /(\b(?:window\.)?location(?:\.href)?\s*=\s*)(["'`])\/(?!\/)/g,
    (_m, lhs, q) => `${lhs}${q}${PREFIX}/`,
  );
  content = content.replace(
    /(\b(?:window\.)?location\.(?:replace|assign)\(\s*)(["'`])\/(?!\/)/g,
    (_m, lhs, q) => `${lhs}${q}${PREFIX}/`,
  );

  // 5. Bare string literals that start with a path matching a known top-level
  //    site directory or file. This catches things like:
  //      window.FEEDBACK_ENDPOINT = '/api/feedback'
  //      { path: "/story-templates/foo.html" }
  //      `/stories/story-${vertical}/`
  //    Limited to a known set of top-level segments so we don't rewrite
  //    arbitrary strings like regex patterns or unrelated content.
  const TOP_LEVEL = [
    'api', 'admin', 'assets', 'components', 'stories', 'story-templates',
    'CANONICAL.md', 'index-unified.html', 'index-playbook.html', 'landing.html',
    'feedback-widget.js', 'auto.html', '_template.html',
    'banking-deposits.html', 'hls-discovery-process-map.html', 'hls-roi.html',
    'insurance-life.html', 'insurance-pc.html',
    'public-sector-311.html', 'public-sector-benefits.html',
    'public-sector-employee-onboarding.html', 'public-sector-licensing.html',
    'public-sector-recertification.html',
  ];
  const segPattern = TOP_LEVEL.map(s => s.replace(/[.+*?^$()[\]{}|\\]/g, '\\$&')).join('|');
  const literalRe = new RegExp(`(["'\`])\\/(?!\\/)(${segPattern})(?=[\\s/'"\`?#&)\\\\$])`, 'g');
  content = content.replace(literalRe, (_m, q, seg) => `${q}${PREFIX}/${seg}`);

  return content;
}

// -----------------------------------------------------------------------------
// Walk + rewrite
// -----------------------------------------------------------------------------
const files = walk(ROOT);
const REWRITE_EXTS = new Set(['.html', '.htm', '.css', '.js', '.mjs']);
let changed = 0;

for (const f of files) {
  if (!REWRITE_EXTS.has(extname(f).toLowerCase())) continue;
  const original = readFileSync(f, 'utf8');
  const rewritten = rewrite(original);
  if (rewritten !== original) {
    writeFileSync(f, rewritten);
    changed++;
  }
}
console.log(`[rewrite-paths] Rewrote ${changed} file(s) of ${files.length} scanned`);

// -----------------------------------------------------------------------------
// Root entry point: Pages serves /tgk-2.0/ → /tgk-2.0/index.html. The legacy
// index.html is an older "IAM Demo Experience" page; the live experience is
// index-unified.html. Move the legacy one aside and write a redirect at root.
// -----------------------------------------------------------------------------
const indexPath = join(ROOT, 'index.html');
const classicPath = join(ROOT, 'story-demo-classic.html');

if (existsSync(indexPath)) {
  renameSync(indexPath, classicPath);
  console.log(`[rewrite-paths] Renamed index.html → story-demo-classic.html`);
}

const REDIRECT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TGK 2.0 — IAM Storylines</title>
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=./index-unified.html">
<link rel="canonical" href="./index-unified.html">
<script>window.location.replace('./index-unified.html' + window.location.search + window.location.hash);</script>
<style>body{font-family:system-ui,sans-serif;color:#26065D;padding:2rem;}</style>
</head>
<body>
<p>Redirecting to <a href="./index-unified.html">TGK 2.0 — IAM Storylines</a>…</p>
</body>
</html>
`;
writeFileSync(indexPath, REDIRECT_HTML);
console.log(`[rewrite-paths] Wrote redirect index.html → index-unified.html`);

// Patch landing.html's one legacy reference to index.html so the rename above
// doesn't dead-end. Idempotent — only changes if the literal href is present.
const landingPath = join(ROOT, 'landing.html');
if (existsSync(landingPath)) {
  const before = readFileSync(landingPath, 'utf8');
  const after = before.replace(
    /href=(["'])index\.html\1/g,
    (_m, q) => `href=${q}story-demo-classic.html${q}`,
  );
  if (after !== before) {
    writeFileSync(landingPath, after);
    console.log(`[rewrite-paths] Patched landing.html: index.html → story-demo-classic.html`);
  }
}

console.log(`[rewrite-paths] Done.`);
