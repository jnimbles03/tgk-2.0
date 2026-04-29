/* =========================================================================
   TGK 2.0 — Express host + feedback backend
   -------------------------------------------------------------------------
   Serves the static site AND collects feedback into a local JSON store.
   Visit /admin/feedback (Basic Auth) to review submissions.
   ========================================================================= */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('@replit/database');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
// Audit page auth — magic-link sent to a @docusign.com email.
// AUDIT_PASSWORD is a legacy / emergency fallback (basic-auth) so you're never
// locked out if the mail provider is down or you haven't set RESEND_API_KEY yet.
const AUDIT_USER = process.env.AUDIT_USER || 'audit';
const AUDIT_PASSWORD = process.env.AUDIT_PASSWORD || '';
const AUDIT_EMAIL_DOMAIN = (process.env.AUDIT_EMAIL_DOMAIN || 'docusign.com').toLowerCase();
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
const AUDIT_BASE_URL = process.env.AUDIT_BASE_URL || ''; // e.g. https://your-repl.replit.app
const AUDIT_TOKEN_TTL_MS = 15 * 60 * 1000;        // magic-link tokens: 15 min
const AUDIT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // session cookies: 30 days
const AUDIT_TOKEN_KEY = 'audit:tokens';   // pending magic-link tokens
const AUDIT_SESSION_KEY = 'audit:sessions'; // active sessions
const LEGACY_STORE_PATH = path.join(__dirname, 'feedback-store.json');
const KV_KEY = 'feedback:list';
// Slug-gated public read-only feedback endpoint. Knowing the slug acts as a
// soft gate; the response has PII stripped (reporter, userAgent, full URL).
// Override via FEEDBACK_PUBLIC_SLUG secret when rotating.
const FEEDBACK_PUBLIC_SLUG = process.env.FEEDBACK_PUBLIC_SLUG || 'a7k9-mpx2-4wnz-r3dh';

const db = new Database();

// --------- LLM client (Replit AI Integrations: no key needed) ---------
const llm = (process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY)
  ? new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined
    })
  : null;
const PROJECT_FILES = (() => {
  try {
    return fs.readdirSync(__dirname).filter(f =>
      /\.(html|js|css)$/i.test(f) && !f.startsWith('feedback-store')
    );
  } catch { return []; }
})();

app.use(express.json({ limit: '64kb' }));

// --------- SSE clients for live admin updates ---------
const sseClients = new Set();
function broadcast(event, payload) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch {}
  }
}

// --------- Default landing ---------
app.get('/', (req, res) => res.redirect('/index-unified.html'));

// --------- Feedback store helpers (Replit KV-backed) ---------
async function readStore() {
  try {
    const raw = await db.get(KV_KEY);
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    if (raw && typeof raw === 'object' && 'value' in raw) {
      const v = raw.value;
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
    }
    return [];
  } catch (e) {
    console.error('readStore error:', e?.message || e);
    return [];
  }
}
async function writeStore(items) {
  await db.set(KV_KEY, items);
}

// Serialize all read-modify-write mutations through one in-process queue so
// concurrent requests (e.g. a slow background analysis racing a status change)
// can't overwrite each other. Safe because we're deployed on a single VM.
let writeChain = Promise.resolve();
function mutateStore(mutator) {
  const next = writeChain.then(async () => {
    const items = await readStore();
    const result = await mutator(items);
    await writeStore(items);
    return result;
  });
  writeChain = next.catch(() => {}); // keep the chain alive even on failure
  return next;
}

// One-time migration: pull any legacy file-based items into KV
(async () => {
  try {
    if (!fs.existsSync(LEGACY_STORE_PATH)) return;
    const legacy = JSON.parse(fs.readFileSync(LEGACY_STORE_PATH, 'utf8') || '[]');
    if (!Array.isArray(legacy) || legacy.length === 0) return;
    const current = await readStore();
    const seen = new Set(current.map(i => i.id));
    const merged = current.concat(legacy.filter(i => i && i.id && !seen.has(i.id)));
    if (merged.length !== current.length) {
      await writeStore(merged);
      console.log(`Migrated ${merged.length - current.length} legacy feedback item(s) to KV.`);
    }
    fs.renameSync(LEGACY_STORE_PATH, LEGACY_STORE_PATH + '.migrated');
  } catch (e) {
    console.warn('Legacy migration skipped:', e?.message || e);
  }
})();

// --------- LLM-driven triage ---------
const ANALYSIS_SYSTEM = `You are the triage analyst for "TGK 2.0", an interactive HTML demo with multiple Docusign-themed vertical pages and a feedback widget.
You receive a single user-submitted feedback item and return a structured analysis as strict JSON.
Be concise, concrete, and pragmatic. Base file guesses on the provided file list and the page the user was on.
Output JSON ONLY matching this schema:
{
  "severity": 1-5 integer (1=trivial, 5=blocking),
  "complexity": 1-5 integer (1=tiny tweak, 5=large refactor),
  "confidence": 0.0-1.0 number (your confidence in this analysis),
  "category_confirmed": one of "design"|"content"|"bug"|"other",
  "summary": one short sentence describing the underlying issue,
  "suggested_fix": one or two sentences describing the concrete change,
  "likely_files": array of up to 3 filenames from the provided list (or [] if unsure),
  "recommended_action": one of "auto-fix"|"propose-and-wait"|"needs-human-decision",
  "rationale": one sentence explaining why you chose that action
}`;

async function analyzeFeedback(item) {
  if (!llm) throw new Error('LLM not configured');
  const userPayload = {
    project: item.project,
    user_category: item.category,
    message: item.message,
    reporter: item.reporter,
    page_context: item.context || {},
    available_files: PROJECT_FILES
  };
  const resp = await llm.chat.completions.create({
    model: 'gpt-5.1',
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM },
      { role: 'user', content: JSON.stringify(userPayload) }
    ],
    response_format: { type: 'json_object' }
  });
  const raw = resp.choices?.[0]?.message?.content || '{}';
  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  return {
    severity: clampInt(parsed.severity, 1, 5, 3),
    complexity: clampInt(parsed.complexity, 1, 5, 3),
    confidence: clampFloat(parsed.confidence, 0, 1, 0.5),
    category_confirmed: ['design','content','bug','other'].includes(parsed.category_confirmed) ? parsed.category_confirmed : item.category,
    summary: String(parsed.summary || '').slice(0, 240),
    suggested_fix: String(parsed.suggested_fix || '').slice(0, 600),
    likely_files: Array.isArray(parsed.likely_files) ? parsed.likely_files.filter(f => typeof f === 'string').slice(0, 5) : [],
    recommended_action: ['auto-fix','propose-and-wait','needs-human-decision'].includes(parsed.recommended_action) ? parsed.recommended_action : 'needs-human-decision',
    rationale: String(parsed.rationale || '').slice(0, 300),
    analyzed_at: new Date().toISOString()
  };
}
function clampInt(v, lo, hi, dflt) { const n = parseInt(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt; }
function clampFloat(v, lo, hi, dflt) { const n = parseFloat(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt; }

async function runAnalysisAndPersist(itemId) {
  if (!llm) return;
  try {
    const snapshot = (await readStore()).find(x => x.id === itemId);
    if (!snapshot) return;
    const analysis = await analyzeFeedback(snapshot);
    const applied = await mutateStore(items => {
      const target = items.find(x => x.id === itemId);
      if (!target) return false;
      target.analysis = analysis;
      return true;
    });
    if (applied) broadcast('analysis', { id: itemId, analysis });
  } catch (e) {
    console.error('analysis error:', e?.message || e);
    broadcast('analysis-error', { id: itemId, error: e?.message || 'analysis failed' });
  }
}

// --------- Public feedback API ---------
app.post('/api/feedback', async (req, res) => {
  try {
    const { project, category, message, reporter, context } = req.body || {};
    if (!message || typeof message !== 'string' || message.trim().length < 3) {
      return res.status(400).json({ error: 'message required' });
    }
    const item = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      project: (project || 'tgk-2.0').slice(0, 60),
      category: (category || 'other').slice(0, 30),
      message: message.slice(0, 2000),
      reporter: (reporter || '').toString().slice(0, 120) || null,
      context: context || {},
      status: 'new'
    };
    await mutateStore(items => { items.push(item); });
    broadcast('feedback', item);
    res.json({ ok: true, id: item.id });
    // Fire-and-forget: analyze in background so the user's POST stays fast
    if (llm) runAnalysisAndPersist(item.id);
  } catch (e) {
    console.error('feedback POST error:', e?.message || e);
    res.status(500).json({ error: 'store error' });
  }
});

// --------- Public read-only feedback view ---------
// Slug-gated, CORS-open, PII-stripped. Powers the Cowork pipeline artifact.
// To rotate the slug: set FEEDBACK_PUBLIC_SLUG secret in Replit and restart.
app.get(`/api/feedback/public-${FEEDBACK_PUBLIC_SLUG}`, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'no-store');
  try {
    const items = await readStore();
    const sanitized = items.map(it => ({
      id: it.id,
      created_at: it.created_at,
      project: it.project,
      category: it.category,
      message: it.message,
      context: it.context ? {
        pathname: it.context.pathname,
        activeMode: it.context.activeMode,
        activeView: it.context.activeView,
        selectedVertical: it.context.selectedVertical,
        selectedWorkflow: it.context.selectedWorkflow,
        viewport: it.context.viewport,
      } : {},
      status: it.status,
      decision: it.decision,
      decided_at: it.decided_at,
      analysis: it.analysis,
      // intentionally dropped: reporter, context.url, context.userAgent
    }));
    res.json(sanitized);
  } catch (e) {
    console.error('public feedback error:', e?.message || e);
    res.status(500).json({ error: 'store error' });
  }
});

// --------- Basic Auth gate for /admin ---------
function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(503).type('text/plain').send(
      'Admin disabled: set the ADMIN_PASSWORD secret in this Repl, then restart.'
    );
  }
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);
    if (user === ADMIN_USER && pass === ADMIN_PASSWORD) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="TGK Feedback Admin"');
  res.status(401).send('Authentication required.');
}

// --------- Admin: list, JSON export, status update, delete ---------
app.get('/admin/feedback.json', requireAdmin, async (req, res) => {
  try { res.json(await readStore()); }
  catch (e) { res.status(500).json({ error: 'store error' }); }
});

app.post('/admin/feedback/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['new', 'reviewed', 'resolved', 'wontfix'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'bad status' });
    const found = await mutateStore(items => {
      const it = items.find(x => x.id === req.params.id);
      if (!it) return false;
      it.status = status;
      return true;
    });
    if (!found) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'store error' }); }
});

app.delete('/admin/feedback/:id', requireAdmin, async (req, res) => {
  try {
    await mutateStore(items => {
      const idx = items.findIndex(x => x.id === req.params.id);
      if (idx >= 0) items.splice(idx, 1);
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'store error' }); }
});

app.post('/admin/feedback/:id/analyze', requireAdmin, async (req, res) => {
  if (!llm) return res.status(503).json({ error: 'LLM not configured' });
  const exists = (await readStore()).some(x => x.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true, queued: true });
  runAnalysisAndPersist(req.params.id);
});

app.post('/admin/feedback/:id/decision', requireAdmin, async (req, res) => {
  try {
    const { decision } = req.body || {};
    const allowed = ['approved', 'rejected', 'pending'];
    if (!allowed.includes(decision)) return res.status(400).json({ error: 'bad decision' });
    const decided_at = new Date().toISOString();
    const found = await mutateStore(items => {
      const it = items.find(x => x.id === req.params.id);
      if (!it) return false;
      it.decision = decision;
      it.decided_at = decided_at;
      return true;
    });
    if (!found) return res.status(404).json({ error: 'not found' });
    broadcast('decision', { id: req.params.id, decision, decided_at });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'store error' }); }
});

app.get('/admin/feedback/stream', requireAdmin, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders?.();
  res.write('retry: 3000\n\n');
  res.write(`event: hello\ndata: {"ok":true}\n\n`);
  sseClients.add(res);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 25000);
  req.on('close', () => { clearInterval(ping); sseClients.delete(res); });
});

app.get('/admin/feedback', requireAdmin, (req, res) => {
  res.type('html').send(adminHtml());
});

function adminHtml() {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TGK Feedback — Admin</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background:#F6F4FF; color:#130032; }
  header { background: linear-gradient(135deg,#26065D,#4C00FF); color:#fff; padding:18px 24px; display:flex; align-items:center; justify-content:space-between; }
  header h1 { margin:0; font-size:18px; font-weight:600; letter-spacing:-0.01em; }
  header .meta { font-size:12px; opacity:.75; }
  main { padding: 22px 24px 60px; max-width: 1100px; margin: 0 auto; }
  .toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
  .toolbar input, .toolbar select {
    padding:8px 10px; border:1.5px solid rgba(19,0,50,.12); border-radius:8px;
    font-size:13px; background:#fff; color:#130032;
  }
  .toolbar .count { margin-left:auto; font-size:12px; color: rgba(19,0,50,.6); }
  .card { background:#fff; border-radius:12px; padding:14px 16px; margin-bottom:10px; box-shadow: 0 2px 8px rgba(19,0,50,.06); }
  .row { display:flex; align-items:flex-start; gap:14px; }
  .row > .body { flex:1; min-width:0; }
  .pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:10.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
  .pill.cat-design   { background:#EDE7FF; color:#4C00FF; }
  .pill.cat-content  { background:#E0F7EE; color:#0E7C4A; }
  .pill.cat-bug      { background:#FFE6E6; color:#C62828; }
  .pill.cat-other    { background:#EEEEF3; color:#444; }
  .pill.status-new      { background:#FFF4D6; color:#7A5300; }
  .pill.status-reviewed { background:#E6F0FF; color:#0B4A9E; }
  .pill.status-resolved { background:#E0F7EE; color:#0E7C4A; }
  .pill.status-wontfix  { background:#EEEEF3; color:#666; }
  .meta { font-size:11px; color: rgba(19,0,50,.55); margin-top:4px; }
  .msg { margin:8px 0 6px; white-space:pre-wrap; font-size:13.5px; line-height:1.5; }
  .ctx { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size:11px; color:#4C00FF; background:#F2EEFF; padding:2px 6px; border-radius:4px; word-break:break-all; }
  .actions { display:flex; gap:6px; flex-wrap:wrap; }
  .actions button, .actions select {
    padding:6px 10px; font-size:11.5px; border-radius:6px; border:1px solid rgba(19,0,50,.12);
    background:#fff; cursor:pointer; font-family: inherit; color:#130032;
  }
  .actions button.danger { color:#C62828; border-color:#FFD0D0; }
  .actions button:hover { border-color:#4C00FF; color:#4C00FF; }
  .ai { margin-top:10px; padding:10px 12px; border-radius:10px; background:#F2EEFF; border:1px solid #E0D5FF; }
  .ai .ai-head { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
  .ai .ai-pill { padding:2px 8px; border-radius:999px; font-size:10.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
  .ai .sev-1, .ai .cmp-1 { background:#E0F7EE; color:#0E7C4A; }
  .ai .sev-2, .ai .cmp-2 { background:#E0F7EE; color:#0E7C4A; }
  .ai .sev-3, .ai .cmp-3 { background:#FFF4D6; color:#7A5300; }
  .ai .sev-4, .ai .cmp-4 { background:#FFE6E6; color:#C62828; }
  .ai .sev-5, .ai .cmp-5 { background:#FFE6E6; color:#C62828; }
  .ai .conf { background:#EDE7FF; color:#4C00FF; }
  .ai .rec-auto-fix              { background:#E0F7EE; color:#0E7C4A; }
  .ai .rec-propose-and-wait      { background:#FFF4D6; color:#7A5300; }
  .ai .rec-needs-human-decision  { background:#FFE6E6; color:#C62828; }
  .ai .ai-summary { font-size:13px; margin:6px 0 4px; color:#130032; font-weight:600; }
  .ai .ai-fix { font-size:12.5px; margin:2px 0 6px; color:#130032; }
  .ai .ai-files { font-size:11px; color:#4C00FF; }
  .ai .ai-files code { background:#fff; padding:1px 5px; border-radius:4px; margin-right:4px; font-family: ui-monospace, Menlo, monospace; }
  .ai .ai-rationale { font-size:11px; color:rgba(19,0,50,.6); margin-top:6px; font-style:italic; }
  .ai .ai-decision-row { margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
  .ai .ai-decision-row button { padding:5px 10px; font-size:11.5px; border-radius:6px; border:1px solid rgba(19,0,50,.12); background:#fff; cursor:pointer; font-family: inherit; color:#130032; }
  .ai .ai-decision-row button.approve { border-color:#A8E6C5; color:#0E7C4A; }
  .ai .ai-decision-row button.approve:hover { background:#E0F7EE; }
  .ai .ai-decision-row button.reject { border-color:#FFD0D0; color:#C62828; }
  .ai .ai-decision-row button.reject:hover { background:#FFE6E6; }
  .ai .ai-decision-row button.reanalyze:hover { border-color:#4C00FF; color:#4C00FF; }
  .ai .decision-pill { padding:2px 8px; border-radius:999px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
  .ai .decision-approved { background:#E0F7EE; color:#0E7C4A; }
  .ai .decision-rejected { background:#FFE6E6; color:#C62828; }
  .ai .ai-pending { font-size:12px; color:rgba(19,0,50,.6); padding:4px 0; }
  .empty { text-align:center; padding:60px 20px; color: rgba(19,0,50,.5); font-size:14px; }
  details { margin-top:6px; }
  details summary { cursor:pointer; font-size:11.5px; color: rgba(19,0,50,.6); }
  pre { background:#0F0030; color:#CBC2FF; padding:10px 12px; border-radius:8px; overflow:auto; font-size:11px; }
</style>
</head><body>
<header>
  <div>
    <h1>TGK Feedback — Admin</h1>
    <div class="meta">Submissions land here in real time.</div>
  </div>
  <a href="/admin/feedback.json" style="color:#fff;font-size:12px;text-decoration:underline;opacity:.8;">Export JSON</a>
</header>
<main>
  <div class="toolbar">
    <input id="q" type="search" placeholder="Search message, reporter, page…" style="flex:1;min-width:220px;">
    <select id="fcat">
      <option value="">All categories</option>
      <option value="design">Design</option>
      <option value="content">Content</option>
      <option value="bug">Bug</option>
      <option value="other">Other</option>
    </select>
    <select id="fstatus">
      <option value="">All statuses</option>
      <option value="new">New</option>
      <option value="reviewed">Reviewed</option>
      <option value="resolved">Resolved</option>
      <option value="wontfix">Won't fix</option>
    </select>
    <span class="count" id="count"></span>
  </div>
  <div id="list"></div>
</main>
<script>
  const list = document.getElementById('list');
  const q = document.getElementById('q');
  const fcat = document.getElementById('fcat');
  const fstatus = document.getElementById('fstatus');
  const count = document.getElementById('count');
  let data = [];

  async function load() {
    const r = await fetch('/admin/feedback.json');
    data = await r.json();
    render();
  }
  function fmt(d) {
    try { return new Date(d).toLocaleString(); } catch { return d; }
  }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function render() {
    const term = q.value.trim().toLowerCase();
    const cat = fcat.value;
    const st = fstatus.value;
    const items = data
      .filter(it => !cat || it.category === cat)
      .filter(it => !st || it.status === st)
      .filter(it => !term || JSON.stringify(it).toLowerCase().includes(term))
      .sort((a,b) => (b.created_at || '').localeCompare(a.created_at || ''));
    count.textContent = items.length + ' / ' + data.length + ' shown';
    if (items.length === 0) {
      list.innerHTML = '<div class="empty">No feedback matches your filters yet.</div>';
      return;
    }
    list.innerHTML = items.map(it => {
      const ctx = it.context || {};
      const where = [ctx.pathname, ctx.activeMode, ctx.activeView].filter(Boolean).join(' · ');
      const a = it.analysis;
      const decisionPill = it.decision && it.decision !== 'pending'
        ? '<span class="decision-pill decision-'+esc(it.decision)+'">'+esc(it.decision)+'</span>' : '';
      const aiBlock = a ? \`<div class="ai">
        <div class="ai-head">
          <span class="ai-pill sev-\${a.severity}">Sev \${a.severity}/5</span>
          <span class="ai-pill cmp-\${a.complexity}">Complexity \${a.complexity}/5</span>
          <span class="ai-pill conf">Confidence \${Math.round((a.confidence||0)*100)}%</span>
          <span class="ai-pill rec-\${esc(a.recommended_action)}">\${esc(a.recommended_action.replace(/-/g,' '))}</span>
          \${decisionPill}
        </div>
        <div class="ai-summary">\${esc(a.summary || '—')}</div>
        <div class="ai-fix"><strong>Suggested fix:</strong> \${esc(a.suggested_fix || '—')}</div>
        \${a.likely_files && a.likely_files.length ? '<div class="ai-files"><strong>Likely files:</strong> '+a.likely_files.map(f=>'<code>'+esc(f)+'</code>').join('')+'</div>' : ''}
        <div class="ai-rationale">\${esc(a.rationale || '')}</div>
        <div class="ai-decision-row">
          <button class="approve" data-id="\${it.id}" data-action="approve">Approve fix</button>
          <button class="reject"  data-id="\${it.id}" data-action="reject">Reject</button>
          <button class="reanalyze" data-id="\${it.id}" data-action="reanalyze">Re-analyze</button>
        </div>
      </div>\` : \`<div class="ai">
        <div class="ai-pending" data-pending-id="\${it.id}">AI triage pending… (analysis runs the moment a submission arrives)</div>
        <div class="ai-decision-row">
          <button class="reanalyze" data-id="\${it.id}" data-action="reanalyze">Run analysis now</button>
        </div>
      </div>\`;
      return \`<div class="card" data-card-id="\${esc(it.id)}">
        <div class="row">
          <div class="body">
            <span class="pill cat-\${esc(it.category)}">\${esc(it.category)}</span>
            <span class="pill status-\${esc(it.status)}" style="margin-left:6px;">\${esc(it.status)}</span>
            <div class="meta">\${esc(fmt(it.created_at))} \${it.reporter ? '· '+esc(it.reporter) : ''}</div>
            <div class="msg">\${esc(it.message)}</div>
            \${where ? '<div><span class="ctx">'+esc(where)+'</span></div>' : ''}
            \${aiBlock}
            <details><summary>Raw context</summary><pre>\${esc(JSON.stringify(ctx, null, 2))}</pre></details>
          </div>
          <div class="actions">
            <select data-id="\${it.id}" class="set-status">
              <option value="new" \${it.status==='new'?'selected':''}>New</option>
              <option value="reviewed" \${it.status==='reviewed'?'selected':''}>Reviewed</option>
              <option value="resolved" \${it.status==='resolved'?'selected':''}>Resolved</option>
              <option value="wontfix" \${it.status==='wontfix'?'selected':''}>Won't fix</option>
            </select>
            <button class="danger" data-id="\${it.id}" data-action="delete">Delete</button>
          </div>
        </div>
      </div>\`;
    }).join('');
  }
  list.addEventListener('change', async (e) => {
    if (e.target.classList.contains('set-status')) {
      const id = e.target.dataset.id;
      await fetch('/admin/feedback/' + id + '/status', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ status: e.target.value })
      });
      const it = data.find(x => x.id === id);
      if (it) it.status = e.target.value;
      render();
    }
  });
  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === 'delete') {
      if (!confirm('Delete this feedback item?')) return;
      await fetch('/admin/feedback/' + id, { method: 'DELETE' });
      data = data.filter(x => x.id !== id);
      render();
    } else if (action === 'approve' || action === 'reject') {
      const decision = action === 'approve' ? 'approved' : 'rejected';
      await fetch('/admin/feedback/' + id + '/decision', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ decision })
      });
      const it = data.find(x => x.id === id);
      if (it) { it.decision = decision; it.decided_at = new Date().toISOString(); }
      render();
    } else if (action === 'reanalyze') {
      btn.disabled = true; btn.textContent = 'Analyzing…';
      await fetch('/admin/feedback/' + id + '/analyze', { method: 'POST' });
      // The 'analysis' SSE event will refresh the card when it lands.
    }
  });
  q.addEventListener('input', render);
  fcat.addEventListener('change', render);
  fstatus.addEventListener('change', render);
  load();

  // ---- Live updates via Server-Sent Events ----
  const liveBadge = document.createElement('span');
  liveBadge.id = 'live';
  liveBadge.style.cssText = 'margin-left:8px;font-size:11px;padding:3px 8px;border-radius:999px;background:#FFE6E6;color:#C62828;';
  liveBadge.textContent = '○ connecting…';
  document.querySelector('header .meta')?.appendChild(liveBadge);

  function setLive(state) {
    if (state === 'on')      { liveBadge.style.background='#E0F7EE'; liveBadge.style.color='#0E7C4A'; liveBadge.textContent='● live'; }
    else if (state === 'off'){ liveBadge.style.background='#FFE6E6'; liveBadge.style.color='#C62828'; liveBadge.textContent='○ reconnecting…'; }
    else                     { liveBadge.style.background='#EEEEF3'; liveBadge.style.color='#444';   liveBadge.textContent='○ ' + state; }
  }

  function flash(id) {
    requestAnimationFrame(() => {
      const card = list.querySelector('[data-card-id="' + id + '"]');
      if (!card) return;
      card.style.transition = 'background-color 1.6s ease';
      card.style.backgroundColor = '#FFF8D6';
      setTimeout(() => { card.style.backgroundColor = '#fff'; }, 60);
    });
  }

  function connect() {
    const es = new EventSource('/admin/feedback/stream');
    es.addEventListener('hello', () => setLive('on'));
    es.addEventListener('feedback', (ev) => {
      try {
        const item = JSON.parse(ev.data);
        if (data.find(x => x.id === item.id)) return;
        data.push(item);
        render();
        flash(item.id);
      } catch {}
    });
    es.addEventListener('analysis', (ev) => {
      try {
        const { id, analysis } = JSON.parse(ev.data);
        const it = data.find(x => x.id === id);
        if (!it) { load(); return; }
        it.analysis = analysis;
        render();
        flash(id);
      } catch {}
    });
    es.addEventListener('decision', (ev) => {
      try {
        const { id, decision, decided_at } = JSON.parse(ev.data);
        const it = data.find(x => x.id === id);
        if (!it) return;
        it.decision = decision;
        it.decided_at = decided_at;
        render();
      } catch {}
    });
    es.addEventListener('analysis-error', (ev) => {
      try {
        const { id, error } = JSON.parse(ev.data);
        const card = list.querySelector('[data-card-id="' + id + '"] .ai-pending');
        if (card) card.textContent = 'Analysis failed: ' + error;
      } catch {}
    });
    es.onerror = () => { setLive('off'); load(); };
  }
  connect();
  setInterval(load, 120000); // safety-net resync every 2 min in case any events were missed
</script>
</body></html>`;
}

// =========================================================
// Audit page — read-only data endpoints + queue-for-review
// =========================================================
// The audit page (/audit.html) loads the live storyline & discovery data,
// lets contributors edit/upload, and POSTs change sets to a pending queue
// stored in Replit DB under AUDIT_KV_KEY. /admin/audit reviews the queue.
const AUDIT_KV_KEY = 'audit:pending';

// ---------- Audit auth: magic-link to a @docusign.com email ----------
// Two-step: POST /audit/request with an email → server sends a magic link →
// user clicks link → GET /audit/verify?token=… exchanges the token for a
// signed session cookie that's good for AUDIT_SESSION_TTL_MS.
//
// AUDIT_PASSWORD basic-auth still works as an emergency fallback so you're
// never locked out — admins can use admin/ADMIN_PASSWORD too.

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(/;\s*/).forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1));
  });
  return out;
}

async function readKvList(key) {
  try {
    const raw = await db.get(key);
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.value)) return raw.value;
    return [];
  } catch (e) { return []; }
}
async function writeKvList(key, list) { await db.set(key, list); }

async function findValidSession(sid) {
  if (!sid) return null;
  const list = await readKvList(AUDIT_SESSION_KEY);
  const now = Date.now();
  const s = list.find(x => x.sid === sid && x.expires > now);
  return s || null;
}

async function createSession(email) {
  const sid = crypto.randomBytes(24).toString('hex');
  const session = {
    sid,
    email: email.toLowerCase(),
    created_at: new Date().toISOString(),
    expires: Date.now() + AUDIT_SESSION_TTL_MS,
  };
  const list = await readKvList(AUDIT_SESSION_KEY);
  // Drop expired sessions while we're here, cap stored count.
  const now = Date.now();
  const trimmed = list.filter(x => x.expires > now).slice(-500);
  trimmed.push(session);
  await writeKvList(AUDIT_SESSION_KEY, trimmed);
  return session;
}

async function destroySession(sid) {
  if (!sid) return;
  const list = await readKvList(AUDIT_SESSION_KEY);
  await writeKvList(AUDIT_SESSION_KEY, list.filter(x => x.sid !== sid));
}

async function requireAudit(req, res, next) {
  // 1) Cookie session
  const sid = parseCookies(req)['tgk_audit'];
  const session = await findValidSession(sid);
  if (session) { req.auditUser = session.email; return next(); }

  // 2) Basic-auth fallback (AUDIT_PASSWORD or ADMIN_PASSWORD)
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);
    if (AUDIT_PASSWORD && user === AUDIT_USER && pass === AUDIT_PASSWORD) {
      req.auditUser = `${AUDIT_USER}@local`; return next();
    }
    if (ADMIN_PASSWORD && user === ADMIN_USER && pass === ADMIN_PASSWORD) {
      req.auditUser = `${ADMIN_USER}@local`; return next();
    }
  }

  // 3) Browser → redirect to login. API caller (curl etc) → 401.
  // Opt-in: ?basic=1 forces the basic-auth prompt, so the AUDIT_PASSWORD
  // fallback is reachable from a browser when the magic-link service is down.
  const accept = req.headers.accept || '';
  const wantsBasic = req.query && (req.query.basic === '1' || req.query.basic === 'true');
  if (accept.includes('text/html') && !wantsBasic) return res.redirect('/audit/login');
  res.set('WWW-Authenticate', 'Basic realm="TGK Audit"');
  res.status(401).send('Authentication required.');
}

// Friendly aliases: /audit and /audit/ → /audit.html
app.get(['/audit', '/audit/'], (req, res) => res.redirect('/audit.html'));

// Friendly alias: /architecture and /architecture/ → /architecture.html
app.get(['/architecture', '/architecture/'], (req, res) => res.redirect('/architecture.html'));

// Friendly alias: /builder and /builder/ (and /build) → /builder.html
app.get(['/builder', '/builder/', '/build', '/build/'], (req, res) => res.redirect('/builder.html'));

/* =========================================================================
   DYNAMIC DEMO BUILDER
   -------------------------------------------------------------------------
   Lets a sales rep author a one-off custom demo via /builder.html. Picker
   POSTs a config; we save it under a short token in Replit DB; the rep gets
   a clean URL like /stories/custom-a7k9mpx2/ which serves the shell with
   the config injected inline as JSON.
   ========================================================================= */
const BUILDER_KEY_PREFIX = 'builder:';
const BUILDER_TTL_DAYS = 30;

function newBuilderToken() {
  // 8 chars, lowercase alphanumeric, no ambiguous (0/o, 1/l) — readable in URLs
  const alpha = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) s += alpha[bytes[i] % alpha.length];
  return s;
}

// POST /api/builder/save — picker hands us a config, we mint a token + return URL
// Local body parser at 1mb to fit a tenant-logo dataURL plus the scenes
// payload — the global 64kb cap on line ~55 is too tight for that. Same
// pattern the /admin/audit/* routes use further down.
const builderJson = express.json({ limit: '1mb' });
app.post('/api/builder/save', builderJson, async (req, res) => {
  try {
    const cfg = req.body || {};
    if (!cfg.tenant || !cfg.customer || !cfg.scenes || !Array.isArray(cfg.scenes)) {
      return res.status(400).json({ error: 'config must include tenant, customer, scenes[]' });
    }
    const token = newBuilderToken();
    const record = {
      ...cfg,
      _meta: {
        createdAt: Date.now(),
        expiresAt: Date.now() + BUILDER_TTL_DAYS * 86400 * 1000,
        version: 1
      }
    };
    await db.set(BUILDER_KEY_PREFIX + token, record);
    res.json({
      token,
      url: `/stories/custom-${token}/`,
      expiresInDays: BUILDER_TTL_DAYS
    });
  } catch (e) {
    console.error('[builder] save failed:', e);
    res.status(500).json({ error: 'save failed' });
  }
});

// GET /api/builder/:token — fetch a saved config (used by shell async path / inspection)
app.get('/api/builder/:token', async (req, res) => {
  try {
    const cfg = await db.get(BUILDER_KEY_PREFIX + req.params.token);
    if (!cfg) return res.status(404).json({ error: 'not found or expired' });
    res.json(cfg);
  } catch (e) {
    console.error('[builder] fetch failed:', e);
    res.status(500).json({ error: 'fetch failed' });
  }
});

// GET /stories/custom-:token/ — clean URL → serve shell with config injected inline
// The rep's URL bar stays at /stories/custom-XXXXX/; the shell reads its config
// from a <script id="tgk-custom-vertical" type="application/json"> tag.
app.get(['/stories/custom-:token', '/stories/custom-:token/'], async (req, res) => {
  try {
    const token = req.params.token;
    const cfg = await db.get(BUILDER_KEY_PREFIX + token);
    if (!cfg) {
      return res.status(404).type('html').send(
        '<!doctype html><meta charset="utf-8"><title>Demo not found</title>' +
        '<style>body{font-family:system-ui,sans-serif;background:#F8F3F0;color:#130032;padding:64px;max-width:560px;margin:auto}h1{font-weight:500}a{color:#4C00FF}</style>' +
        '<h1>This custom demo expired or doesn\'t exist.</h1>' +
        `<p>Token <code>${token}</code> is not in the cache. Custom demos are kept for ${BUILDER_TTL_DAYS} days.</p>` +
        '<p><a href="/builder.html">Build a new one →</a></p>'
      );
    }

    let html = await fs.promises.readFile(
      path.join(__dirname, 'stories', '_shared', 'story-shell.html'),
      'utf8'
    );

    // Sanitize for safe embedding inside <script> — escape closing tags
    const safeJson = JSON.stringify(cfg).replace(/</g, '\\u003c');
    const usecase = cfg.usecase || 'default';

    const injection =
      `<script id="tgk-custom-vertical" type="application/json">${safeJson}</script>\n` +
      `<script>(function(){` +
        `var u = new URL(location.href);` +
        // tell the shell to render under vertical=custom (and the chosen usecase)
        `u.searchParams.set('vertical','custom');` +
        (usecase !== 'default' ? `u.searchParams.set('usecase','${usecase}');` : '') +
        // rewrite URL in-place so query is visible to the shell's URLSearchParams
        // but the rep's address bar still shows the friendly /stories/custom-XXX/ path
        `history.replaceState(null,'',location.pathname + u.search + location.hash);` +
      `})();</script>\n`;

    html = html.replace(/<head>/i, '<head>\n' + injection);
    res.type('html').send(html);
  } catch (e) {
    console.error('[builder] custom-path serve failed:', e);
    res.status(500).type('text').send('builder serve failed');
  }
});

// Gate the audit page itself before the static handler can serve it.
app.get('/audit.html', requireAudit, (req, res) => {
  res.sendFile(path.join(__dirname, 'audit.html'));
});

// ---- Login page (no auth required) ----
app.get('/audit/login', (req, res) => {
  const sent = req.query.sent ? '1' : '';
  const err = req.query.err || '';
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8">
<title>Sign in · TGK Audit</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 0;
    background: #FAF7F2; color: #1F1A14; min-height: 100vh;
    display: flex; align-items: center; justify-content: center; }
  .card { background: white; border: 1px solid #E8E4DA; border-radius: 10px;
    padding: 36px 40px; width: 420px; max-width: 92vw; }
  h1 { margin: 0 0 6px; font-size: 20px; font-weight: 600; }
  .sub { color: #6E6760; font-size: 13.5px; margin-bottom: 22px; line-height: 1.5; }
  label { display: block; font-size: 12px; color: #5F5E5A; font-weight: 500; margin-bottom: 6px; }
  input[type="email"] { width: 100%; padding: 10px 12px; font: inherit; font-size: 14px;
    border: 1px solid #D3D1C7; border-radius: 6px; background: #FCFAF7; }
  input[type="email"]:focus { outline: none; border-color: #4B00E9;
    box-shadow: 0 0 0 3px rgba(75,0,233,0.08); background: white; }
  button { margin-top: 14px; width: 100%; padding: 10px; font: inherit; font-size: 14px;
    font-weight: 500; background: #4B00E9; color: white; border: none;
    border-radius: 6px; cursor: pointer; }
  button:hover { background: #3D00BF; }
  .meta { margin-top: 20px; font-size: 11.5px; color: #888780; line-height: 1.5; }
  .ok { background: #DDEFE3; color: #1F5824; padding: 12px 14px; border-radius: 6px;
    font-size: 13px; margin-bottom: 14px; }
  .err { background: #F4D6D6; color: #6E2424; padding: 10px 14px; border-radius: 6px;
    font-size: 13px; margin-bottom: 14px; }
  .dot { display: inline-block; width: 8px; height: 8px; background: #4B00E9;
    border-radius: 2px; margin-right: 8px; vertical-align: 1px; }
</style></head>
<body><div class="card">
  <h1><span class="dot"></span>TGK Audit</h1>
  <div class="sub">Sign in with your <strong>@${AUDIT_EMAIL_DOMAIN}</strong> email. We'll send a one-time link that expires in 15 minutes.</div>
  ${sent ? `<div class="ok">Link sent. Check your email and click the link to continue.</div>` : ''}
  ${err ? `<div class="err">${err.replace(/[<>]/g,'')}</div>` : ''}
  <form method="POST" action="/audit/request">
    <label for="email">Email</label>
    <input id="email" type="email" name="email" required autofocus
      placeholder="you@${AUDIT_EMAIL_DOMAIN}" />
    <button type="submit">Email me a sign-in link</button>
  </form>
  <div class="meta">Links are single-use and tied to this browser. Sessions last 30 days.</div>
  <div class="meta" style="margin-top:8px;">Mail provider down? <a href="/audit.html?basic=1" style="color:#4B00E9;">Sign in with the audit password instead.</a></div>
</div></body></html>`);
});

// ---- Request a magic link ----
app.post('/audit/request', express.urlencoded({ extended: false }), async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const onDomain = email.endsWith('@' + AUDIT_EMAIL_DOMAIN);
  if (!valid || !onDomain) {
    const msg = encodeURIComponent(
      `Email must be a valid @${AUDIT_EMAIL_DOMAIN} address.`);
    return res.redirect('/audit/login?err=' + msg);
  }
  if (!RESEND_API_KEY) {
    const msg = encodeURIComponent(
      `Email service not configured. Set RESEND_API_KEY (or use the AUDIT_PASSWORD fallback).`);
    return res.redirect('/audit/login?err=' + msg);
  }

  // Mint a one-time token and store it
  const token = crypto.randomBytes(24).toString('hex');
  const tokens = await readKvList(AUDIT_TOKEN_KEY);
  // Trim expired
  const now = Date.now();
  const trimmed = tokens.filter(t => t.expires > now).slice(-200);
  trimmed.push({
    token, email,
    created_at: new Date().toISOString(),
    expires: now + AUDIT_TOKEN_TTL_MS,
  });
  await writeKvList(AUDIT_TOKEN_KEY, trimmed);

  // Build the magic link
  const base = AUDIT_BASE_URL || `${req.protocol}://${req.get('host')}`;
  const link = `${base}/audit/verify?token=${token}`;

  // Send via Resend
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: email,
        subject: 'Sign in to TGK 2.0 Audit',
        text:
          `Click this link to sign in to TGK 2.0 Audit:\n\n${link}\n\n` +
          `It expires in 15 minutes and only works once.\n\n` +
          `If you didn't request this, you can ignore the email.`,
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      console.error('Resend send failed:', r.status, body);
      const msg = encodeURIComponent('Could not send email. Try again or contact the admin.');
      return res.redirect('/audit/login?err=' + msg);
    }
  } catch (e) {
    console.error('Resend send error:', e?.message || e);
    const msg = encodeURIComponent('Email service error. Try again later.');
    return res.redirect('/audit/login?err=' + msg);
  }

  res.redirect('/audit/login?sent=1');
});

// ---- Verify a magic link → set session cookie → bounce to /audit.html ----
app.get('/audit/verify', async (req, res) => {
  const token = String(req.query.token || '');
  if (!token) return res.redirect('/audit/login?err=' + encodeURIComponent('Missing token.'));

  const tokens = await readKvList(AUDIT_TOKEN_KEY);
  const now = Date.now();
  const t = tokens.find(x => x.token === token && x.expires > now);
  if (!t) {
    return res.redirect('/audit/login?err=' +
      encodeURIComponent('Link expired or already used. Request a new one.'));
  }
  // Burn the token — single use
  await writeKvList(AUDIT_TOKEN_KEY, tokens.filter(x => x.token !== token));

  const session = await createSession(t.email);
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const cookie = [
    `tgk_audit=${session.sid}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(AUDIT_SESSION_TTL_MS / 1000)}`,
    isHttps ? 'Secure' : null,
  ].filter(Boolean).join('; ');
  res.set('Set-Cookie', cookie);
  res.redirect('/audit.html');
});

// ---- Sign out ----
app.get('/audit/signout', async (req, res) => {
  const sid = parseCookies(req)['tgk_audit'];
  await destroySession(sid);
  res.set('Set-Cookie', 'tgk_audit=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
  res.redirect('/audit/login');
});

// ---- Whoami (the page uses this to show the signed-in email) ----
app.get('/audit/whoami', async (req, res) => {
  const sid = parseCookies(req)['tgk_audit'];
  const session = await findValidSession(sid);
  if (session) return res.json({ email: session.email, source: 'magic-link' });
  // Basic-auth fallback path also gets a name
  const header = req.headers.authorization || '';
  if (header.startsWith('Basic ')) return res.json({ email: 'admin@local', source: 'basic-auth' });
  res.status(401).json({ email: null });
});

// One-time accept a larger body just for this endpoint family — full
// VERTICALS payloads are ~200KB. Keep the global 64kb cap on /api/feedback.
const auditJson = express.json({ limit: '2mb' });

// Read VERTICALS out of the shell file by extracting and Function-eval'ing
// the const VERTICALS = { … }; block. Same approach as scripts/import_storylines.py
// uses in dry-run, but in JS so we can serve it without spawning Python.
function loadStorylines() {
  const shellPath = path.join(__dirname, 'stories/_shared/story-shell.html');
  const text = fs.readFileSync(shellPath, 'utf8');
  const m = text.match(/const\s+VERTICALS\s*=\s*\{[\s\S]*?\n\};/);
  if (!m) throw new Error('VERTICALS block not found in story-shell.html');
  // eslint-disable-next-line no-new-func
  const fn = new Function(`${m[0]}; return VERTICALS;`);
  return fn();
}

// Map of disco lane key → { sourceFile, blockId, storyKey, laneLabel }.
// Mirrors LANES in scripts/build_discovery_full.py (must stay in sync).
const DISCO_LANES = [
  { lane: 'banking-deposits',        file: 'banking-deposits.html',                 block: 'steps-data',         story: 'banking-deposits',          label: 'Account opening' },
  { lane: 'insurance-life-nb',       file: 'insurance-life.html',                   block: 'steps-new-business', story: 'insurance-life',            label: 'New business' },
  { lane: 'insurance-life-claims',   file: 'insurance-life.html',                   block: 'steps-death-claims', story: 'insurance-life',            label: 'Death claims' },
  { lane: 'insurance-pc-nb',         file: 'insurance-pc.html',                     block: 'steps-policy',       story: 'insurance-pc',              label: 'New business' },
  { lane: 'insurance-pc-claims',     file: 'insurance-pc.html',                     block: 'steps-claims',       story: 'insurance-pc',              label: 'Claims (FNOL)' },
  { lane: 'wealth-discovery',        file: 'wealth-onboarding.html',                block: 'steps-data',         story: 'wealth-discovery',          label: 'New account onboarding' },
  { lane: 'provider-roi',            file: 'hls-roi.html',                          block: 'steps-data',         story: 'provider-roi',              label: 'Records release' },
  { lane: 'slgov-311',               file: 'public-sector-311.html',                block: 'steps-data',         story: 'slgov-311',                 label: '311 service request' },
  { lane: 'slgov-benefits',          file: 'public-sector-benefits.html',           block: 'steps-data',         story: 'slgov-benefits',            label: 'Benefits intake' },
  { lane: 'slgov-employee-onboard',  file: 'public-sector-employee-onboarding.html',block: 'steps-data',         story: 'slgov-employee-onboarding', label: 'Employee onboarding' },
  { lane: 'slgov-licensing',         file: 'public-sector-licensing.html',          block: 'steps-data',         story: 'slgov-licensing',           label: 'Licensing' },
  { lane: 'slgov-recertification',   file: 'public-sector-recertification.html',    block: 'steps-data',         story: 'slgov-recertification',     label: 'Annual recertification' },
  { lane: 'slgov-vendor-compliance', file: 'public-sector-vendor-compliance.html',  block: 'steps-data',         story: 'slgov-vendor-compliance',   label: 'Vendor compliance' },
];

function loadDiscovery() {
  const out = {};
  for (const ent of DISCO_LANES) {
    const fp = path.join(__dirname, ent.file);
    if (!fs.existsSync(fp)) continue;
    const text = fs.readFileSync(fp, 'utf8');
    const re = new RegExp(`<script id="${ent.block}"[^>]*>([\\s\\S]*?)</script>`);
    const m = text.match(re);
    if (!m) continue;
    out[ent.lane] = {
      lane: ent.lane,
      sourceFile: ent.file,
      blockId: ent.block,
      storyKey: ent.story,
      laneLabel: ent.label,
      steps: JSON.parse(m[1]),
    };
  }
  return out;
}

app.get('/api/audit/storylines', requireAudit, (req, res) => {
  try { res.json(loadStorylines()); }
  catch (e) { console.error('audit storylines error:', e?.message || e);
              res.status(500).json({ error: 'load error' }); }
});

app.get('/api/audit/discovery', requireAudit, (req, res) => {
  try { res.json(loadDiscovery()); }
  catch (e) { console.error('audit discovery error:', e?.message || e);
              res.status(500).json({ error: 'load error' }); }
});

// Pending-queue helpers (parallel to the feedback store pattern above)
async function readAuditQueue() {
  try {
    const raw = await db.get(AUDIT_KV_KEY);
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object' && Array.isArray(raw.value)) return raw.value;
    return [];
  } catch (e) {
    console.error('audit queue read:', e?.message || e);
    return [];
  }
}
async function mutateAuditQueue(fn) {
  const items = await readAuditQueue();
  fn(items);
  await db.set(AUDIT_KV_KEY, items);
  return items;
}

// --------- Submit a change set for review ---------
// Body: { dataset: 'storylines'|'discovery', changes: {...},
//         author: '...', note: '...', source: 'web'|'upload' }
// changes shape:
//   storylines  → { [verticalKey]: { partial vertical override } }
//   discovery   → { [laneKey]: { steps: [...] } }
app.post('/api/audit/submit', requireAudit, auditJson, async (req, res) => {
  try {
    const { dataset, changes, author, note, source } = req.body || {};
    if (!['storylines', 'discovery'].includes(dataset)) {
      return res.status(400).json({ error: 'dataset must be storylines or discovery' });
    }
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
      return res.status(400).json({ error: 'changes must be an object' });
    }
    const keyCount = Object.keys(changes).length;
    if (keyCount === 0) return res.status(400).json({ error: 'no changes provided' });

    const item = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      dataset,
      changes,
      key_count: keyCount,
      author: (author || '').toString().slice(0, 120) || null,
      note: (note || '').toString().slice(0, 2000) || null,
      source: source === 'upload' ? 'upload' : 'web',
      status: 'pending',
    };
    await mutateAuditQueue(items => { items.push(item); });
    res.json({ ok: true, id: item.id });
  } catch (e) {
    console.error('audit submit error:', e?.message || e);
    res.status(500).json({ error: 'store error' });
  }
});

// --------- Admin: list / inspect / mark applied / reject ---------
app.get('/admin/audit/queue.json', requireAdmin, async (req, res) => {
  try { res.json(await readAuditQueue()); }
  catch (e) { res.status(500).json({ error: 'store error' }); }
});

app.post('/admin/audit/:id/status', requireAdmin, auditJson, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['pending', 'applied', 'rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'bad status' });
    let updated = null;
    await mutateAuditQueue(items => {
      const it = items.find(x => x.id === req.params.id);
      if (it) { it.status = status; it.decided_at = new Date().toISOString(); updated = it; }
    });
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('audit status error:', e?.message || e);
    res.status(500).json({ error: 'store error' });
  }
});

// Lightweight admin shell — lists pending submissions, links to detail JSON.
// Application of changes (running the importer) is still done by you locally
// via `python3 scripts/import_storylines.py` after pulling the submission's
// payload — keeps the live shell safe from accidental remote writes.
app.get('/admin/audit', requireAdmin, async (req, res) => {
  const items = await readAuditQueue();
  const fmt = (s) => new Date(s).toLocaleString();
  const rows = items.slice().reverse().map(it => `
    <tr>
      <td><code>${it.id.slice(0, 8)}</code></td>
      <td>${fmt(it.created_at)}</td>
      <td><span class="ds">${it.dataset}</span></td>
      <td>${it.key_count} key(s)</td>
      <td>${it.author || '<span class=mute>—</span>'}</td>
      <td><span class="st st-${it.status}">${it.status}</span></td>
      <td>${it.note ? it.note.slice(0, 80) : ''}</td>
      <td>
        <a href="/admin/audit/${it.id}/payload.json">payload</a>
        ·
        <a href="#" data-id="${it.id}" data-st="applied" class="mark">mark applied</a>
        ·
        <a href="#" data-id="${it.id}" data-st="rejected" class="mark">reject</a>
      </td>
    </tr>`).join('');

  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8">
<title>TGK Audit Queue</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 32px; color:#1F1A14; }
  h1 { font-weight: 500; font-size: 20px; margin: 0 0 18px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #E8E4DA; vertical-align: top; }
  th { background: #F5F1EB; font-weight: 500; color: #6E6760; font-size: 12px; }
  code { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #6E6760; }
  .ds { font-family: ui-monospace, Menlo, monospace; font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #EFEFEF; }
  .st { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
  .st-pending { background: #FFF6B8; color: #6B5400; }
  .st-applied { background: #D6EFD9; color: #1F5824; }
  .st-rejected { background: #F4D6D6; color: #6E2424; }
  .mark { color: #4B00E9; text-decoration: none; }
  .mark:hover { text-decoration: underline; }
  .mute { color: #B4B2A9; }
  .empty { color: #6E6760; padding: 40px; text-align: center; font-style: italic; }
</style></head>
<body>
<h1>Audit queue · pending submissions</h1>
${items.length === 0 ? '<div class="empty">No submissions yet.</div>' : `
<table>
  <tr><th>ID</th><th>Submitted</th><th>Dataset</th><th>Scope</th><th>Author</th><th>Status</th><th>Note</th><th>Actions</th></tr>
  ${rows}
</table>`}
<script>
document.querySelectorAll('a.mark').forEach(a => {
  a.addEventListener('click', async (e) => {
    e.preventDefault();
    const id = a.dataset.id, status = a.dataset.st;
    const r = await fetch('/admin/audit/' + id + '/status',
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status }) });
    if (r.ok) location.reload();
    else alert('Failed: ' + (await r.text()));
  });
});
</script></body></html>`);
});

app.get('/admin/audit/:id/payload.json', requireAdmin, async (req, res) => {
  const items = await readAuditQueue();
  const it = items.find(x => x.id === req.params.id);
  if (!it) return res.status(404).json({ error: 'not found' });
  res.json(it);
});

// --------- Static (HTML/JS/assets) ---------
app.use(express.static(__dirname, {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.listen(PORT, () => {
  console.log(`TGK 2.0 running on port ${PORT}`);
  if (!ADMIN_PASSWORD) {
    console.log('NOTE: ADMIN_PASSWORD secret is not set — /admin/feedback is locked.');
  }
});
