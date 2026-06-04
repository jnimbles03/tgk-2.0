/* =========================================================================
   builder/lib/prompts.js — versioned prompt loader
   -------------------------------------------------------------------------
   Reads prompt files from builder/prompts/{version}/{stage}.{version}.md.
   Active version is BUILDER_PROMPT_VERSION env var (default "v1").

   Versioning rule (from spec):
     - Bumping a prompt creates a new directory; the old one stays.
     - Jobs record which prompt version they used in job-meta.json
       so historical builds remain reproducible.
     - Promoting a draft to active is an explicit env flip, not a
       side effect of editing.
   ========================================================================= */

const fs = require('fs');
const path = require('path');

const PROMPTS_ROOT = path.join(__dirname, '..', 'prompts');
const ACTIVE_VERSION = () => process.env.BUILDER_PROMPT_VERSION || 'v1';

const STAGE_FILES = {
  decode:               'decode.{v}.md',
  triage:               'triage.{v}.md',
  'classify-replay':    'classify-replay.{v}.md',
  'classify-synthesize':'classify-synthesize.{v}.md',
  analyze:              'analyze.{v}.md',    // vision loop: prev+current frame pair analysis
  extract:              'extract.{v}.md',
  render:               'render.{v}.md',     // HTML generation from ordered descriptions
  generate:             'render.{v}.md'      // alias — 'generate' routes to the render prompt
};

/** Load a prompt's text content for the active version (or an explicit one). */
function loadPrompt(stage, version) {
  const v = version || ACTIVE_VERSION();
  const file = STAGE_FILES[stage];
  if (!file) throw new Error(`Unknown stage: ${stage}`);
  const filePath = path.join(PROMPTS_ROOT, v, file.replace('{v}', v));
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt not found: ${filePath} — bump BUILDER_PROMPT_VERSION or add the file.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

/** List every available prompt version directory (for the admin UI). */
function listVersions() {
  if (!fs.existsSync(PROMPTS_ROOT)) return [];
  return fs.readdirSync(PROMPTS_ROOT)
    .filter(f => fs.statSync(path.join(PROMPTS_ROOT, f)).isDirectory())
    .sort();
}

/** Read every prompt for a given version (admin editor list view). */
function readVersion(version) {
  const v = version || ACTIVE_VERSION();
  const dir = path.join(PROMPTS_ROOT, v);
  if (!fs.existsSync(dir)) return null;
  const out = {};
  for (const stage of Object.keys(STAGE_FILES)) {
    const file = STAGE_FILES[stage].replace('{v}', v);
    const filePath = path.join(dir, file);
    out[stage] = {
      file,
      exists: fs.existsSync(filePath),
      content: fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null
    };
  }
  return { version: v, prompts: out };
}

/**
 * Save a prompt edit (drafts only). Spec says edits create a new draft
 * version, not in-place mutation. Pattern: bump from "v1" → "v1-draft" by
 * cloning the dir, write the change, leave promotion to a separate action.
 */
function saveDraft(fromVersion, stage, newContent) {
  const draftVersion = `${fromVersion}-draft`;
  const fromDir = path.join(PROMPTS_ROOT, fromVersion);
  const toDir = path.join(PROMPTS_ROOT, draftVersion);
  if (!fs.existsSync(fromDir)) throw new Error(`Source version ${fromVersion} not found`);
  if (!fs.existsSync(toDir)) {
    fs.mkdirSync(toDir, { recursive: true });
    // Clone every prompt into the draft dir
    for (const stageKey of Object.keys(STAGE_FILES)) {
      const srcFile = STAGE_FILES[stageKey].replace('{v}', fromVersion);
      const srcPath = path.join(fromDir, srcFile);
      if (!fs.existsSync(srcPath)) continue;
      const dstFile = STAGE_FILES[stageKey].replace('{v}', draftVersion);
      fs.copyFileSync(srcPath, path.join(toDir, dstFile));
    }
  }
  const targetFile = STAGE_FILES[stage].replace('{v}', draftVersion);
  fs.writeFileSync(path.join(toDir, targetFile), newContent, 'utf8');
  return { version: draftVersion, file: targetFile };
}

module.exports = { loadPrompt, listVersions, readVersion, saveDraft, ACTIVE_VERSION, STAGE_FILES };
