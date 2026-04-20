# TGK 2.0 — Interactive Discovery Hub

A Docusign-themed interactive demo (multiple vertical / use-case HTML pages) with a feedback widget and centralized admin dashboard.

## Stack
- **Server:** Node.js + Express (`server.js`), serves static HTML/JS, exposes feedback API and admin UI
- **Storage:** Replit Key-Value DB (`@replit/database`) under key `feedback:list`. All read-modify-write paths go through a single in-process mutex (`mutateStore`) so concurrent posts/status changes/AI analyses can't lose data.
- **Live updates:** Server-Sent Events at `/admin/feedback/stream` (Basic Auth) push `feedback`, `analysis`, `decision`, and `analysis-error` events to the open admin dashboard.
- **AI triage:** OpenAI via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_*` env vars, model `gpt-5.1`, JSON-mode). Each new feedback submission is analyzed in the background (severity, complexity, confidence, suggested fix, likely files, recommended action). Analysis is fire-and-forget — POST stays fast.
- **Deployment:** Reserved VM (`deploymentTarget = "gce"` in `.replit`) for persistent storage + single-instance SSE.

## Key files
- `server.js` — Express app, KV store, mutex, SSE, admin HTML/UI, AI triage
- `feedback-widget.js` — floating widget injected on every page; pulse animation, tooltip, category chips, local queue + auto-flush on load/focus/online
- `index-unified.html` and the per-vertical HTML files — the interactive pages
- `feedback-store.json` — legacy file store; auto-migrated to KV on first boot then renamed

## Admin
- URL: `/admin/feedback`
- Auth: Basic Auth, user `admin` (override via `ADMIN_USER`), password from `ADMIN_PASSWORD` secret
- Per-card: status select, delete, AI analysis pills (severity/complexity/confidence/recommended action), suggested fix, likely files, **Approve fix** / **Reject** / **Re-analyze** buttons
- Live indicator next to header title (● live / ○ reconnecting)

## API
- `POST /api/feedback` — public; accepts `{project, category, message, reporter, context}`
- `GET /admin/feedback.json` — full list (auth)
- `POST /admin/feedback/:id/status` — `{status: new|reviewed|resolved|wontfix}`
- `POST /admin/feedback/:id/decision` — `{decision: approved|rejected|pending}`
- `POST /admin/feedback/:id/analyze` — re-run AI triage
- `DELETE /admin/feedback/:id`
- `GET /admin/feedback/stream` — SSE

## Notes
- The auto-do threshold (auto-execute `recommended_action: "auto-fix"`) is intentionally NOT implemented — all approvals are recorded but execution stays manual until the user opts in.
- The widget falls back to localStorage on POST failure and auto-flushes the queue on page load, tab focus, and `online` events.
