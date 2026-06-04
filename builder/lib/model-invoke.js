/* =========================================================================
   builder/lib/model-invoke.js — Anthropic Claude client wrapper
   -------------------------------------------------------------------------
   Single integration surface for every stage that needs an LLM call.
   Stages call modelInvoke({ stage, system, user, images, model }) and get
   { text, raw, tokens, latency_ms } back.

   ENV VARS
     ANTHROPIC_API_KEY         — required for real calls; absent = fake mode
     CLAUDE_MODEL_REASONING    — default "claude-sonnet-4-5" (analyze/generate)
     CLAUDE_MODEL_VOLUME       — default "claude-haiku-4-5"  (triage/fast passes)
     BUILDER_PROMPT_VERSION    — default "v1" (folder under builder/prompts/)

   FAKE MODE
     When ANTHROPIC_API_KEY is absent, every stage gets a deterministic stub
     so the full pipeline (file I/O, job storage, routes, UI) can be exercised
     without a key. Shapes mirror the real outputs so downstream stages work.

   USAGE
     const { modelInvoke } = require('./builder/lib/model-invoke');
     const { text, tokens } = await modelInvoke({
       stage: 'analyze',
       system: loadPrompt('analyze'),
       user: 'Describe what changed between these frames.',
       images: [{ path: '/path/to/prev.jpg' }, { path: '/path/to/curr.jpg' }],
       model: 'reasoning'
     });
   ========================================================================= */

const fs   = require('fs');
const path = require('path');

// ---- Lazy-load SDK so the server stays up pre-install --------------------
let _anthropic     = null;
let _anthropicErr  = null;
try { _anthropic = require('@anthropic-ai/sdk'); }
catch (e) { _anthropicErr = e; }

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL_REASONING   = process.env.CLAUDE_MODEL_REASONING || 'claude-sonnet-4-5';
const MODEL_VOLUME      = process.env.CLAUDE_MODEL_VOLUME    || 'claude-haiku-4-5';

// ---- Fake mode -----------------------------------------------------------
// Lets the team click through the UI before an API key is set.
// Each stage gets a deterministic stub whose shape mirrors real validator output.
const FAKE_RESPONSES = {
  triage: () => ({
    text: JSON.stringify({
      _fake: true,
      frames: [],      // pipeline fills this via on-disk frame walk
      drop_ratio: 0,
      kept_runtime_s: null,
      status: 'ok'
    })
  }),
  'classify-replay': () => ({
    text: JSON.stringify({
      _fake: true,
      segments: [
        { id: 'scene_1', t_start_ms: 0, t_end_ms: 8000, frame_range: [0, 8],
          dominant_motion: 'text appearing in field', technique: 1,
          contains_vendor_specific: true }
      ],
      timeline: [
        { op: 'cursor_move', to_xy: [400, 200], duration_ms: 800 },
        { op: 'click', target: 'placeholder_field' },
        { op: 'type_paste', target: 'placeholder_field', text: '@@placeholder_field.value@@' },
        { op: 'wait', duration_ms: 1200 }
      ]
    })
  }),
  'classify-synthesize': () => ({
    text: JSON.stringify({
      _fake: true,
      segments: [
        { id: 'scene_1', t_start_ms: 0, t_end_ms: 8000, frame_range: [0, 8],
          synopsis: 'User opens an agreement form and begins filling in fields.',
          technique: 2, background_required: false }
      ],
      timeline: [
        { op: 'appear', element: 'agreement_form', easing: 'ease-out', duration_ms: 400 },
        { op: 'type', element: 'placeholder_field', text: '@@placeholder_field.value@@', duration_ms: 1200 }
      ],
      background: {},
      content: {}
    })
  }),
  analyze: (i) => ({
    text: `FRAME ${i}:\nUI shows a form with input fields. The primary action button is highlighted in blue. ` +
          (i > 0 ? 'CHANGE FROM PREVIOUS: A modal dialog slid in from the right edge covering the center pane.' : '')
  }),
  extract: () => ({
    text: JSON.stringify({
      _fake: true,
      structure: { scenes: [{ id: 's1', role: 'form-fill', duration_ms: 4000 }] },
      content: {
        org_name: '{{VENDOR_NAME}}',
        doc_type: 'Agreement',
        language: '{{LANGUAGE}}'
      },
      theme: {
        primary: '{{PRIMARY_COLOR}}',
        secondary: '{{SECONDARY_COLOR}}'
      }
    })
  }),
  render: () => ({
    text: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{{VENDOR_NAME}} Demo</title>
<style>
  /* TEMPLATE VARIABLES
     --customer-logo    : {{CUSTOMER_LOGO}}
     --language         : {{LANGUAGE}}
     --vendor-name      : {{VENDOR_NAME}}
     --primary-color    : {{PRIMARY_COLOR}}
     --secondary-color  : {{SECONDARY_COLOR}}
  */
  :root {
    --primary:   {{PRIMARY_COLOR}};
    --secondary: {{SECONDARY_COLOR}};
  }
  body { font-family: sans-serif; background: #f9f9f9; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
  .card { background:#fff; border-radius:12px; padding:40px; box-shadow:0 4px 20px rgba(0,0,0,.1); max-width:500px; text-align:center; }
  h1 { color: var(--primary); }
  p  { color: #666; margin-top:12px; }
  .badge { display:inline-block; background:var(--secondary); color:#fff; border-radius:99px; padding:4px 14px; font-size:12px; margin-top:16px; }
</style>
</head>
<body>
  <div class="card">
    <img src="{{CUSTOMER_LOGO}}" alt="{{VENDOR_NAME}}" style="height:48px;margin-bottom:16px;">
    <h1>{{VENDOR_NAME}}</h1>
    <p>{{LANGUAGE}}</p>
    <span class="badge">Demo vignette · fake mode</span>
  </div>
</body>
</html>`
  })
};

// ---- Helpers ---------------------------------------------------------------
function b64(filePath) {
  return fs.readFileSync(filePath).toString('base64');
}

function mimeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp' })[ext] || 'image/jpeg';
}

// Build Anthropic-shaped image content blocks from { path } descriptors.
function buildImageBlocks(images) {
  return (images || []).map(img => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: mimeForPath(img.path),
      data: b64(img.path)
    }
  }));
}

// ---- Main export -----------------------------------------------------------
async function modelInvoke({ stage, system, user, images, model }) {
  const modelName = (model === 'volume') ? MODEL_VOLUME : MODEL_REASONING;
  const start = Date.now();

  // ---- Fake mode ---------------------------------------------------------
  if (!ANTHROPIC_API_KEY || !_anthropic) {
    const fakeFn = FAKE_RESPONSES[stage] || FAKE_RESPONSES['analyze'];
    const frameIdx = (images || []).length > 1 ? 1 : 0;  // for analyze stage
    const stub = fakeFn(frameIdx);
    return {
      text:       stub.text,
      raw:        null,
      tokens:     0,
      latency_ms: 50,
      fake:       true,
      missing_key: !ANTHROPIC_API_KEY,
      missing_sdk: !_anthropic
    };
  }

  // ---- Real Claude call --------------------------------------------------
  const client = new _anthropic.Anthropic({ apiKey: ANTHROPIC_API_KEY });

  // Build user message: interleave image blocks then text
  const userContent = [];
  for (const img of (images || [])) {
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: mimeForPath(img.path), data: b64(img.path) }
    });
  }
  userContent.push({ type: 'text', text: user });

  const response = await client.messages.create({
    model: modelName,
    max_tokens: stage === 'render' ? 8192 : 2048,
    system: system || undefined,
    messages: [{ role: 'user', content: userContent }]
  });

  const text   = response.content.map(b => b.type === 'text' ? b.text : '').join('');
  const tokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  return { text, raw: response, tokens, latency_ms: Date.now() - start, fake: false };
}

// Health check — called by the studio sidebar to surface config status.
async function modelHealth() {
  return {
    provider:    'anthropic',
    has_key:     !!ANTHROPIC_API_KEY,
    has_sdk:     !!_anthropic,
    sdk_error:   _anthropicErr ? _anthropicErr.message : null,
    fake_mode:   !ANTHROPIC_API_KEY || !_anthropic,
    models:      { reasoning: MODEL_REASONING, volume: MODEL_VOLUME }
  };
}

const config = {
  provider: 'anthropic',
  model_reasoning: MODEL_REASONING,
  model_volume: MODEL_VOLUME,
  fake_mode: !ANTHROPIC_API_KEY || !_anthropic
};

module.exports = { modelInvoke, modelHealth, config };
