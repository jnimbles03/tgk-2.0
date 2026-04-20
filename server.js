/* =========================================================================
   TGK 2.0 — Express host
   -------------------------------------------------------------------------
   Minimal static server for Replit (or any Node host).
   Serves every .html / .js / asset in this folder.

   Later, when the feedback backend is added, append routes below the
   marked section — no other file needs to change.
   ========================================================================= */
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Default landing — unified picker with Discovery / Demo Story toggle
app.get('/', (req, res) => {
  res.redirect('/index-unified.html');
});

// Static serve everything else (HTML, JS, assets) from the repo root.
app.use(express.static(__dirname, {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    // No cache on HTML/JS during iteration; assets can cache longer.
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

/* -------------------------------------------------------------------------
   FEEDBACK API (placeholder — activate when backend is added)
   -------------------------------------------------------------------------
   The feedback widget falls back to localStorage when no endpoint exists,
   so leaving this commented-out is fine for v1. To enable:
     1. npm install better-sqlite3
     2. Uncomment the block below
     3. In each HTML, set: window.FEEDBACK_ENDPOINT = '/api/feedback'
   ------------------------------------------------------------------------- */
// const Database = require('better-sqlite3');
// const db = new Database(path.join(__dirname, 'feedback.db'));
// db.exec(`CREATE TABLE IF NOT EXISTS feedback (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   project TEXT, message TEXT, reporter TEXT,
//   context TEXT, status TEXT DEFAULT 'pending',
//   created_at TEXT DEFAULT CURRENT_TIMESTAMP
// )`);
// app.use(express.json({ limit: '64kb' }));
// app.post('/api/feedback', (req, res) => {
//   const { project, message, reporter, context } = req.body || {};
//   if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message required' });
//   db.prepare('INSERT INTO feedback (project, message, reporter, context) VALUES (?, ?, ?, ?)').run(
//     project || 'tgk-2.0',
//     message.slice(0, 2000),
//     (reporter || '').slice(0, 120) || null,
//     JSON.stringify(context || {})
//   );
//   res.json({ ok: true });
// });

app.listen(PORT, () => {
  console.log(`TGK 2.0 running on port ${PORT}`);
});
