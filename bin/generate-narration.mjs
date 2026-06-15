#!/usr/bin/env node
/* =========================================================================
   bin/generate-narration.mjs — voice narration for the /demos library
   -------------------------------------------------------------------------
   Walks every engine-based demo, extracts the per-beat / per-pack narration
   text straight out of each demo's `say:{}` blocks (the same text shown in
   the sidebar), synthesizes it with the ElevenLabs TTS API, and writes:

       demos/audio/<demo>/<pack>/<sayKey>.mp3
       demos/audio/manifest.json   { demo: { pack: { sayKey: "<demo>/<pack>/<key>.mp3" } } }

   The shared engine (demo-engine.js) fetches that manifest and plays the
   matching clip per beat behind a "sound" toggle. No manifest ⇒ engine is
   silent (today's behavior), so this is purely additive.

   USAGE
     # all demos
     ELEVENLABS_API_KEY=sk-... node bin/generate-narration.mjs
     # one (or a few) demos by slug
     ELEVENLABS_API_KEY=sk-... node bin/generate-narration.mjs navigator agentforce
     # re-generate everything (ignore existing files)
     FORCE=1 ELEVENLABS_API_KEY=sk-... node bin/generate-narration.mjs
     # dry run — print the scripts, call no API, write nothing
     node bin/generate-narration.mjs --dry navigator

   ENV
     ELEVENLABS_API_KEY   required for real synthesis
     ELEVENLABS_VOICE_ID  default 21m00Tcm4TlvDq8ikWAM (Rachel)
     ELEVENLABS_MODEL     default eleven_multilingual_v2
     FORCE=1              re-synthesize even if the mp3 already exists
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT      = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEMOS_DIR = path.join(ROOT, 'demos');
const OUT_DIR   = path.join(DEMOS_DIR, 'audio');
const API_KEY   = process.env.ELEVENLABS_API_KEY || '';
const VOICE_ID  = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const MODEL_ID  = process.env.ELEVENLABS_MODEL    || 'eleven_multilingual_v2';
const args      = process.argv.slice(2);
const DRY       = args.includes('--dry') || !API_KEY;
const onlySlugs = args.filter(a => !a.startsWith('--'));

// Run a demo's inline init() in a sandbox and capture the config object.
function extractConfig(file) {
  const html   = fs.readFileSync(file, 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (!blocks.length) return null;
  const code = blocks[blocks.length - 1][1];
  const sb = {
    DemoEngine: { init: o => { sb.__cfg = o; }, interactive: o => { sb.__cfg = o; sb.__interactive = true; } },
    document: { getElementById: () => null }, window: {}, console, setTimeout, setInterval,
  };
  vm.createContext(sb);
  try { vm.runInContext(code, sb, { timeout: 4000 }); } catch (_) { return null; }
  return sb.__interactive ? null : (sb.__cfg || null);  // skip interactive demos (no scripted beats)
}

const strip = s => String(s == null ? '' : s)
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&[a-z]+;/gi, ' ')
  .replace(/\s+/g, ' ').trim();

// Narration line for a say block: the spoken sentence(s), title then body.
const scriptFor = say => say ? strip([say.title, say.body].filter(Boolean).join('. ')) : '';

async function tts(text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({
      text, model_id: MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const files = fs.readdirSync(DEMOS_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html');
  const manifest = {};
  let made = 0, skipped = 0, dryLines = 0;

  for (const f of files) {
    const slug = f.replace(/\.html$/, '');
    if (onlySlugs.length && !onlySlugs.includes(slug)) continue;
    const cfg = extractConfig(path.join(DEMOS_DIR, f));
    if (!cfg || !cfg.packs || !cfg.timeline || !cfg.timeline.beats) continue;

    const out = {};
    for (const pack of Object.keys(cfg.packs)) {
      const sayMap = cfg.packs[pack].say || {};
      const packOut = {};
      for (const key of Object.keys(sayMap)) {
        const text = scriptFor(sayMap[key]);
        if (!text) continue;
        const rel = `${slug}/${pack}/${key}.mp3`;
        const abs = path.join(OUT_DIR, rel);

        if (DRY) { console.log(`[dry] ${slug}/${pack}/${key}\n      ${text}`); dryLines++; continue; }
        if (fs.existsSync(abs) && !process.env.FORCE) { packOut[key] = rel; skipped++; continue; }
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        const buf = await tts(text);
        fs.writeFileSync(abs, buf);
        packOut[key] = rel; made++;
        console.log(`✓ ${rel} (${buf.length} bytes)`);
      }
      if (Object.keys(packOut).length) out[pack] = packOut;
    }
    if (Object.keys(out).length) manifest[slug] = out;
  }

  if (DRY) {
    console.log(`\nDRY RUN — ${dryLines} narration lines${API_KEY ? '' : ' (no ELEVENLABS_API_KEY set)'}. Nothing written.`);
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Merge with any existing manifest so single-demo runs don't drop others.
  const manPath = path.join(OUT_DIR, 'manifest.json');
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(manPath, 'utf8')); } catch (_) {}
  fs.writeFileSync(manPath, JSON.stringify({ ...prev, ...manifest }, null, 2));
  console.log(`\nmanifest.json written. generated=${made} skipped=${skipped}`);
}

main().catch(e => { console.error(String(e.message || e)); process.exit(1); });
