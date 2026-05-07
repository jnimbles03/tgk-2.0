/* =========================================================================
   builder/lib/pipeline.js — five-stage runner for /builder
   -------------------------------------------------------------------------
   Each stage is independently invocable via runStage(jobId, stageName).
   Stages read inputs from job storage, write outputs to job storage,
   update job-meta.json. Idempotent given the same inputs.

   PASSOFFABLE STATE (2026-05-07 handoff):
     - Stage 1 DECODE: fully wired. Shells out to ffmpeg.
     - Stage 1.5 TRIAGE: stubbed via modelInvoke. In fake mode it copies
       all frames to keep/ and computes drop_ratio = 0.
     - Stage 2 CLASSIFY: dispatcher in code (matches spec pseudocode);
       both REPLAY and SYNTHESIZE branches call modelInvoke.
     - Stage 3 EXTRACT: stubbed via modelInvoke.
     - Stage 4 RENDER: stubbed via modelInvoke; in fake mode emits a
       minimal static index.html so the preview iframe shows something.
     - Cost ceilings + escape hatches per spec are enforced for DECODE
       only; the model-driven stages currently trust the model output.
       Add validators in the next pass.
   ========================================================================= */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const jobStore = require('./job-store');
const { loadPrompt, ACTIVE_VERSION } = require('./prompts');
const { modelInvoke } = require('./model-invoke');

// --------------------------------------------------------------------------
// FFmpeg shell-out helper. Uses spawn so we can capture stderr cleanly.
// --------------------------------------------------------------------------
function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('error', e => reject(e));
    p.on('close', code => {
      if (code === 0) resolve({ stderr: err });
      else reject(new Error(`ffmpeg exited ${code}: ${err.slice(-500)}`));
    });
  });
}

async function ffmpegAvailable() {
  return new Promise(r => {
    const p = spawn('ffmpeg', ['-version']);
    p.on('error', () => r(false));
    p.on('close', code => r(code === 0));
  });
}

// --------------------------------------------------------------------------
// STAGE 1 — DECODE
// --------------------------------------------------------------------------
async function runDecode(jobId) {
  jobStore.updateStage(jobId, 'decode', { status: 'running', started_at: new Date().toISOString(), prompt_version: ACTIVE_VERSION() });

  const meta = jobStore.readMeta(jobId);
  const dir = jobStore.jobDir(jobId);
  const inputPath = path.join(dir, 'raw', 'upload.mp4');
  const framesDir = path.join(dir, 'frames');

  if (!fs.existsSync(inputPath)) {
    return failStage(jobId, 'decode', 'malformed_input', 'No upload.mp4 in job/raw');
  }

  // Cost ceilings per spec.
  const stat = fs.statSync(inputPath);
  if (stat.size > 2 * 1024 * 1024 * 1024) {
    return failStage(jobId, 'decode', 'quota_exceeded', 'mp4 > 2GB');
  }

  // ffprobe duration — spec rejects > 600s.
  let sourceDuration = 0;
  try {
    sourceDuration = await ffprobeDuration(inputPath);
  } catch (e) {
    return failStage(jobId, 'decode', 'malformed_input', `ffprobe failed: ${e.message}`);
  }
  if (sourceDuration > 600) {
    return failStage(jobId, 'decode', 'quota_exceeded', `mp4 duration ${sourceDuration}s > 600s`);
  }

  // Extract frames.
  const fps = meta.inputs.fps || 1;
  try {
    await ffmpeg(['-y', '-i', inputPath, '-vf', `fps=${fps}`, '-q:v', '2', path.join(framesDir, 'f_%04d.jpg')]);
  } catch (e) {
    return failStage(jobId, 'decode', 'cannot_proceed', String(e.message || e));
  }

  const frameCount = jobStore.listFrames(jobId, 'frames').length;
  jobStore.writeBlob(jobId, 'decode-result.json', { status: 'ok', frame_count: frameCount, source_duration_s: sourceDuration });
  jobStore.updateStage(jobId, 'decode', { status: 'completed', completed_at: new Date().toISOString() });
  return { ok: true, frame_count: frameCount, source_duration_s: sourceDuration };
}

function ffprobeDuration(filePath) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
                                '-of', 'default=noprint_wrappers=1:nokey=1', filePath]);
    let out = '', err = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('error', e => reject(e));
    p.on('close', code => {
      if (code === 0) resolve(parseFloat(out.trim()) || 0);
      else reject(new Error(err.slice(-200)));
    });
  });
}

// --------------------------------------------------------------------------
// STAGE 1.5 — TRIAGE
// --------------------------------------------------------------------------
async function runTriage(jobId) {
  jobStore.updateStage(jobId, 'triage', { status: 'running', started_at: new Date().toISOString(), prompt_version: ACTIVE_VERSION() });

  const meta = jobStore.readMeta(jobId);
  const dir = jobStore.jobDir(jobId);
  const frames = jobStore.listFrames(jobId, 'frames');
  if (frames.length === 0) {
    return failStage(jobId, 'triage', 'cannot_proceed', 'no_frames_to_classify');
  }
  if (frames.length > 1000) {
    return failStage(jobId, 'triage', 'quota_exceeded', 'frame_count_exceeded');
  }

  const system = loadPrompt('triage');
  const images = frames.map(f => ({ path: path.join(dir, 'frames', f) }));

  const r = await modelInvoke({
    stage: 'triage',
    system,
    user: `Classify these ${frames.length} frames. Vertical: ${meta.inputs.vertical}. Vendor: ${meta.inputs.vendor}.`,
    images,
    model: 'volume'
  });

  let parsed;
  try { parsed = JSON.parse(extractJson(r.text)); }
  catch (e) {
    return failStage(jobId, 'triage', 'validation_failed', `triage model returned non-JSON: ${e.message}`);
  }

  // Fake-mode shortcut: if model returned _fake, build a stub triage output
  // by treating every frame as KEEP. Lets the rest of the pipeline run.
  if (parsed._fake) {
    parsed = {
      frames: frames.map(f => ({ frame: f, verdict: 'KEEP', reason: 'fake_passthrough', mask_regions: [] })),
      drop_ratio: 0,
      kept_runtime_s: frames.length / (meta.inputs.fps || 1),
      status: 'ok',
      _fake: true
    };
  }

  // Copy KEEP frames to keep/ for downstream stages.
  for (const fi of parsed.frames || []) {
    if (fi.verdict === 'KEEP') {
      const src = path.join(dir, 'frames', fi.frame);
      const dst = path.join(dir, 'keep', fi.frame);
      if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
    }
  }

  jobStore.writeBlob(jobId, 'triage.json', parsed);
  jobStore.updateStage(jobId, 'triage', {
    status: 'completed', completed_at: new Date().toISOString(),
    model_calls: 1, model_tokens: r.tokens
  });

  // Warning gate per spec: pause for user review on soft/hard warnings.
  if (parsed.status === 'user_review_required') {
    const m = jobStore.readMeta(jobId);
    m.checkpoints.post_triage.gated = true;
    m.checkpoints.post_triage.warning = parsed.warning;
    m.checkpoints.post_triage.message = parsed.message;
    m.overall = 'awaiting_user';
    jobStore.writeMeta(jobId, m);
  }

  return { ok: true, drop_ratio: parsed.drop_ratio, kept: (parsed.frames || []).filter(f => f.verdict === 'KEEP').length };
}

// --------------------------------------------------------------------------
// STAGE 2 — CLASSIFY (dispatcher per spec pseudocode)
// --------------------------------------------------------------------------
async function runClassify(jobId) {
  jobStore.updateStage(jobId, 'classify', { status: 'running', started_at: new Date().toISOString(), prompt_version: ACTIVE_VERSION() });

  const meta = jobStore.readMeta(jobId);
  const triage = jobStore.readBlob(jobId, 'triage.json');
  if (!triage) return failStage(jobId, 'classify', 'cannot_proceed', 'no triage.json');

  const keptRuntime = triage.kept_runtime_s || 0;
  const userChoice = meta.inputs.classify_mode || 'auto';
  let branch = 'replay';
  if (userChoice !== 'auto') {
    branch = userChoice;  // 'replay' | 'synthesize' | 'hybrid'
  } else {
    if (keptRuntime >= 20) branch = 'replay';
    else if (keptRuntime >= 8) branch = 'replay';
    else branch = 'synthesize';
  }

  let result;
  try {
    if (branch === 'replay') result = await classifyReplay(jobId);
    else if (branch === 'synthesize') result = await classifySynthesize(jobId);
    else if (branch === 'hybrid') {
      const a = await classifyReplay(jobId);
      const b = await classifySynthesize(jobId);
      result = { branch: 'hybrid', replay: a, synthesize: b };
    }
  } catch (e) {
    return failStage(jobId, 'classify', 'cannot_proceed', String(e.message || e));
  }

  jobStore.updateStage(jobId, 'classify', { status: 'completed', completed_at: new Date().toISOString(), model_calls: 1 });
  return { ok: true, branch, ...result };
}

async function classifyReplay(jobId) {
  const meta = jobStore.readMeta(jobId);
  const dir = jobStore.jobDir(jobId);
  const keepFrames = jobStore.listFrames(jobId, 'keep');
  const r = await modelInvoke({
    stage: 'classify-replay',
    system: loadPrompt('classify-replay'),
    user: `Vendor: ${meta.inputs.vendor}. Vertical: ${meta.inputs.vertical}. Classify ${keepFrames.length} kept frames.`,
    images: keepFrames.slice(0, 30).map(f => ({ path: path.join(dir, 'keep', f) })),  // sample
    model: 'reasoning'
  });
  const parsed = JSON.parse(extractJson(r.text));
  jobStore.writeBlob(jobId, 'segments.json', parsed.segments || []);
  jobStore.writeBlob(jobId, 'timeline.json', parsed.timeline || []);
  return { branch: 'replay', segment_count: (parsed.segments || []).length };
}

async function classifySynthesize(jobId) {
  const meta = jobStore.readMeta(jobId);
  const dir = jobStore.jobDir(jobId);
  const keepFrames = jobStore.listFrames(jobId, 'keep');
  const r = await modelInvoke({
    stage: 'classify-synthesize',
    system: loadPrompt('classify-synthesize'),
    user: `Vendor: ${meta.inputs.vendor}. Vertical: ${meta.inputs.vertical}. target_runtime_s: 20. Synthesize a script.`,
    images: keepFrames.slice(0, 5).map(f => ({ path: path.join(dir, 'keep', f) })),
    model: 'reasoning'
  });
  const parsed = JSON.parse(extractJson(r.text));
  jobStore.writeBlob(jobId, 'segments.json', parsed.segments || []);
  jobStore.writeBlob(jobId, 'timeline.json', parsed.timeline || []);
  if (parsed.background) jobStore.writeBlob(jobId, 'background.json', parsed.background);
  if (parsed.content) jobStore.writeBlob(jobId, 'content.json', parsed.content);
  return { branch: 'synthesize', segment_count: (parsed.segments || []).length };
}

// --------------------------------------------------------------------------
// STAGE 3 — EXTRACT
// --------------------------------------------------------------------------
async function runExtract(jobId) {
  jobStore.updateStage(jobId, 'extract', { status: 'running', started_at: new Date().toISOString(), prompt_version: ACTIVE_VERSION() });

  const meta = jobStore.readMeta(jobId);
  const dir = jobStore.jobDir(jobId);
  const segments = jobStore.readBlob(jobId, 'segments.json');
  const keepFrames = jobStore.listFrames(jobId, 'keep');

  if (!segments) return failStage(jobId, 'extract', 'cannot_proceed', 'no segments.json');

  const r = await modelInvoke({
    stage: 'extract',
    system: loadPrompt('extract'),
    user: `Vendor: ${meta.inputs.vendor}. Vertical: ${meta.inputs.vertical}. Build structure/content/theme for ${segments.length} segments.`,
    images: keepFrames.slice(0, 10).map(f => ({ path: path.join(dir, 'keep', f) })),
    model: 'reasoning'
  });
  const parsed = JSON.parse(extractJson(r.text));

  if (parsed.structure) jobStore.writeBlob(jobId, 'structure.json', parsed.structure);
  if (parsed.content) {
    // Merge with any synthesize-emitted content
    const existing = jobStore.readBlob(jobId, 'content.json') || {};
    jobStore.writeBlob(jobId, 'content.json', { ...existing, ...parsed.content });
  }
  if (parsed.theme) jobStore.writeBlob(jobId, 'theme.json', parsed.theme);

  jobStore.updateStage(jobId, 'extract', { status: 'completed', completed_at: new Date().toISOString(), model_calls: 1, model_tokens: r.tokens });
  return { ok: true };
}

// --------------------------------------------------------------------------
// STAGE 4 — RENDER
// --------------------------------------------------------------------------
async function runRender(jobId) {
  jobStore.updateStage(jobId, 'render', { status: 'running', started_at: new Date().toISOString(), prompt_version: ACTIVE_VERSION() });

  const meta = jobStore.readMeta(jobId);
  const dir = jobStore.jobDir(jobId);
  const structure = jobStore.readBlob(jobId, 'structure.json');
  const content = jobStore.readBlob(jobId, 'content.json') || {};
  const theme = jobStore.readBlob(jobId, 'theme.json') || {};
  const timeline = jobStore.readBlob(jobId, 'timeline.json') || [];

  const r = await modelInvoke({
    stage: 'render',
    system: loadPrompt('render'),
    user: `Vendor: ${meta.inputs.vendor}. Vertical: ${meta.inputs.vertical}.\n\n` +
          `STRUCTURE:\n${JSON.stringify(structure)}\n\n` +
          `CONTENT:\n${JSON.stringify(content)}\n\n` +
          `THEME:\n${JSON.stringify(theme)}\n\n` +
          `TIMELINE:\n${JSON.stringify(timeline)}`,
    model: 'reasoning'
  });

  const html = stripCodeFences(r.text);
  fs.writeFileSync(path.join(dir, 'build', 'index.html'), html);

  jobStore.updateStage(jobId, 'render', { status: 'completed', completed_at: new Date().toISOString(), model_calls: 1, model_tokens: r.tokens });
  jobStore.updateOverall(jobId, 'completed');
  return { ok: true, html_path: `/api/builder/jobs/${jobId}/build/index.html` };
}

// --------------------------------------------------------------------------
// VERTICALIZATION — RENDER-only re-run with edited content/theme
// --------------------------------------------------------------------------
async function runVerticalize(jobId, editedContent, editedTheme) {
  if (editedContent) jobStore.writeBlob(jobId, 'content.json', editedContent);
  if (editedTheme) jobStore.writeBlob(jobId, 'theme.json', editedTheme);
  return runRender(jobId);
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
function failStage(jobId, stage, category, reason) {
  jobStore.updateStage(jobId, stage, {
    status: 'failed',
    completed_at: new Date().toISOString(),
    reason_category: category,
    reason
  });
  jobStore.updateOverall(jobId, 'failed');
  return { ok: false, stage, reason_category: category, reason };
}

/** Pull JSON out of fenced or unfenced model output. */
function extractJson(text) {
  if (!text) return '{}';
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  return text.trim();
}

function stripCodeFences(text) {
  if (!text) return '';
  const fence = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  return fence ? fence[1].trim() : text.trim();
}

const STAGE_RUNNERS = {
  decode: runDecode,
  triage: runTriage,
  classify: runClassify,
  extract: runExtract,
  render: runRender
};

async function runStage(jobId, stage) {
  const fn = STAGE_RUNNERS[stage];
  if (!fn) throw new Error(`Unknown stage: ${stage}`);
  return fn(jobId);
}

module.exports = {
  runStage, runDecode, runTriage, runClassify, runExtract, runRender,
  runVerticalize, ffmpegAvailable
};
