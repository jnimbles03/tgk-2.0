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
const LEGACY_STORE_PATH = path.join(__dirname, 'feedback-store.json');
const KV_KEY = 'feedback:list';

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
