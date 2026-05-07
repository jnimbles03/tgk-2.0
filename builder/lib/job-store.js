/* =========================================================================
   builder/lib/job-store.js — file-system persistence for /builder pipeline jobs
   -------------------------------------------------------------------------
   Each job lives at builder/jobs/{job_id}/. The store reads/writes the
   per-stage JSON outputs and the canonical job-meta.json status file.

   PASSOFFABLE STATE (2026-05-07 handoff):
     - File system only. No database, no queue. Stages run in-process; the
       UI polls GET /api/builder/jobs/:id for status.
     - Production upgrade path: BullMQ on Redis, swap out the runStage
       call site in server.js without touching this module.
   ========================================================================= */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const JOBS_ROOT = path.join(__dirname, '..', 'jobs');

const STAGES = ['decode', 'triage', 'classify', 'extract', 'render'];

function ensureJobsRoot() {
  if (!fs.existsSync(JOBS_ROOT)) fs.mkdirSync(JOBS_ROOT, { recursive: true });
}

function jobDir(jobId) {
  return path.join(JOBS_ROOT, jobId);
}

function newJobId() {
  // Time-prefixed so listings sort naturally; short hash to disambiguate.
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const hash = crypto.randomBytes(3).toString('hex');
  return `${ts}-${hash}`;
}

/**
 * Create a new job. Sets up the directory structure and writes the initial
 * job-meta.json. Returns the job ID + paths.
 */
function createJob({ vertical, vendor, fps, classifyMode, originalFilename }) {
  ensureJobsRoot();
  const jobId = newJobId();
  const dir = jobDir(jobId);
  fs.mkdirSync(path.join(dir, 'raw'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'frames'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'keep'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'reference-screens'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'build'), { recursive: true });

  const meta = {
    job_id: jobId,
    created_at: new Date().toISOString(),
    inputs: {
      vertical: vertical || 'unrecognized',
      vendor: vendor || 'unknown',
      fps: fps || 1,
      classify_mode: classifyMode || 'auto',  // 'auto' | 'replay' | 'synthesize' | 'hybrid'
      original_filename: originalFilename || null
    },
    prompt_version: process.env.BUILDER_PROMPT_VERSION || 'v1',
    stages: STAGES.reduce((acc, s) => {
      acc[s] = { status: 'pending', started_at: null, completed_at: null,
                 reason_category: null, reason: null, model_calls: 0,
                 model_tokens: 0, prompt_version: null };
      return acc;
    }, {}),
    checkpoints: {
      post_triage:   { gated: false, decision: null },
      post_classify: { gated: false, decision: null },
      post_render:   { gated: false, decision: null }
    },
    overall: 'pending'  // pending | running | awaiting_user | completed | failed
  };
  writeMeta(jobId, meta);
  return { jobId, dir, meta };
}

function listJobs() {
  ensureJobsRoot();
  const ids = fs.readdirSync(JOBS_ROOT)
    .filter(f => f !== '.gitkeep' && fs.statSync(path.join(JOBS_ROOT, f)).isDirectory())
    .sort()
    .reverse();
  return ids.map(id => {
    try { return readMeta(id); }
    catch (e) { return { job_id: id, error: 'unreadable_meta' }; }
  });
}

function readMeta(jobId) {
  const p = path.join(jobDir(jobId), 'job-meta.json');
  if (!fs.existsSync(p)) throw new Error(`No meta for job ${jobId}`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeMeta(jobId, meta) {
  const p = path.join(jobDir(jobId), 'job-meta.json');
  fs.writeFileSync(p, JSON.stringify(meta, null, 2));
}

/** Mutate one stage's status atomically. */
function updateStage(jobId, stage, patch) {
  const meta = readMeta(jobId);
  meta.stages[stage] = { ...meta.stages[stage], ...patch };
  writeMeta(jobId, meta);
  return meta;
}

/** Update overall pipeline status. */
function updateOverall(jobId, overall) {
  const meta = readMeta(jobId);
  meta.overall = overall;
  writeMeta(jobId, meta);
  return meta;
}

/** Read/write a stage output blob (segments.json, content.json, etc.). */
function readBlob(jobId, name) {
  const p = path.join(jobDir(jobId), name);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeBlob(jobId, name, data) {
  const p = path.join(jobDir(jobId), name);
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

/** List frame files in a job-relative directory. */
function listFrames(jobId, subdir = 'frames') {
  const dir = path.join(jobDir(jobId), subdir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png)$/i.test(f)).sort();
}

module.exports = {
  STAGES, JOBS_ROOT, jobDir,
  createJob, listJobs,
  readMeta, writeMeta, updateStage, updateOverall,
  readBlob, writeBlob, listFrames
};
