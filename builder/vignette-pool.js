/* =========================================================================
   builder/vignette-pool.js — the single pool of vignettes (browser global).
   -------------------------------------------------------------------------
   One entry per vignette. A vignette is a self-contained, brandable, self-
   playing product moment that lives at /demos/<file> and rides the shared
   engine (demos/engine/demo-engine.js). The pool screen (builder/pool.html)
   reads this list to build the filterable picker; a share link is just the
   vignette file + the engine's brand/pack overrides (?embed=1&accent=…&brand=…
   &mark=…&pack=…), and a "story" is an ordered playlist of vignette ids.

   This is meant to become the ONE source of truth for the builder — the demos
   are the building blocks; OotB/Bespoke/timeline collapse into "pick one vs
   pick several from this pool." Keep ids stable (they match demo-catalog.js).

   Fields: { id, file, label, product, blurb, caps:[capability tags],
             verticals:[applicable vertical tags or '*'] }
   ========================================================================= */
(function (root) {
  const ALL = '*'; // applies to every vertical

  const POOL = [
    // ---- Intake -------------------------------------------------------------
    { id:'web-forms', file:'web-forms.html', label:'Web Forms', product:'Web Forms',
      blurb:'A branded, multi-step intake form that fills and advances itself.',
      caps:['intake','forms','prefill'], verticals:[ALL] },
    { id:'data-verification', file:'data-verification.html', label:'Data Verification', product:'Identity',
      blurb:'Verify income, employment, and identity data against third-party sources.',
      caps:['intake','verification','kyc'], verticals:[ALL] },

    // ---- Identity -----------------------------------------------------------
    { id:'idv-clear', file:'idv-clear.html', label:'Identity · CLEAR', product:'Identity Verification',
      blurb:'Step-up identity with CLEAR — biometric proof bound to the session.',
      caps:['identity','idv','biometric'], verticals:[ALL] },
    { id:'idv-idme', file:'idv-idme.html', label:'Identity · ID.me', product:'Identity Verification',
      blurb:'Government-grade identity verification via ID.me.',
      caps:['identity','idv','government'], verticals:['public-sector','healthcare','financial'] },
    { id:'idv-apple-wallet', file:'idv-apple-wallet.html', label:'Identity · Apple Wallet', product:'Identity Verification',
      blurb:'Tap-to-verify with a Wallet mobile driver’s license (mDL).',
      caps:['identity','idv','mobile'], verticals:[ALL] },
    { id:'idv-idverse', file:'idv-idverse.html', label:'Identity · Document Scan', product:'Identity Verification',
      blurb:'Document scan + liveness selfie with a face match.',
      caps:['identity','idv','biometric'], verticals:[ALL] },
    { id:'idv-risk', file:'idv-risk.html', label:'Risk-Based IDV', product:'Identity Verification',
      blurb:'Adaptive, risk-based step-up — assurance only when the signal calls for it.',
      caps:['identity','idv','risk'], verticals:[ALL] },

    // ---- Signing ------------------------------------------------------------
    { id:'esignature', file:'esignature.html', label:'eSignature', product:'eSignature',
      blurb:'The signing ceremony — guided tabs, adopt-signature, finish.',
      caps:['signing','ceremony'], verticals:[ALL] },

    // ---- Orchestration ------------------------------------------------------
    { id:'maestro', file:'maestro.html', label:'Workflow Builder', product:'Workflow Builder',
      blurb:'A no-code workflow that branches and routes — the orchestration canvas.',
      caps:['orchestration','workflow','automation'], verticals:[ALL] },

    // ---- Repository / Intelligence -----------------------------------------
    { id:'navigator', file:'navigator.html', label:'Agreement Manager', product:'Agreement Manager',
      blurb:'Ask the AI-extracted agreement repository — renewals, value, risk.',
      caps:['repository','ai-agent','intelligence'], verticals:[ALL] },
    { id:'search', file:'search.html', label:'AI Search', product:'Agreement Manager',
      blurb:'Ask your agreements anything — a cited answer from the portfolio.',
      caps:['search','ai-agent'], verticals:[ALL] },
    { id:'agreement-manager', file:'agreement-manager.html', label:'Agreement Manager · Worksheet', product:'Agreement Manager',
      blurb:'Run one question across the whole portfolio at once — the AI worksheet.',
      caps:['intelligence','ai-agent','repository'], verticals:[ALL] },
    { id:'agreement-intel-ma', file:'agreement-intel-ma.html', label:'Agreement Intel · M&A', product:'Agreement Intelligence',
      blurb:'M&A due diligence — inherited contracts, change-of-control, revenue at risk.',
      caps:['intelligence','ai-agent','risk'], verticals:['legal','financial'] },
    { id:'agreement-intel-sf-draft', file:'agreement-intel-sf-draft.html', label:'Agreement Intel · CRM', product:'Agreement Intelligence',
      blurb:'Chat with agreements inside Salesforce — summarize, compare, draft.',
      caps:['intelligence','ai-agent','crm'], verticals:[ALL] },

    // ---- Desk / Review / Lifecycle -----------------------------------------
    { id:'agreement-desk', file:'agreement-desk.html', label:'Agreement Desk', product:'Agreement Desk',
      blurb:'The intake queue — what’s waiting, what’s blocked, route it in one move.',
      caps:['queue','ai-agent','approvals'], verticals:[ALL] },
    { id:'ai-review', file:'ai-review.html', label:'AI Review', product:'AI-Assisted Review',
      blurb:'Review against your playbook — accept a redline and watch the clause change.',
      caps:['review','ai-agent','redline'], verticals:[ALL] },
    { id:'clm', file:'clm.html', label:'CLM', product:'CLM',
      blurb:'Contract lifecycle — authoring, negotiation, redlining.',
      caps:['clm','review','authoring'], verticals:['legal','financial'] },
    { id:'monitor', file:'monitor.html', label:'Monitor', product:'Monitor',
      blurb:'Compliance monitoring — alerts and anomalies across the agreement estate.',
      caps:['monitoring','compliance','risk'], verticals:[ALL] },

    // ---- Collaboration / Agents / Marketplace ------------------------------
    { id:'workspaces', file:'workspaces.html', label:'Workspaces', product:'Workspaces',
      blurb:'The shared deal room — documents, tasks, and the AI assistant in one place.',
      caps:['collaboration','workspace','ai-agent'], verticals:[ALL] },
    { id:'agentforce', file:'agentforce.html', label:'Agentforce', product:'Agentforce',
      blurb:'Docusign for Agentforce — generate, send, and write back from the CRM.',
      caps:['ai-agent','crm','automation'], verticals:[ALL] },
    { id:'app-center', file:'app-center.html', label:'App Center', product:'App Center',
      blurb:'The integrations marketplace — connectors and extensions.',
      caps:['marketplace','integrations'], verticals:[ALL] },
  ];

  // Distinct, sorted facet values for the filter UI.
  function facet(key){
    const s = new Set();
    POOL.forEach(v => (Array.isArray(v[key]) ? v[key] : [v[key]]).forEach(x => x && x !== ALL && s.add(x)));
    return [...s].sort();
  }

  root.VIGNETTE_POOL = POOL;
  root.VIGNETTE_POOL_FACETS = {
    products: [...new Set(POOL.map(v => v.product))].sort(),
    caps: facet('caps'),
    verticals: ['financial','insurance','healthcare','public-sector','legal','hr'],
  };
  // The verticals each vignette applies to, with '*' expanded for filtering.
  root.vignetteAppliesToVertical = function (v, vert) {
    return !vert || v.verticals.includes(ALL) || v.verticals.includes(vert);
  };
})(typeof window !== 'undefined' ? window : globalThis);
