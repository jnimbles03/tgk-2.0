/* ============================================================
   TGK 2.0 — click-to-advance harness for story templates
   ============================================================
   Loaded by the Docusign story-templates that auto-play CSS keyframe
   sequences. Inert by default. When the embedding context appends
   ?interactive=1 (the headless-iam portal drilldowns do), the template
   stops being a movie: every timed animation freezes, and the viewer
   advances the sequence click by click.

   How it works:
   1. Pause all CSS animations page-wide.
   2. Collect animated elements, run "ambient" ones immediately
      (infinite loops — pulses, tickers — they're texture, not story),
      and bucket the rest by animation-delay into discrete steps.
   3. A small pill shows "Click to advance · step n of N"; any click on
      a non-interactive target runs the next bucket.
   4. After the last step the pill offers Replay (reloads the iframe).

   Used standalone (no param) or inside story-shell scenes, nothing
   changes — the shell's narrated auto-play behavior is untouched.
   ============================================================ */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  if (params.get('interactive') !== '1') return;
  if (window._tgkIaHandled) return;  // template has its own interactive mode

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onReady(function () {
    /* 1. Freeze everything (elements and their pseudo-elements). */
    var freeze = document.createElement('style');
    freeze.id = 'ia-freeze';
    freeze.textContent =
      '*, *::before, *::after { animation-play-state: paused !important; }' +
      '.ia-run, .ia-run::before, .ia-run::after { animation-play-state: running !important; }' +
      '#ia-pill { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%);' +
      ' z-index: 99999; background: #130032; color: #fff; border-radius: 999px;' +
      ' font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;' +
      ' letter-spacing: .04em; padding: 10px 18px; cursor: pointer; user-select: none;' +
      ' box-shadow: 0 4px 18px rgba(19,0,50,.35); display: flex; align-items: center; gap: 8px;' +
      ' animation: none !important; }' +
      '#ia-pill .ia-dot { width: 7px; height: 7px; border-radius: 50%; background: #3FDA99;' +
      ' animation: none !important; }';
    document.head.appendChild(freeze);

    /* 2. Find animated elements; split ambient loops from story steps. */
    var all = document.body.querySelectorAll('*');
    var steps = {}; /* delayBucket -> [els] */
    var keys = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.id === 'ia-pill') continue;
      var cs = getComputedStyle(el);
      if (!cs.animationName || cs.animationName === 'none') continue;
      var iter = (cs.animationIterationCount || '').split(',')[0].trim();
      if (iter === 'infinite') { el.classList.add('ia-run'); continue; } /* ambient */
      var delay = parseFloat((cs.animationDelay || '0s').split(',')[0]) || 0;
      var bucket = (Math.round(delay * 4) / 4).toFixed(2);
      if (!steps[bucket]) { steps[bucket] = []; keys.push(bucket); }
      steps[bucket].push(el);
    }
    keys.sort(function (a, b) { return parseFloat(a) - parseFloat(b); });

    /* Nothing stepped? Template is already interactive or static — leave
       the freeze (ambient loops still run) and add no chrome. */
    if (!keys.length) return;

    /* 3. The pill + click-to-advance. */
    var idx = 0;
    var pill = document.createElement('div');
    pill.id = 'ia-pill';
    pill.setAttribute('role', 'button');
    pill.setAttribute('aria-live', 'polite');
    function label() {
      pill.innerHTML = idx < keys.length
        ? '<span class="ia-dot"></span> Click to advance · step ' + (idx + 1) + ' of ' + keys.length
        : '<span class="ia-dot"></span> Done · click to replay';
    }
    label();
    document.body.appendChild(pill);

    /* Zero-delay bucket is the opening beat — run it on load so the
       screen isn't blank, then wait for clicks. */
    if (keys[0] === '0.00') {
      steps[keys[0]].forEach(function (el) {
        el.style.setProperty('animation-delay', '0s', 'important');
        el.classList.add('ia-run');
      });
      idx = 1;
      label();
    }

    function advance() {
      if (idx >= keys.length) { location.reload(); return; }
      steps[keys[idx]].forEach(function (el) {
        /* Cancel the authored stagger — this step starts NOW. */
        el.style.setProperty('animation-delay', '0s', 'important');
        el.classList.add('ia-run');
      });
      idx++;
      label();
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('a, button:not(#ia-pill), input, select, textarea, [role="button"]:not(#ia-pill)')) return;
      advance();
    }, true);
    pill.addEventListener('click', function (e) { e.stopPropagation(); advance(); }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); advance(); }
    });
  });
})();
