'use strict';
/* =========================================================================
   builder/lib/demo-catalog.js — single source of truth for the Studio
   pipeline's match + assemble stages.
   -------------------------------------------------------------------------
   The new re-skinnable demo library lives at /demos/<id>.html and rides the
   shared engine (demos/engine/demo-engine.js). Each demo re-skins per vertical
   via ?pack=<key> and per-tenant via URL overrides the engine reads:
       ?embed=1&loop=1&pack=<banking|healthcare|pubsec>
       &brand=<Tenant>&lw=<logoWord>&sub=<logoSub>&mark=<letter>&accent=<#hex>

   match.js picks demo ids from CATALOG (by model, or by keyword in fake mode).
   assemble.js turns each picked id into an embedded iframe using EMBED_BASE().

   Keep ids stable: they are written into match.json. Old ids from the previous
   story-templates library are aliased in LEGACY_ALIAS so historical jobs still
   render.
   ========================================================================= */

// id → { file, label, keywords }   (label is the nav text — NO emoji, per brand)
const CATALOG = {
  'web-forms':        { file: 'web-forms.html',        label: 'Web Forms',         keywords: ['form','webform','intake','field','input','submit','application','data entry','prefill','onboarding form'] },
  'esignature':       { file: 'esignature.html',       label: 'eSignature',        keywords: ['signature','sign','e-sign','signing','initial','sign here','envelope','sign ceremony','docusign signing'] },
  'idv-clear':        { file: 'idv-clear.html',        label: 'Identity · CLEAR',  keywords: ['identity','verify','idv','clear','id check','verification','kyc','identity proofing'] },
  'idv-idme':         { file: 'idv-idme.html',         label: 'Identity · ID.me',  keywords: ['id.me','idme','identity','verify','government id'] },
  'idv-apple-wallet': { file: 'idv-apple-wallet.html', label: 'Identity · Wallet', keywords: ['apple wallet','mobile id','digital id','wallet','tap to verify'] },
  'idv-idverse':      { file: 'idv-idverse.html',      label: 'Identity · Scan',   keywords: ['idverse','document scan','liveness','selfie','biometric','passport scan','face match'] },
  'idv-risk':         { file: 'idv-risk.html',         label: 'Risk-Based IDV',    keywords: ['risk','risk-based','adaptive','step-up','authentication','fraud signal'] },
  'navigator':        { file: 'navigator.html',        label: 'Navigator',         keywords: ['repository','agreements','library','navigator','contract','filter','document list','insights','metadata'] },
  'search':           { file: 'search.html',           label: 'AI Search',         keywords: ['search','query','find','semantic search','ask','lookup'] },
  'workspaces':       { file: 'workspaces.html',       label: 'Workspaces',        keywords: ['workspace','collaboration','shared','deal room','participants','tasks','checklist','progress','portal','home','dashboard'] },
  'maestro':          { file: 'maestro.html',          label: 'Maestro',           keywords: ['workflow','orchestration','maestro','steps','automation','no-code','routing','flow builder'] },
  'agreement-desk':   { file: 'agreement-desk.html',   label: 'Agreement Desk',    keywords: ['agreement desk','queue','pending','approvals','desk','chain of custody'] },
  'agreement-manager':{ file: 'agreement-manager.html',label: 'Agreement Mgr',     keywords: ['manage agreements','obligations','renewals','lifecycle','manager'] },
  'monitor':          { file: 'monitor.html',          label: 'Monitor',           keywords: ['monitor','compliance','alerts','risk monitoring','anomaly','audit'] },
  'data-verification':{ file: 'data-verification.html',label: 'Data Verification', keywords: ['data verification','verify','third-party','income','employment','identity check','kyc data','eligibility check'] },
  'app-center':       { file: 'app-center.html',       label: 'App Center',        keywords: ['app center','marketplace','integrations','apps','extensions','connectors'] },
  'ai-review':        { file: 'ai-review.html',        label: 'AI Review',         keywords: ['review','redline','clause','ai review','contract analysis','risk flag','obligations review'] },
  'agentforce':       { file: 'agentforce.html',       label: 'Agentforce',        keywords: ['agentforce','agent','salesforce','ai agent','copilot','assistant'] },
  'clm':              { file: 'clm.html',              label: 'CLM',               keywords: ['contract lifecycle','clm','authoring','negotiation','redlining'] },
};

// Previous story-templates ids → new catalog ids (back-compat for old match.json)
const LEGACY_ALIAS = {
  'signing-ceremony': 'esignature',
  'webform-intake':   'web-forms',
  'navigator':        'navigator',
  'portal-shell':     'workspaces',
  'workspace':        'workspaces',
};

// match.js vertical → engine pack key. Engine packs are banking/healthcare/pubsec;
// it safely falls back to a demo's default pack if the key is absent.
const VERTICAL_PACK = {
  financial:  'banking',
  insurance:  'banking',
  legal:      'banking',
  hr:         'banking',
  realestate: 'banking',
  healthcare: 'healthcare',
  government: 'pubsec',
  other:      'banking',
};

function packForVertical(v) {
  return VERTICAL_PACK[v] || 'banking';
}

function resolveId(id) {
  if (CATALOG[id]) return id;
  if (LEGACY_ALIAS[id] && CATALOG[LEGACY_ALIAS[id]]) return LEGACY_ALIAS[id];
  return null;
}

/**
 * Build the absolute, engine-ready embed URL for one demo.
 * Demos are served from the site root at /demos/<file>.
 * @param {string} id    catalog id (or legacy id)
 * @param {object} brand { tenantName, primaryColor, vertical, logoWord, logoSub, mark }
 */
function embedUrl(id, brand = {}) {
  const rid = resolveId(id);
  if (!rid) return null;
  const file = CATALOG[rid].file;
  const q = new URLSearchParams();
  q.set('embed', '1');
  q.set('loop', '1');
  q.set('pack', packForVertical(brand.vertical));
  if (brand.tenantName)   { q.set('brand', brand.tenantName); }
  if (brand.logoWord)     { q.set('lw', brand.logoWord); }
  if (brand.logoSub != null) { q.set('sub', brand.logoSub); }
  if (brand.mark)         { q.set('mark', brand.mark); }
  if (brand.primaryColor) { q.set('accent', brand.primaryColor); }
  return `/demos/${file}?${q.toString()}`;
}

// Keyword-scan fallback used by match.js when no model key is available.
// Returns an ordered, de-duped list of catalog ids found in the text.
function matchByKeywords(text) {
  const hay = String(text || '').toLowerCase();
  const hits = [];
  for (const [id, def] of Object.entries(CATALOG)) {
    const score = def.keywords.reduce((n, kw) => n + (hay.includes(kw) ? 1 : 0), 0);
    if (score > 0) hits.push({ id, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.map(h => h.id);
}

module.exports = {
  CATALOG, LEGACY_ALIAS, VERTICAL_PACK,
  packForVertical, resolveId, embedUrl, matchByKeywords,
};
