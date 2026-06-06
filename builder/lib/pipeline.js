/* =========================================================================
   builder/lib/pipeline.js — four-stage runner for /builder
   -------------------------------------------------------------------------
   Pipeline:
     1. DECODE  — keyframe extraction. Two paths:
          A. MP4  → FFmpeg scene detection (gt(scene,T), vsync vfr)
          B. Figma export zip → unzip PNGs
          C. Figma REST API  → pull FRAME nodes, download PNGs
     2. TRIAGE  — passthrough. Scene detection already triages; all
                  extracted frames move to keep/. Kept for API compat.
     3. CLASSIFY → ANALYZE: Claude vision loop. Each frame sent with its
                  predecessor so the model can infer motion direction/intent.
                  Output: descriptions.json (ordered array of frame descriptions).
     4. EXTRACT  — build structure/content/theme from descriptions. Thin wrapper.
     5. RENDER  → GENERATE: Claude HTML generation from ordered descriptions.
                  Output: build/index.html — self-contained, templated vignette.

   Each stage is independently re-runnable via runStage(jobId, stageName).
   Stages read inputs from job storage, write outputs to job storage,
   and update job-meta.json. Idempotent given the same inputs.
   ========================================================================= */

'use strict';
const { runMatch }     = require('./stages/match');
const { runAssemble }  = require('./stages/assemble');

const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const { spawn } = require('child_process');

const jobStore = require('./job-store');
const { loadPrompt, ACTIVE_VERSION } = require('./prompts');
const { modelInvoke } = require('./model-invoke');

// --------------------------------------------------------------------------
// FFmpeg / ffprobe helpers
// --------------------------------------------------------------------------
function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('error', e => reject(e));
    p.on('close', code => {
      if (code === 0) resolve({ stdout: out, stderr: err });
      else reject(new Error(`ffmpeg exited ${code}: ${err.slice(-600)}`));
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

function ffprobeDuration(filePath) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', filePath
    ]);
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
// Figma helpers
// --------------------------------------------------------------------------

/** Extract PNGs from a Figma export zip. */
function extractFigmaZip(zipPath, outDir) {
  // Node stdlib has no zip support; shell out to unzip.
  return new Promise((resolve, reject) => {
    fs.mkdirSync(outDir, { recursive: true });
    const p = spawn('unzip', ['-j', zipPath, '*.png', '-d', outDir]);
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('error', e => reject(new Error(`unzip failed: ${e.message}`)));
    p.on('close', code => {
      if (code === 0 || code === 1) { // exit 1 = no errors, just warnings
        const files = fs.readdirSync(outDir)
          .filter(f => /\.png$/i.test(f))
          .sort()
          .map(f => path.join(outDir, f));
        resolve(files);
      } else {
        reject(new Error(`unzip exited ${code}: ${err.slice(-200)}`));
      }
    });
  });
}

/** Download a URL to a local file. Returns a Promise. */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

/** Pull FRAME nodes from Figma REST API and download as PNGs. */
async function extractFigmaApi(figmaKey, figmaToken, outDir) {
  fs.mkdirSync(outDir, { recursive: true });

  // 1) Get file tree, collect top-level FRAME ids.
  const treeUrl = `https://api.figma.com/v1/files/${figmaKey}`;
  const treeData = await new Promise((resolve, reject) => {
    https.get(treeUrl, { headers: { 'X-Figma-Token': figmaToken } }, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Figma API returned non-JSON')); }
      });
    }).on('error', reject);
  });

  const pages = (treeData.document && treeData.document.children) || [];
  const firstPage = pages[0] || {};
  const nodeIds = (firstPage.children || [])
    .filter(c => c.type === 'FRAME')
    .map(c => c.id);

  if (nodeIds.length === 0) throw new Error('No FRAME nodes found in Figma file');

  // 2) Request rendered PNGs (scale=2 for retina).
  const imgsUrl = `https://api.figma.com/v1/images/${figmaKey}?ids=${encodeURIComponent(nodeIds.join(','))}&format=png&scale=2`;
  const imgsData = await new Promise((resolve, reject) => {
    https.get(imgsUrl, { headers: { 'X-Figma-Token': figmaToken } }, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Figma images API returned non-JSON')); }
      });
    }).on('error', reject);
  });

  const images = imgsData.images || {};
  const paths = [];
  let i = 0;
  for (const [, url] of Object.entries(images)) {
    const destPath = path.join(outDir, `artboard_${String(i).padStart(4, '0')}.png`);
    await downloadFile(url, destPath);
    paths.push(destPath);
    i++;
  }
  return paths;
}

// --------------------------------------------------------------------------
// STAGE 1 — DECODE
// --------------------------------------------------------------------------
async function runDecode(jobId) {
  jobStore.updateStage(jobId, 'decode', {
    status: 'running',
    started_at: new Date().toISOString(),
    prompt_version: ACTIVE_VERSION()
  });

  const meta      = jobStore.readMeta(jobId);
  const dir       = jobStore.jobDir(jobId);
  const framesDir = path.join(dir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });

  const inputMode      = meta.inputs.input_mode || 'mp4';  // 'mp4' | 'figma-zip' | 'figma-api'
  const sceneThreshold = meta.inputs.scene_threshold || 0.4;

  // ---- Path A: MP4 scene detection ----------------------------------------
  if (inputMode === 'mp4') {
    const inputPath = path.join(dir, 'raw', 'upload.mp4');
    if (!fs.existsSync(inputPath)) {
      return failStage(jobId, 'decode', 'malformed_input', 'No upload.mp4 in job/raw');
    }
    const stat = fs.statSync(inputPath);
    if (stat.size > 2 * 1024 * 1024 * 1024) {
      return failStage(jobId, 'decode', 'quota_exceeded', 'mp4 > 2GB');
    }

    let sourceDuration = 0;
    try { sourceDuration = await ffprobeDuration(inputPath); }
    catch (e) {
      return failStage(jobId, 'decode', 'malformed_input', `ffprobe failed: ${e.message}`);
    }
    if (sourceDuration > 600) {
      return failStage(jobId, 'decode', 'quota_exceeded', `mp4 duration ${sourceDuration}s > 600s`);
    }

    // Scene detection: extract only frames where composition meaningfully changes.
    // -vsync vfr avoids duplicate frames. showinfo prints timestamps to stderr.
    try {
      await ffmpeg([
        '-y', '-i', inputPath,
        '-vf', `select='gt(scene,${sceneThreshold})',showinfo`,
        '-vsync', 'vfr',
        '-q:v', '2',
        path.join(framesDir, 'keyframe_%04d.jpg')
      ]);
    } catch (e) {
      return failStage(jobId, 'decode', 'cannot_proceed', String(e.message || e));
    }

    const frameCount = jobStore.listFrames(jobId, 'frames').length;
    jobStore.writeBlob(jobId, 'decode-result.json', {
      status: 'ok', input_mode: 'mp4', frame_count: frameCount,
      source_duration_s: sourceDuration, scene_threshold: sceneThreshold
    });
    jobStore.updateStage(jobId, 'decode', { status: 'completed', completed_at: new Date().toISOString() });
    return { ok: true, input_mode: 'mp4', frame_count: frameCount, source_duration_s: sourceDuration };
  }

  // ---- Path B: Figma export zip ------------------------------------------
  if (inputMode === 'figma-zip') {
    const zipPath = path.join(dir, 'raw', 'upload.zip');
    if (!fs.existsSync(zipPath)) {
      return failStage(jobId, 'decode', 'malformed_input', 'No upload.zip in job/raw');
    }
    let extractedPaths;
    try { extractedPaths = await extractFigmaZip(zipPath, framesDir); }
    catch (e) {
      return failStage(jobId, 'decode', 'cannot_proceed', `Figma zip extraction failed: ${e.message}`);
    }
    const frameCount = extractedPaths.length;
    jobStore.writeBlob(jobId, 'decode-result.json', {
      status: 'ok', input_mode: 'figma-zip', frame_count: frameCount
    });
    jobStore.updateStage(jobId, 'decode', { status: 'completed', completed_at: new Date().toISOString() });
    return { ok: true, input_mode: 'figma-zip', frame_count: frameCount };
  }

  // ---- Path C: Figma REST API --------------------------------------------
  if (inputMode === 'figma-api') {
    const figmaKey   = meta.inputs.figma_key   || '';
    const figmaToken = meta.inputs.figma_token || '';
    if (!figmaKey || !figmaToken) {
      return failStage(jobId, 'decode', 'malformed_input', 'figma_key and figma_token are required for figma-api mode');
    }
    let extractedPaths;
    try { extractedPaths = await extractFigmaApi(figmaKey, figmaToken, framesDir); }
    catch (e) {
      return failStage(jobId, 'decode', 'cannot_proceed', `Figma API extraction failed: ${e.message}`);
    }
    const frameCount = extractedPaths.length;
    jobStore.writeBlob(jobId, 'decode-result.json', {
      status: 'ok', input_mode: 'figma-api', frame_count: frameCount
    });
    jobStore.updateStage(jobId, 'decode', { status: 'completed', completed_at: new Date().toISOString() });
    return { ok: true, input_mode: 'figma-api', frame_count: frameCount };
  }

  return failStage(jobId, 'decode', 'malformed_input', `Unknown input_mode: ${inputMode}`);
}

// --------------------------------------------------------------------------
// STAGE 2 — TRIAGE (passthrough)
// Scene detection already selects only meaningful keyframes. This stage
// simply copies all frames to keep/ so the API contract is unchanged.
// --------------------------------------------------------------------------
async function runTriage(jobId) {
  jobStore.updateStage(jobId, 'triage', {
    status: 'running', started_at: new Date().toISOString(), prompt_version: ACTIVE_VERSION()
  });

  const dir    = jobStore.jobDir(jobId);
  const frames = jobStore.listFrames(jobId, 'frames');
  if (frames.length === 0) {
    return failStage(jobId, 'triage', 'cannot_proceed', 'no frames from decode stage');
  }

  const keepDir = path.join(dir, 'keep');
  fs.mkdirSync(keepDir, { recursive: true });
  for (const f of frames) {
    const src = path.join(dir, 'frames', f);
    const dst = path.join(dir, 'keep', f);
    if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
  }

  const passthru = {
    status: 'ok', drop_ratio: 0, _passthrough: true,
    frames: frames.map(f => ({ frame: f, verdict: 'KEEP', reason: 'scene_detected' }))
  };
  jobStore.writeBlob(jobId, 'triage.json', passthru);
  jobStore.updateStage(jobId, 'triage', { status: 'completed', completed_at: new Date().toISOString() });
  return { ok: true, drop_ratio: 0, kept: frames.length };
}

// --------------------------------------------------------------------------
// STAGE 3 — CLASSIFY → ANALYZE
// Loops kept frames in order, sending each frame together with its
// predecessor so the model can infer motion direction and transition intent.
// Output: descriptions.json — ordered array of { frame, description }.
// --------------------------------------------------------------------------
async function runClassify(jobId) {
  jobStore.updateStage(jobId, 'classify', {
    status: 'running', started_at: new Date().toISOString(), prompt_version: ACTIVE_VERSION()
  });

  const meta   = jobStore.readMeta(jobId);
  const dir    = jobStore.jobDir(jobId);
  const frames = jobStore.listFrames(jobId, 'keep');

  if (frames.length === 0) {
    return failStage(jobId, 'classify', 'cannot_proceed', 'no frames in keep/');
  }
  if (frames.length > 200) {
    return failStage(jobId, 'classify', 'quota_exceeded', `${frames.length} frames > 200 ceiling — lower the scene threshold or trim the video`);
  }

  // Determine analysis mode from input_mode (video vs figma artboards)
  const inputMode   = meta.inputs.input_mode || 'mp4';
  const visionMode  = (inputMode === 'mp4') ? 'video' : 'figma';

  let system;
  try { system = loadPrompt('analyze'); }
  catch (e) { system = ''; }  // graceful if prompt file missing

  const descriptions  = [];
  let   totalTokens   = 0;
  let   totalCalls    = 0;

  for (let i = 0; i < frames.length; i++) {
    const currPath = path.join(dir, 'keep', frames[i]);
    const images   = [];

    if (i > 0) {
      images.push({ path: path.join(dir, 'keep', frames[i - 1]) });
    }
    images.push({ path: currPath });

    const userPrompt = buildAnalyzePrompt(i, frames[i], inputMode, meta);

    const r = await modelInvoke({
      stage:  'analyze',
      system,
      user:   userPrompt,
      images,
      model:  'volume'
    });

    descriptions.push({ frame: i, filename: frames[i], description: r.text });
    totalTokens += r.tokens || 0;
    totalCalls++;
  }

  jobStore.writeBlob(jobId, 'descriptions.json', { mode: visionMode, descriptions });
  // Stub-compatible: also write segments.json so extract/render see expected blobs.
  jobStore.writeBlob(jobId, 'segments.json', descriptions.map((d, i) => ({
    id: `scene_${i + 1}`,
    frame: d.frame,
    description: d.description
  })));

  jobStore.updateStage(jobId, 'classify', {
    status: 'completed', completed_at: new Date().toISOString(),
    model_calls: totalCalls, model_tokens: totalTokens
  });
  return { ok: true, frame_count: frames.length, mode: visionMode };
}

function buildAnalyzePrompt(idx, filename, inputMode, meta) {
  const hasPrev = idx > 0;
  const modeHint = (inputMode === 'mp4')
    ? 'This is a video frame from a product demo screen recording.'
    : 'This is an artboard from a Figma design storyboard.';
  const prevHint = hasPrev
    ? 'The PREVIOUS frame is included before the CURRENT frame so you can describe what changed and how it moved.'
    : 'This is the first frame — no previous frame.';
  return [
    modeHint,
    prevHint,
    `Frame index: ${idx}. File: ${filename}.`,
    `Vertical: ${meta.inputs.vertical || 'unknown'}. Vendor: ${meta.inputs.vendor || 'unknown'}.`
  ].join(' ');
}

// --------------------------------------------------------------------------
// STAGE 4 — EXTRACT (thin wrapper: read descriptions, write structure/content/theme)
// --------------------------------------------------------------------------
async function runExtract(jobId) {
  jobStore.updateStage(jobId, 'extract', {
    status: 'running', started_at: new Date().toISOString(), prompt_version: ACTIVE_VERSION()
  });

  const meta        = jobStore.readMeta(jobId);
  const dir         = jobStore.jobDir(jobId);
  const descBlob    = jobStore.readBlob(jobId, 'descriptions.json');

  if (!descBlob || !descBlob.descriptions) {
    return failStage(jobId, 'extract', 'cannot_proceed', 'no descriptions.json — run classify stage first');
  }

  let system;
  try { system = loadPrompt('extract'); }
  catch (e) { system = ''; }

  const sequence = descBlob.descriptions
    .map(d => `FRAME ${d.frame}:\n${d.description}`)
    .join('\n\n');

  const keepFrames = jobStore.listFrames(jobId, 'keep');
  const sampleImages = keepFrames.slice(0, 6).map(f => ({ path: path.join(dir, 'keep', f) }));

  const r = await modelInvoke({
    stage:  'extract',
    system,
    user:   `Vendor: ${meta.inputs.vendor}. Vertical: ${meta.inputs.vertical}.\n\n` +
            `FRAME DESCRIPTIONS:\n${sequence}`,
    images: sampleImages,
    model:  'reasoning'
  });

  let parsed;
  try {
    const raw = extractJson(r.text);
    parsed = JSON.parse(raw);
  } catch (e) {
    // Fall back: write descriptions as structure directly
    parsed = {
      structure: { scenes: descBlob.descriptions.map((d, i) => ({ id: `s${i + 1}`, description: d.description })) },
      content: { language: '{{LANGUAGE}}', org_name: '{{VENDOR_NAME}}' },
      theme: { primary: '{{PRIMARY_COLOR}}', secondary: '{{SECONDARY_COLOR}}' }
    };
  }

  if (parsed.structure) jobStore.writeBlob(jobId, 'structure.json', parsed.structure);
  if (parsed.content)   jobStore.writeBlob(jobId, 'content.json', parsed.content);
  if (parsed.theme)     jobStore.writeBlob(jobId, 'theme.json', parsed.theme);

  jobStore.updateStage(jobId, 'extract', {
    status: 'completed', completed_at: new Date().toISOString(),
    model_calls: 1, model_tokens: r.tokens
  });
  return { ok: true };
}

// --------------------------------------------------------------------------
// STAGE 5 — RENDER → GENERATE
// Feeds ordered frame descriptions to Claude with HTML_GEN_PROMPT.
// Outputs a self-contained, brandable vignette.html to build/index.html.
// --------------------------------------------------------------------------
async function runRender(jobId) {
  jobStore.updateStage(jobId, 'render', {
    status: 'running', started_at: new Date().toISOString(), prompt_version: ACTIVE_VERSION()
  });

  const meta     = jobStore.readMeta(jobId);
  const dir      = jobStore.jobDir(jobId);
  const descBlob = jobStore.readBlob(jobId, 'descriptions.json');

  if (!descBlob || !descBlob.descriptions) {
    return failStage(jobId, 'render', 'cannot_proceed', 'no descriptions.json — run classify+extract first');
  }

  let system;
  try { system = loadPrompt('render'); }
  catch (e) { system = ''; }

  const sequence = descBlob.descriptions
    .map(d => `FRAME ${d.frame}:\n${d.description}`)
    .join('\n\n');

  const r = await modelInvoke({
    stage:  'render',
    system,
    user:   `Vendor: ${meta.inputs.vendor || '{{VENDOR_NAME}}'}. Vertical: ${meta.inputs.vertical}.\n\n` +
            `SEQUENCE OF STATES:\n${sequence}`,
    images: [],
    model:  'reasoning'
  });

  const html = stripCodeFences(r.text);
  fs.mkdirSync(path.join(dir, 'build'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'build', 'index.html'), html);

  // Persist output to builder/outputs/ so it survives container restarts.
  const outputsDir = path.join(__dirname, '..', 'outputs');
  fs.mkdirSync(outputsDir, { recursive: true });
  const vendor  = (meta.inputs && meta.inputs.vendor)   ? meta.inputs.vendor.replace(/[^a-zA-Z0-9_-]/g, '_')   : 'unknown';
  const vertical = (meta.inputs && meta.inputs.vertical) ? meta.inputs.vertical.replace(/[^a-zA-Z0-9_-]/g, '_') : 'unknown';
  const ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
  const outputFile = `${ts}_${vendor}_${vertical}_${jobId.slice(0, 8)}.html`;
  fs.writeFileSync(path.join(outputsDir, outputFile), html);

  jobStore.updateStage(jobId, 'render', {
    status: 'completed', completed_at: new Date().toISOString(),
    model_calls: 1, model_tokens: r.tokens,
    output_file: outputFile
  });
  jobStore.updateOverall(jobId, 'completed');
  return { ok: true, html_path: `/api/builder/jobs/${jobId}/artifact/build/index.html`, output_file: outputFile };
}

// --------------------------------------------------------------------------
// VERTICALIZATION — RENDER-only re-run with edited content/theme
// --------------------------------------------------------------------------
async function runVerticalize(jobId, editedContent, editedTheme) {
  if (editedContent) jobStore.writeBlob(jobId, 'content.json', editedContent);
  if (editedTheme)   jobStore.writeBlob(jobId, 'theme.json', editedTheme);
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
  decode:   runDecode,
  triage:   runTriage,
  classify: runClassify,
  extract:  runExtract,
  render:   runRender,
  match:    (jobId) => runMatch(jobId, require('./job-store')),
  assemble: (jobId) => runAssemble(jobId, require('./job-store'))
};

async function runStage(jobId, stage) {
  const fn = STAGE_RUNNERS[stage];
  if (!fn) throw new Error(`Unknown stage: ${stage}`);
  return fn(jobId);
}

module.exports = {
  runStage, runDecode, runTriage, runClassify, runExtract, runRender,
  runMatch, runAssemble, runVerticalize, ffmpegAvailable
};
