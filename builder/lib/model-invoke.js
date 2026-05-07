/* =========================================================================
   builder/lib/model-invoke.js — Gemini client wrapper for the /builder pipeline
   -------------------------------------------------------------------------
   Single integration surface for every stage that needs an LLM call.
   Stages call modelInvoke({ stage, system, user, images, model }) and get
   { text, raw, tokens, latency_ms } back.

   PASSOFFABLE STATE (2026-05-07 handoff):
     - Real Gemini integration: stubbed. The function below short-circuits to
       FAKE_RESPONSES when GEMINI_API_KEY is missing, so the rest of the pipeline
       (file I/O, job storage, server routes, UI) can be exercised end-to-end
       without a key. When the key is present, it calls @google/genai.
     - Demo engineers (Steven & Jesse) drop their key into GEMINI_API_KEY,
       npm install @google/genai, and the pipeline goes live.
     - Model names default to gemini-2.5-pro / gemini-2.5-flash but are
       overridable per env so we can swap to 3.x or whatever's current
       without touching code.

   ENV VARS
     GEMINI_API_KEY            — required for real calls; absent = fake mode
     GEMINI_MODEL_REASONING    — default "gemini-2.5-pro"  (CLASSIFY/EXTRACT/RENDER)
     GEMINI_MODEL_VOLUME       — default "gemini-2.5-flash" (TRIAGE volume frames)
     BUILDER_PROMPT_VERSION    — default "v1" (folder under builder/prompts/)

   USAGE
     const { modelInvoke } = require('./builder/lib/model-invoke');
     const { text, tokens } = await modelInvoke({
       stage: 'triage',
       system: loadPrompt('triage'),
       user: 'Classify these frames as KEEP or DROP.',
       images: [{ path: '/path/to/f_0001.jpg' }, ...],
       model: 'volume'   // 'volume' or 'reasoning'
     });
   ========================================================================= */

const fs = require('fs');
const path = require('path');

// ---- Lazy-load the SDK so the rest of the server keeps working pre-install --
let _genai = null;
let _genaiErr = null;
try { _genai = require('@google/genai'); }
catch (e) { _genaiErr = e; /* npm install @google/genai to enable */ }

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL_REASONING = process.env.GEMINI_MODEL_REASONING || 'gemini-2.5-pro';
const MODEL_VOLUME    = process.env.GEMINI_MODEL_VOLUME    || 'gemini-2.5-flash';

// ---- Fake mode -------------------------------------------------------------
// Lets the team click through the UI before integration lights up.
// Each stage gets a deterministic stub so the pipeline can ship a build
// even with no API key. The shape mirrors the real validator output.
const FAKE_RESPONSES = {
  triage: () => ({
    text: JSON.stringify({
      _fake: true,
      frames: [],   // job-store fills this in via on-disk frame walk
      drop_ratio: 0.15,
      kept_runtime_s: null,  // pipeline computes from kept frame count
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
      background: { frame: 'f_0001.jpg', role: 'primary', mask_regions: [] },
      segments: [],
      timeline: [],
      content: { 'placeholder_field.value': 'Acme Industries LLC' }
    })
  }),
  extract: () => ({
    text: JSON.stringify({
      _fake: true,
      structure: {
        scene_id: 'scene_1',
        root: { tag: 'div', data_demo_target: 'scene_root',
                attrs: { class: 'app-shell' },
                children: [{ tag: 'h1', content: '@@header.title@@' }] }
      },
      content: { 'header.title': 'Loan Application' },
      theme: { '--vendor-primary': '#002B5C', '--vendor-canvas': '#F5F7FA' }
    })
  }),
  render: () => ({
    text: '<!DOCTYPE html><html><head><title>Stub Render</title></head>' +
          '<body><div data-demo-target="scene_root">' +
          '<h1>@@header.title@@</h1>' +
          '<p style="color:var(--vendor-primary)">Fake render — wire GEMINI_API_KEY for real output.</p>' +
          '</div></body></html>'
  })
};

/**
 * Invoke a Gemini model for a pipeline stage.
 *
 * @param {Object} args
 * @param {string} args.stage       Stage key — 'triage' | 'classify-replay' | 'classify-synthesize' | 'extract' | 'render'
 * @param {string} args.system      System prompt (loaded from builder/prompts/{version}/{stage}.{version}.md)
 * @param {string} args.user        User-turn content (job-specific instructions, context)
 * @param {Array}  [args.images]    Optional [{ path: '/abs/to/jpg' }] — encoded as inline parts
 * @param {string} [args.model]     'reasoning' (default) or 'volume'
 * @param {Object} [args.opts]      Pass-through to genai.generateContent (temperature, etc.)
 * @returns {Promise<{ text: string, raw: any, tokens: number, latency_ms: number, model_used: string, fake: boolean }>}
 */
async function modelInvoke({ stage, system, user, images = [], model = 'reasoning', opts = {} }) {
  const t0 = Date.now();
  const modelName = model === 'volume' ? MODEL_VOLUME : MODEL_REASONING;

  // ---- Fake mode: short-circuit before the SDK is even consulted ----------
  if (!GEMINI_API_KEY || !_genai) {
    const stub = FAKE_RESPONSES[stage] || (() => ({ text: '{"_fake":true,"note":"no stub for stage"}' }));
    const out = stub();
    return {
      text: out.text,
      raw: { _fake: true, reason: !GEMINI_API_KEY ? 'no_api_key' : 'sdk_not_installed' },
      tokens: 0,
      latency_ms: Date.now() - t0,
      model_used: modelName + ' (fake)',
      fake: true
    };
  }

  // ---- Real Gemini call ---------------------------------------------------
  const ai = new _genai.GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Encode images as inline parts (base64 jpg/png).
  const imageParts = images.map(img => {
    const buf = fs.readFileSync(img.path);
    const ext = path.extname(img.path).slice(1).toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    return { inlineData: { mimeType: mime, data: buf.toString('base64') } };
  });

  const contents = [
    { role: 'user', parts: [
        { text: user },
        ...imageParts
      ] }
  ];

  const result = await ai.models.generateContent({
    model: modelName,
    contents,
    config: {
      systemInstruction: system,
      ...opts
    }
  });

  const text = result?.text || result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = result?.usageMetadata || {};
  const tokens = (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0);

  return {
    text,
    raw: result,
    tokens,
    latency_ms: Date.now() - t0,
    model_used: modelName,
    fake: false
  };
}

/**
 * Sanity check the model client. Useful for the studio's "system status" panel
 * and for the regression CI to detect quota/auth issues before running a job.
 */
async function modelHealth() {
  if (!_genai) {
    return { ok: false, reason: 'sdk_not_installed',
             hint: 'npm install @google/genai',
             error: _genaiErr?.message };
  }
  if (!GEMINI_API_KEY) {
    return { ok: false, reason: 'no_api_key',
             hint: 'set GEMINI_API_KEY in env (Replit Secrets / .env)',
             fake_mode: true };
  }
  try {
    const r = await modelInvoke({
      stage: '_health',
      system: 'Reply with the single word OK.',
      user: 'Health check.',
      model: 'volume'
    });
    return { ok: true, model_used: r.model_used, latency_ms: r.latency_ms, sample: r.text.slice(0, 60) };
  } catch (err) {
    return { ok: false, reason: 'call_failed', error: String(err?.message || err) };
  }
}

module.exports = {
  modelInvoke,
  modelHealth,
  config: { MODEL_REASONING, MODEL_VOLUME, BUILDER_PROMPT_VERSION: process.env.BUILDER_PROMPT_VERSION || 'v1' }
};
