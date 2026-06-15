# Demo voice narration (ElevenLabs)

Per-beat voiceover for the engine-based demos, synthesized from each demo's
existing `say:{}` narration text (the same copy shown in the sidebar). This is
purely additive — with no audio here, the demos behave exactly as before.

## Generate

```bash
export ELEVENLABS_API_KEY=sk-...                 # required
# optional:
#   export ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM   # default (Rachel)
#   export ELEVENLABS_MODEL=eleven_multilingual_v2

node scripts/generate-narration.mjs              # all scripted demos
node scripts/generate-narration.mjs navigator    # just one (by slug)
node scripts/generate-narration.mjs --dry navigator   # print the scripts, write nothing
```

Writes:

```
demos/audio/<demo>/<pack>/<sayKey>.mp3
demos/audio/manifest.json    # { demo: { pack: { sayKey: "<demo>/<pack>/<key>.mp3" } } }
```

Re-runs skip files that already exist (use `FORCE=1` to re-synthesize everything).

## Playback

`demos/engine/demo-engine.js` fetches `audio/manifest.json` on load. If there's
an entry for the current demo, a **speaker button** appears in the transport.
Audio is **off by default** (browsers block autoplay-with-sound) — click it to
enable. Each beat's clip plays as that beat is reached, and switching the
vertical picker swaps the audio set, exactly like the on-screen text. No
manifest ⇒ no button, demos stay silent.

## Notes

- One-time generation; commit the `.mp3`s + `manifest.json` (they serve
  statically on GitHub Pages and Replit).
- Volume is modest: ~25 demos × 2–3 packs × ~5 beats of short lines.
- Interactive (`*-live`) demos are skipped — they have no scripted beat timeline.
