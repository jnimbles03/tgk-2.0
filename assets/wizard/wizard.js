/* ============================================================
   TGK 2.0 — Wizard primitive (JS)
   Extracted from index-unified.html on 2026-04-29 as part of the
   geos × index-unified picker consolidation.

   Exposes window.WizardPrimitive with three functions:

     WizardPrimitive.setStage(n)
       Pure body-class flip. Adds `wizard-mode`, removes any existing
       `wizard-stage-N`, and adds `wizard-stage-{n}`. n must be an
       integer >= 1. Pages call this from their selection handlers
       (e.g., selectVertical → setStage(2), selectSubvertical → 3).

     WizardPrimitive.getStage()
       Returns the currently active stage as a number, or null if
       wizard-mode is not active.

     WizardPrimitive.attachBack({ btnSelector, onBack, escapeKey })
       Wires the back button + (optionally) the Escape key to call
       the page-supplied onBack(currentStage) handler. The handler
       is responsible for clearing page state and re-calling
       setStage(currentStage - 1). Returns a teardown function.

         btnSelector — default '#wizardBack'
         onBack(stage) — required; called with the active stage
         escapeKey — default true; set false to skip Esc binding
         escapeGuard() — optional; return true to suppress Esc
                         (e.g., when a modal is open)

   Contract:
   - <body> must accept `wizard-mode` + `wizard-stage-N` classes.
   - The page owns the per-stage show/hide CSS for its own ids.
   - The page owns the state-clearing logic inside onBack.

   Migration notes for index-unified.html:
   - Replace `setWizardStage(n)` calls with `WizardPrimitive.setStage(n)`.
   - Replace the Escape + click wiring at the bottom of the
     wizardGoBack block with one WizardPrimitive.attachBack call.
   - Keep wizardGoBack itself (the body that clears state.* and
     removes .selected from #verticalGrid/#subverticalGrid/etc.).
   ============================================================ */
(function (global) {
  'use strict';

  var STAGE_CLASS_RE = /\bwizard-stage-\d+\b/g;

  function setStage(n) {
    if (typeof n !== 'number' || n < 1 || !Number.isFinite(n)) {
      throw new TypeError('WizardPrimitive.setStage: n must be a positive integer');
    }
    var body = document.body;
    body.classList.add('wizard-mode');
    // Strip any existing wizard-stage-* classes, then add the target one.
    body.className = body.className.replace(STAGE_CLASS_RE, '').replace(/\s+/g, ' ').trim();
    body.classList.add('wizard-stage-' + n);
  }

  function getStage() {
    var body = document.body;
    if (!body.classList.contains('wizard-mode')) return null;
    var match = body.className.match(/\bwizard-stage-(\d+)\b/);
    return match ? parseInt(match[1], 10) : null;
  }

  function attachBack(opts) {
    opts = opts || {};
    var btnSelector = opts.btnSelector || '#wizardBack';
    var onBack = opts.onBack;
    var bindEscape = opts.escapeKey !== false; // default true
    var escapeGuard = typeof opts.escapeGuard === 'function' ? opts.escapeGuard : null;

    if (typeof onBack !== 'function') {
      throw new TypeError('WizardPrimitive.attachBack: onBack handler is required');
    }

    function fire() {
      var stage = getStage();
      if (stage === null || stage < 2) return; // no-op on stage 1 or out of wizard
      onBack(stage);
    }

    var btn = document.querySelector(btnSelector);
    if (btn) btn.addEventListener('click', fire);

    var keyHandler = null;
    if (bindEscape) {
      keyHandler = function (e) {
        if (e.key !== 'Escape') return;
        if (escapeGuard && escapeGuard()) return;
        fire();
      };
      document.addEventListener('keydown', keyHandler);
    }

    // Return teardown for tests / dynamic pages.
    return function teardown() {
      if (btn) btn.removeEventListener('click', fire);
      if (keyHandler) document.removeEventListener('keydown', keyHandler);
    };
  }

  global.WizardPrimitive = {
    setStage: setStage,
    getStage: getStage,
    attachBack: attachBack
  };
})(window);
