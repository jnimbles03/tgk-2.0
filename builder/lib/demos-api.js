'use strict';
/* =========================================================================
   builder/lib/demos-api.js — the documented, agent-callable /demos surface.
   -------------------------------------------------------------------------
   This is a THIN FACADE over the existing builder store. It does NOT invent a
   new persistence layer: it writes the same `builder:<token>` records that
   POST /api/builder/save writes and that GET /stories/custom-<token>/ already
   renders. So a demo created via this API gets the same 30-day share URL and
   plays in the same custom-player — nothing about existing share URLs changes.

   What this module adds on top of the raw builder store:
     • A clean, stable JSON request contract (the brief's demo config shape).
     • Validation with STRUCTURED errors (never silent fallbacks).
     • A mapping from that clean config -> the internal player cfg (scenes[]).
     • Static API-key auth on the JSON endpoints (tenant data is never exposed
       without a key; the rendered HTML share URL stays public by design).
     • A self-describing OpenAPI 3.1 document.

   Implemented this session (First Tasks #1 + #2):
     POST /demos          -> { id, shareUrl, expiresAt }
     GET  /demos/{id}     -> { id, shareUrl, expiresAt, config }
     GET  /openapi.json   -> OpenAPI 3.1 contract (public)

   Planned next (documented as "not yet implemented" rather than faked):
     PATCH/DELETE /demos/{id}, GET /vignettes(/{id}),
     GET /tenants/resolve, POST /audits/run, GET /audits/latest.
   ========================================================================= */

const { CATALOG, resolveId } = require('./demo-catalog');

// ---- brief enums -> internal values -------------------------------------
// vertical -> sourceVertical string the custom-player's packFor() can re-skin.
const VERTICAL_TO_SOURCE = {
  fins:          'banking',
  hls:           'healthcare',
  pubsec:        'pubsec',
  manufacturing: 'manufacturing',
};
// story.scaffold -> builder usecase key.
const SCAFFOLD_TO_USECASE = {
  onboarding:  'default',
  maintenance: 'maintenance',
  fraud:       'fraud-fabric',
};
const MODES = ['demo', 'discovery'];

// ---- @replit/database v3 returns {ok,value}; older returned the bare value.
function unwrap(r) {
  return (r && typeof r === 'object' && 'ok' in r) ? (r.ok ? r.value : null) : r;
}

function isHexColor(s) { return typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s); }

/**
 * Validate a demo config against the public contract.
 * Returns { errors: [{ field, message }] } — empty array means valid.
 * Pure: no I/O, fully unit-testable.
 */
function validateConfig(config) {
  const errors = [];
  const err = (field, message) => errors.push({ field, message });

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { errors: [{ field: '(root)', message: 'Body must be a JSON object.' }] };
  }

  // vertical
  if (!config.vertical) err('vertical', 'Required.');
  else if (!VERTICAL_TO_SOURCE[config.vertical])
    err('vertical', `Must be one of: ${Object.keys(VERTICAL_TO_SOURCE).join(', ')}.`);

  // tenant
  const tenant = config.tenant;
  if (!tenant || typeof tenant !== 'object') {
    err('tenant', 'Required object with at least { name, colors.primary }.');
  } else {
    if (!tenant.name || typeof tenant.name !== 'string' || !tenant.name.trim())
      err('tenant.name', 'Required non-empty string.');
    const primary = tenant.colors && tenant.colors.primary;
    if (!primary)
      err('tenant.colors.primary', 'Required (auto-resolve from customerUrl arrives with /tenants/resolve).');
    else if (!isHexColor(primary))
      err('tenant.colors.primary', 'Must be a #RRGGBB hex color.');
    if (tenant.logo != null && typeof tenant.logo !== 'string')
      err('tenant.logo', 'Must be a string URL or data URL when present.');
  }

  // story
  const story = config.story;
  if (!story || typeof story !== 'object') {
    err('story', 'Required object with { scaffold, vignettes[] }.');
  } else {
    if (!story.scaffold) err('story.scaffold', 'Required.');
    else if (!SCAFFOLD_TO_USECASE[story.scaffold])
      err('story.scaffold', `Must be one of: ${Object.keys(SCAFFOLD_TO_USECASE).join(', ')}.`);

    if (!Array.isArray(story.vignettes) || story.vignettes.length === 0) {
      err('story.vignettes', 'Required non-empty array of vignette ids.');
    } else {
      story.vignettes.forEach((vid, i) => {
        if (!resolveId(vid))
          err(`story.vignettes[${i}]`, `Unknown vignette id "${vid}". See GET /vignettes for valid ids.`);
      });
    }
    if (story.narration != null && (typeof story.narration !== 'object' || Array.isArray(story.narration)))
      err('story.narration', 'Must be an object keyed by vignette id when present.');
  }

  // capabilities (optional)
  if (config.capabilities != null && (typeof config.capabilities !== 'object' || Array.isArray(config.capabilities)))
    err('capabilities', 'Must be an object of booleans when present.');

  // mode (optional, default demo). discovery is not yet a share-URL surface.
  if (config.mode != null) {
    if (!MODES.includes(config.mode)) err('mode', `Must be one of: ${MODES.join(', ')}.`);
    else if (config.mode === 'discovery')
      err('mode', 'Discovery-mode share URLs are not yet available via the API (planned). Use mode "demo".');
  }

  return { errors };
}

/**
 * Map a validated config -> the internal builder record that custom-player
 * renders. Stores BOTH the original config (for round-trip + future PATCH)
 * and the rendered cfg fields the player reads.
 * @param {object} config  a config that already passed validateConfig
 * @param {object} opts     { ttlDays }
 */
function buildRecord(config, opts = {}) {
  const ttlDays = opts.ttlDays || 30;
  const tenant = config.tenant || {};
  const narration = (config.story && config.story.narration) || {};

  const scenes = config.story.vignettes.map((vid) => {
    const rid = resolveId(vid);
    const nar = narration[vid] || {};
    return {
      template: 'demo:' + rid,                         // player: /demos/<rid>.html?embed=1
      name:     CATALOG[rid].label,
      tag:      typeof nar.tag === 'string' ? nar.tag : CATALOG[rid].label,
      headline: typeof nar.headline === 'string' ? nar.headline : '',
      lede:     typeof nar.lede === 'string' ? nar.lede : '',
      beats:    Array.isArray(nar.beats)
        ? nar.beats.map(b => ({ head: (b && b.head) || '', lede: (b && b.lede) || '' }))
        : [],
    };
  });

  const now = Date.now();
  return {
    // ---- fields custom-player + /stories/custom-<token>/ read ----
    tenant:       tenant.name,
    customer:     config.tenant.customerName ? ('× ' + config.tenant.customerName) : '',
    tenantColor:  tenant.colors.primary,
    tenantLogo:   tenant.logo || null,
    sor:          Array.isArray(tenant.systemsOfRecord) ? tenant.systemsOfRecord.join(' · ') : (tenant.systemsOfRecord || ''),
    signatureMoment: config.story.signatureMoment || '',
    usecase:      SCAFFOLD_TO_USECASE[config.story.scaffold],
    sourceVertical: VERTICAL_TO_SOURCE[config.vertical],
    preset:       'api',
    scenes,
    // ---- source-of-truth config for round-trip / PATCH / audit ----
    _api: { version: 1, config },
    _meta: { createdAt: now, expiresAt: now + ttlDays * 86400 * 1000, version: 1, source: 'demos-api' },
  };
}

/** Project a stored record back to the public response shape. */
function toPublic(record, { id, origin }) {
  const expiresAt = record && record._meta && record._meta.expiresAt
    ? new Date(record._meta.expiresAt).toISOString() : null;
  return {
    id,
    shareUrl: `${origin}/stories/custom-${id}/`,
    expiresAt,
    config: (record && record._api && record._api.config) || null,
  };
}

function originOf(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  return `${proto}://${req.get('host')}`;
}

// ---- OpenAPI 3.1 contract (only what is live this session) ---------------
function openapiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'TGK 2.0 Demo API',
      version: '0.1.0',
      description:
        'Headless, agent-callable surface for the TGK 2.0 demo portal. This first cut exposes ' +
        'demo creation and retrieval as a documented facade over the existing builder store; ' +
        'share URLs created here render in the same custom-player and last 30 days. ' +
        'Endpoints marked planned (PATCH/DELETE /demos, /vignettes, /tenants/resolve, /audits/*) ' +
        'are intentionally NOT listed here until implemented, so this document never advertises a 404.',
    },
    servers: [{ url: '/', description: 'Same-origin (Replit Express host)' }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key',
          description: 'Static API key (env TGK_API_KEY). Also accepted as Authorization: Bearer <key>.' },
      },
      schemas: {
        DemoConfig: {
          type: 'object',
          required: ['vertical', 'tenant', 'story'],
          properties: {
            vertical: { type: 'string', enum: Object.keys(VERTICAL_TO_SOURCE) },
            tenant: {
              type: 'object', required: ['name', 'colors'],
              properties: {
                name: { type: 'string' },
                customerName: { type: 'string', description: 'Optional end-customer firm (shown as "× Name").' },
                customerUrl: { type: 'string', description: 'Reserved for /tenants/resolve auto-branding.' },
                logo: { type: 'string', description: 'URL or data URL.' },
                colors: { type: 'object', required: ['primary'],
                  properties: { primary: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' } } },
                systemsOfRecord: { type: 'array', items: { type: 'string' } },
              },
            },
            story: {
              type: 'object', required: ['scaffold', 'vignettes'],
              properties: {
                scaffold: { type: 'string', enum: Object.keys(SCAFFOLD_TO_USECASE) },
                vignettes: { type: 'array', minItems: 1, items: { type: 'string' },
                  description: 'Ordered vignette ids (see demo catalog).' },
                narration: { type: 'object', additionalProperties: {
                  type: 'object',
                  properties: {
                    tag: { type: 'string' }, headline: { type: 'string' }, lede: { type: 'string' },
                    beats: { type: 'array', items: { type: 'object',
                      properties: { head: { type: 'string' }, lede: { type: 'string' } } } },
                  },
                }, description: 'Per-vignette narration, keyed by vignette id.' },
                signatureMoment: { type: 'string' },
              },
            },
            capabilities: { type: 'object', additionalProperties: { type: 'boolean' } },
            mode: { type: 'string', enum: MODES, default: 'demo' },
          },
        },
        DemoRef: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            shareUrl: { type: 'string', format: 'uri' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
        Demo: {
          allOf: [
            { $ref: '#/components/schemas/DemoRef' },
            { type: 'object', properties: { config: { $ref: '#/components/schemas/DemoConfig' } } },
          ],
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object',
              properties: { field: { type: 'string' }, message: { type: 'string' } } } },
          },
        },
      },
    },
    paths: {
      '/demos': {
        post: {
          summary: 'Create a demo and mint a 30-day share URL',
          security: [{ ApiKeyAuth: [] }],
          requestBody: { required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DemoConfig' } } } },
          responses: {
            201: { description: 'Created',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/DemoRef' } } } },
            401: { description: 'Missing/invalid API key',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            422: { description: 'Validation failed (structured errors)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            503: { description: 'API key not configured on the server',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/demos/{id}': {
        get: {
          summary: 'Fetch the full assembled demo config',
          security: [{ ApiKeyAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'OK',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Demo' } } } },
            401: { description: 'Missing/invalid API key',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            404: { description: 'Not found or expired',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/openapi.json': {
        get: { summary: 'This OpenAPI 3.1 document', responses: { 200: { description: 'OK' } } },
      },
    },
  };
}

/**
 * Register the /demos surface on an existing Express app.
 * deps: { db, keyPrefix, newToken, ttlDays, json }
 *   db        - the @replit/database instance (v3-aware via unwrap()).
 *   keyPrefix - BUILDER_KEY_PREFIX ('builder:').
 *   newToken  - newBuilderToken() function.
 *   ttlDays   - BUILDER_TTL_DAYS.
 *   json      - an express.json() middleware (sized for logo data URLs).
 */
function register(app, deps) {
  const { db, keyPrefix, newToken, ttlDays, json } = deps;

  // Static API-key gate. Fails CLOSED if TGK_API_KEY is unset (503), so tenant
  // data is never exposed by an unconfigured server.
  function requireApiKey(req, res, next) {
    const expected = process.env.TGK_API_KEY;
    if (!expected) {
      return res.status(503).json({ error: 'api_key_not_configured',
        details: [{ field: 'env.TGK_API_KEY', message: 'Set TGK_API_KEY in the server environment to enable the API.' }] });
    }
    const headerKey = req.get('x-api-key');
    const bearer = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const provided = headerKey || bearer;
    if (!provided || provided !== expected) {
      return res.status(401).json({ error: 'unauthorized',
        details: [{ field: 'X-API-Key', message: 'Missing or invalid API key.' }] });
    }
    next();
  }

  // GET /openapi.json — public contract.
  app.get('/openapi.json', (req, res) => res.json(openapiSpec()));

  // POST /demos — create + mint share URL.
  app.post('/demos', requireApiKey, json, async (req, res) => {
    try {
      const config = req.body || {};
      const { errors } = validateConfig(config);
      if (errors.length) return res.status(422).json({ error: 'validation_failed', details: errors });

      const record = buildRecord(config, { ttlDays });
      const id = newToken();
      await db.set(keyPrefix + id, record);
      const pub = toPublic(record, { id, origin: originOf(req) });
      return res.status(201).json({ id: pub.id, shareUrl: pub.shareUrl, expiresAt: pub.expiresAt });
    } catch (e) {
      console.error('[demos] create failed:', e);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  // GET /demos/{id} — full assembled config (auth: tenant data).
  // Constrain :id to the builder-token charset (letters/digits/-/_, NO dot) so
  // this route does NOT shadow the static vignette files at /demos/*.html. Those
  // stay public by design — custom-player iframes them (e.g. /demos/web-forms.html
  // ?embed=1). Without this guard, GET /demos/web-forms.html matched :id and the
  // API-key gate returned {"error":"unauthorized"} into the player's main panel.
  app.get('/demos/:id([a-zA-Z0-9_-]+)', requireApiKey, async (req, res) => {
    try {
      const record = unwrap(await db.get(keyPrefix + req.params.id));
      if (!record) return res.status(404).json({ error: 'not_found' });
      return res.json(toPublic(record, { id: req.params.id, origin: originOf(req) }));
    } catch (e) {
      console.error('[demos] fetch failed:', e);
      return res.status(500).json({ error: 'internal_error' });
    }
  });
}

module.exports = {
  register, validateConfig, buildRecord, toPublic, openapiSpec, unwrap,
  VERTICAL_TO_SOURCE, SCAFFOLD_TO_USECASE, MODES,
};
