/* =========================================================================
   TGK 2.0 — Feedback Widget
   -------------------------------------------------------------------------
   Self-bootstrapping floating feedback button + panel.
   Text-only. Docusign-themed. No emoji — inline SVG glyphs only.

   USAGE:  <script src="feedback-widget.js" defer></script>

   CONFIG (optional, set BEFORE the <script> tag):
     window.FEEDBACK_ENDPOINT = '/api/feedback'  // POST target
     window.FEEDBACK_PROJECT  = 'tgk-2.0'        // tag for the backend

   BEHAVIOR:
     - If FEEDBACK_ENDPOINT is set, widget POSTs JSON to it.
     - If not set (or POST fails), feedback is queued in localStorage
       under 'tgk-feedback-queue'. User can export queue as a JSON file
       from the panel footer.
   ========================================================================= */
(function () {
  'use strict';

  // Avoid double-install
  if (window.__TGK_FEEDBACK_WIDGET__) return;
  window.__TGK_FEEDBACK_WIDGET__ = true;

  const CONFIG = {
    endpoint: window.FEEDBACK_ENDPOINT || null,
    project:  window.FEEDBACK_PROJECT  || 'tgk-2.0',
    storageKey: 'tgk-feedback-queue'
  };

  // --------- Style injection ---------
  const css = `
    .tgk-fb-btn {
      position: fixed; bottom: 22px; right: 22px; z-index: 99998;
      width: 52px; height: 52px; border-radius: 50%; border: none;
      background: #4C00FF; color: #fff;
      box-shadow: 0 8px 24px rgba(76, 0, 255, 0.35), 0 2px 6px rgba(19, 0, 50, 0.25);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: transform 0.18s cubic-bezier(0.4,0,0.2,1), box-shadow 0.18s cubic-bezier(0.4,0,0.2,1), background 0.18s cubic-bezier(0.4,0,0.2,1);
      font-family: inherit;
    }
    .tgk-fb-btn:hover { background: #26065D; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(76, 0, 255, 0.45), 0 2px 6px rgba(19, 0, 50, 0.3); }
    .tgk-fb-btn:active { transform: translateY(0); }
    .tgk-fb-btn svg { width: 22px; height: 22px; }
    .tgk-fb-badge {
      position: absolute; top: -4px; right: -4px;
      min-width: 20px; height: 20px; padding: 0 6px;
      background: #FF5252; color: #fff;
      border-radius: 10px; border: 2px solid #fff;
      font-size: 10.5px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .tgk-fb-overlay {
      position: fixed; inset: 0; z-index: 99997;
      background: rgba(19, 0, 50, 0.25);
      backdrop-filter: blur(2px);
      display: none;
      animation: tgkFbFade 0.2s cubic-bezier(0.4,0,0.2,1);
    }
    .tgk-fb-overlay.active { display: block; }
    @keyframes tgkFbFade { from { opacity: 0; } to { opacity: 1; } }

    .tgk-fb-panel {
      position: fixed; bottom: 88px; right: 22px; z-index: 99999;
      width: 360px; max-width: calc(100vw - 44px);
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 24px 60px rgba(19, 0, 50, 0.35), 0 0 0 1px rgba(19, 0, 50, 0.06);
      font-family: 'DSIndigo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: none;
      overflow: hidden;
      animation: tgkFbPop 0.22s cubic-bezier(0.4,0,0.2,1);
    }
    .tgk-fb-panel.active { display: block; }
    @keyframes tgkFbPop {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .tgk-fb-header {
      padding: 16px 18px 12px;
      background: linear-gradient(135deg, #26065D 0%, #4C00FF 100%);
      color: #fff; position: relative;
    }
    .tgk-fb-header h4 {
      margin: 0; font-size: 15px; font-weight: 600; letter-spacing: -0.01em;
      display: flex; align-items: center; gap: 8px;
    }
    .tgk-fb-header h4 svg { width: 15px; height: 15px; }
    .tgk-fb-header p {
      margin: 4px 0 0; font-size: 11.5px;
      color: rgba(255,255,255,0.7); line-height: 1.5;
      font-family: 'Inter', sans-serif;
    }
    .tgk-fb-close {
      position: absolute; top: 12px; right: 10px;
      width: 26px; height: 26px; border: none;
      background: rgba(255,255,255,0.12); color: #fff;
      border-radius: 6px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .tgk-fb-close:hover { background: rgba(255,255,255,0.22); }
    .tgk-fb-close svg { width: 13px; height: 13px; }

    .tgk-fb-context {
      padding: 12px 18px 0;
      font-size: 11px; font-family: 'Inter', sans-serif;
      color: rgba(19, 0, 50, 0.55); line-height: 1.5;
    }
    .tgk-fb-context .tgk-fb-ctx-label {
      font-size: 9.5px; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: rgba(19, 0, 50, 0.4); margin-bottom: 4px;
    }
    .tgk-fb-context code {
      background: rgba(76, 0, 255, 0.06);
      color: #4C00FF;
      padding: 2px 6px; border-radius: 4px;
      font-size: 10.5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      word-break: break-word;
    }

    .tgk-fb-body { padding: 14px 18px 4px; }
    .tgk-fb-body label {
      display: block;
      font-size: 11px; font-weight: 600;
      color: rgba(19, 0, 50, 0.7);
      margin-bottom: 6px;
      font-family: 'DSIndigo', sans-serif;
      letter-spacing: -0.01em;
    }
    .tgk-fb-body textarea {
      width: 100%; min-height: 96px; max-height: 240px;
      padding: 10px 12px;
      border: 1.5px solid rgba(19, 0, 50, 0.12);
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 13px; line-height: 1.5; color: #130032;
      resize: vertical;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    .tgk-fb-body textarea:focus {
      outline: none;
      border-color: #4C00FF;
      box-shadow: 0 0 0 3px rgba(76, 0, 255, 0.12);
    }
    .tgk-fb-body input[type="text"] {
      width: 100%; padding: 8px 12px;
      border: 1.5px solid rgba(19, 0, 50, 0.12);
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 12.5px; color: #130032;
      box-sizing: border-box;
      margin-top: 8px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .tgk-fb-body input[type="text"]:focus {
      outline: none;
      border-color: #4C00FF;
      box-shadow: 0 0 0 3px rgba(76, 0, 255, 0.12);
    }

    .tgk-fb-footer {
      padding: 12px 18px 16px;
      display: flex; gap: 8px; align-items: center;
      border-top: 1px solid rgba(19, 0, 50, 0.06);
      margin-top: 8px;
    }
    .tgk-fb-submit {
      flex: 1; padding: 10px 16px; border: none;
      background: #4C00FF; color: #fff;
      border-radius: 7px; font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: 'DSIndigo', sans-serif;
      letter-spacing: -0.01em;
      transition: background 0.15s, transform 0.15s;
    }
    .tgk-fb-submit:hover:not(:disabled) { background: #26065D; }
    .tgk-fb-submit:disabled {
      background: rgba(19, 0, 50, 0.15);
      color: rgba(19, 0, 50, 0.4);
      cursor: not-allowed;
    }
    .tgk-fb-export {
      padding: 10px 12px; border: 1px solid rgba(19, 0, 50, 0.12);
      background: #fff; color: rgba(19, 0, 50, 0.6);
      border-radius: 7px; font-size: 11.5px; font-weight: 600;
      cursor: pointer; font-family: 'DSIndigo', sans-serif;
      transition: color 0.15s, border-color 0.15s;
      white-space: nowrap;
    }
    .tgk-fb-export:hover { color: #4C00FF; border-color: #CBC2FF; }
    .tgk-fb-export[hidden] { display: none; }

    .tgk-fb-success {
      padding: 28px 18px;
      text-align: center;
      font-family: 'DSIndigo', sans-serif;
    }
    .tgk-fb-success svg { color: #4C00FF; width: 36px; height: 36px; margin-bottom: 8px; }
    .tgk-fb-success h4 {
      margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #130032;
      letter-spacing: -0.01em;
    }
    .tgk-fb-success p {
      margin: 0; font-size: 12px; font-family: 'Inter', sans-serif;
      color: rgba(19, 0, 50, 0.55); line-height: 1.5;
    }

    @media (max-width: 480px) {
      .tgk-fb-panel {
        width: calc(100vw - 24px);
        right: 12px;
        bottom: 82px;
      }
      .tgk-fb-btn { right: 16px; bottom: 16px; width: 48px; height: 48px; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.id = 'tgk-fb-style';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // --------- Screen context capture ---------
  function captureContext() {
    const ctx = {
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      title: document.title,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // index-unified.html specifics
    const activeMode = document.querySelector('.mode.active');
    if (activeMode) ctx.activeMode = activeMode.id;

    const activeView = document.querySelector('#modeStory .view.active, .view.active');
    if (activeView) ctx.activeView = activeView.id;

    // Picker state if present
    if (typeof window.selectedVertical === 'string') ctx.selectedVertical = window.selectedVertical;
    if (typeof window.selectedWorkflow === 'string') ctx.selectedWorkflow = window.selectedWorkflow;

    return ctx;
  }

  function describeContext(ctx) {
    const parts = [];
    const page = (ctx.pathname.split('/').pop() || 'index.html').replace('.html', '');
    parts.push(page);
    if (ctx.activeMode) parts.push(ctx.activeMode.replace(/^mode/, '').toLowerCase());
    if (ctx.activeView && ctx.activeView !== 'scene-0') parts.push(ctx.activeView);
    if (ctx.selectedVertical && ctx.selectedWorkflow) parts.push(`${ctx.selectedVertical}/${ctx.selectedWorkflow}`);
    return parts.join(' · ');
  }

  // --------- Queue helpers (localStorage fallback) ---------
  function getQueue() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function setQueue(arr) {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(arr)); } catch (e) {}
  }
  function enqueue(item) {
    const q = getQueue();
    q.push(item);
    setQueue(q);
    updateBadge();
  }
  function clearQueue() {
    setQueue([]);
    updateBadge();
  }
  function exportQueue() {
    const q = getQueue();
    if (q.length === 0) return;
    const blob = new Blob([JSON.stringify(q, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `tgk-feedback-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (confirm(`Exported ${q.length} feedback item${q.length === 1 ? '' : 's'}. Clear the local queue?`)) {
      clearQueue();
      refreshExportButton();
    }
  }

  // --------- DOM build ---------
  const btn = document.createElement('button');
  btn.className = 'tgk-fb-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Send feedback');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <span class="tgk-fb-badge" hidden>0</span>
  `;
  document.body.appendChild(btn);

  const overlay = document.createElement('div');
  overlay.className = 'tgk-fb-overlay';
  document.body.appendChild(overlay);

  const panel = document.createElement('div');
  panel.className = 'tgk-fb-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'tgk-fb-title');
  panel.innerHTML = `
    <div class="tgk-fb-header">
      <h4 id="tgk-fb-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Feedback on this screen
      </h4>
      <p>What's unclear, broken, or worth changing? The product team reviews every submission.</p>
      <button class="tgk-fb-close" type="button" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="tgk-fb-form">
      <div class="tgk-fb-context">
        <div class="tgk-fb-ctx-label">You're on</div>
        <code class="tgk-fb-ctx-summary"></code>
      </div>
      <div class="tgk-fb-body">
        <label for="tgk-fb-msg">Your feedback</label>
        <textarea id="tgk-fb-msg" placeholder="e.g. The KYC callout overlaps the signature field on 13-inch screens." maxlength="2000"></textarea>
        <input type="text" class="tgk-fb-email" placeholder="Your name or email (optional)" maxlength="120">
      </div>
      <div class="tgk-fb-footer">
        <button class="tgk-fb-submit" type="button" disabled>Send feedback</button>
        <button class="tgk-fb-export" type="button" hidden>Export pending</button>
      </div>
    </div>
    <div class="tgk-fb-success" hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <h4>Thanks — queued for review.</h4>
      <p class="tgk-fb-success-detail"></p>
    </div>
  `;
  document.body.appendChild(panel);

  const elBadge   = btn.querySelector('.tgk-fb-badge');
  const elClose   = panel.querySelector('.tgk-fb-close');
  const elCtx     = panel.querySelector('.tgk-fb-ctx-summary');
  const elMsg     = panel.querySelector('#tgk-fb-msg');
  const elEmail   = panel.querySelector('.tgk-fb-email');
  const elSubmit  = panel.querySelector('.tgk-fb-submit');
  const elExport  = panel.querySelector('.tgk-fb-export');
  const elForm    = panel.querySelector('.tgk-fb-form');
  const elSuccess = panel.querySelector('.tgk-fb-success');
  const elSuccessDetail = panel.querySelector('.tgk-fb-success-detail');

  // --------- UI state ---------
  function openPanel() {
    elCtx.textContent = describeContext(captureContext());
    panel.classList.add('active');
    overlay.classList.add('active');
    refreshExportButton();
    setTimeout(() => elMsg.focus(), 50);
  }
  function closePanel() {
    panel.classList.remove('active');
    overlay.classList.remove('active');
    // Reset form after animation
    setTimeout(() => {
      elForm.hidden = false;
      elSuccess.hidden = true;
      elMsg.value = '';
      elSubmit.disabled = true;
    }, 220);
  }
  function updateBadge() {
    const count = getQueue().length;
    if (count > 0) {
      elBadge.hidden = false;
      elBadge.textContent = count > 99 ? '99+' : String(count);
    } else {
      elBadge.hidden = true;
    }
  }
  function refreshExportButton() {
    const count = getQueue().length;
    if (count > 0) {
      elExport.hidden = false;
      elExport.textContent = `Export pending (${count})`;
    } else {
      elExport.hidden = true;
    }
  }

  // --------- Event bindings ---------
  btn.addEventListener('click', openPanel);
  elClose.addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('active')) closePanel();
  });
  elMsg.addEventListener('input', () => {
    elSubmit.disabled = elMsg.value.trim().length < 3;
  });
  elExport.addEventListener('click', exportQueue);

  // --------- Submit ---------
  async function submitFeedback() {
    const message = elMsg.value.trim();
    if (message.length < 3) return;

    elSubmit.disabled = true;
    elSubmit.textContent = 'Sending…';

    const payload = {
      project: CONFIG.project,
      message: message,
      reporter: elEmail.value.trim() || null,
      context: captureContext()
    };

    let delivery = 'queued-locally';

    if (CONFIG.endpoint) {
      try {
        const res = await fetch(CONFIG.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          delivery = 'sent';
        } else {
          enqueue(payload);
        }
      } catch (e) {
        enqueue(payload);
      }
    } else {
      enqueue(payload);
    }

    // Show success state
    elForm.hidden = true;
    elSuccess.hidden = false;
    elSuccessDetail.textContent = delivery === 'sent'
      ? 'Sent to the review queue. The team will see it on the admin dashboard.'
      : 'Saved locally. Click "Export pending" from the panel footer to download the queue.';
    elSubmit.textContent = 'Send feedback';

    // Auto-close after a moment
    setTimeout(() => {
      if (panel.classList.contains('active')) closePanel();
    }, 2400);
  }
  elSubmit.addEventListener('click', submitFeedback);
  elMsg.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !elSubmit.disabled) {
      submitFeedback();
    }
  });

  // --------- Init ---------
  updateBadge();
})();
