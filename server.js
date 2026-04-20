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

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const LEGACY_STORE_PATH = path.join(__dirname, 'feedback-store.json');
const KV_KEY = 'feedback:list';

const db = new Database();

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
    const items = await readStore();
    items.push(item);
    await writeStore(items);
    broadcast('feedback', item);
    res.json({ ok: true, id: item.id });
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
    const items = await readStore();
    const it = items.find(x => x.id === req.params.id);
    if (!it) return res.status(404).json({ error: 'not found' });
    it.status = status;
    await writeStore(items);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'store error' }); }
});

app.delete('/admin/feedback/:id', requireAdmin, async (req, res) => {
  try {
    const items = (await readStore()).filter(x => x.id !== req.params.id);
    await writeStore(items);
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
      return \`<div class="card" data-card-id="\${esc(it.id)}">
        <div class="row">
          <div class="body">
            <span class="pill cat-\${esc(it.category)}">\${esc(it.category)}</span>
            <span class="pill status-\${esc(it.status)}" style="margin-left:6px;">\${esc(it.status)}</span>
            <div class="meta">\${esc(fmt(it.created_at))} \${it.reporter ? '· '+esc(it.reporter) : ''}</div>
            <div class="msg">\${esc(it.message)}</div>
            \${where ? '<div><span class="ctx">'+esc(where)+'</span></div>' : ''}
            <details><summary>Context</summary><pre>\${esc(JSON.stringify(ctx, null, 2))}</pre></details>
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
    const btn = e.target.closest('button[data-action="delete"]');
    if (!btn) return;
    if (!confirm('Delete this feedback item?')) return;
    const id = btn.dataset.id;
    await fetch('/admin/feedback/' + id, { method: 'DELETE' });
    data = data.filter(x => x.id !== id);
    render();
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
