# /builder regression set

Reference MP4s + expected outputs that the pipeline must reproduce on every prompt-version change. Without this set, prompt edits silently break working demos.

## Status (2026-05-07)

Empty. Patrick has 13 product demos under `flipbooks/vids/` (gitignored, ~7 GiB) that are candidate seeds. The team should curate a smaller set — 5–10 short clips that exercise different pipeline branches — and check them into this directory.

## Manifest format

For each clip, store two files:

```
banking-ncino-loan-origination.mp4    ← the source clip (≤ 60s recommended)
banking-ncino-loan-origination.expected.json
```

The expected.json captures what the pipeline should produce, with declared tolerances:

```json
{
  "slug": "banking-ncino-loan-origination",
  "vertical": "banking",
  "vendor": "ncino",
  "fps": 1,
  "expected": {
    "decode": {
      "frame_count": { "min": 55, "max": 65 },
      "source_duration_s": { "min": 58, "max": 62 }
    },
    "triage": {
      "drop_ratio": { "min": 0.05, "max": 0.20 },
      "kept_runtime_s": { "min": 50, "max": 58 },
      "status": "ok"
    },
    "classify": {
      "branch": "replay",
      "segment_count": { "min": 4, "max": 7 },
      "techniques": { "1": { "min": 1 }, "3": { "min": 1 } }
    },
    "extract": {
      "scene_count": { "min": 4, "max": 7 },
      "content_keys": { "min": 15 },
      "theme_tokens": { "min": 6 },
      "no_inline_vendor_strings": true
    },
    "render": {
      "html_size_bytes": { "max": 1500000 },
      "primitives_in_timeline": { "min": 12 },
      "deterministic": true
    },
    "total_runtime_s": { "max": 60 }
  }
}
```

## Suggested seed set (the 5 branches that need coverage)

| Slug | Source candidate | Branches it exercises |
|---|---|---|
| banking-ncino-loan-origination | (curate from flipbooks/vids) | REPLAY, multi-technique, mixed segments |
| healthcare-epic-chart-review | (curate) | REPLAY, dense UI, vendor-specific text |
| public-sector-permit-intake | (curate) | REPLAY, simple form, single technique |
| short-source-clip | clip ~6s of any demo | SYNTHESIZE branch (kept_runtime < 8s) |
| marketing-with-product-cameo | (heavy intro/outro) | TRIAGE hard warning gate (drop > 0.70) |

## CI hook (TODO)

A GitHub Action under `.github/workflows/builder-regression.yml` should:

1. Trigger on changes to `builder/prompts/**`
2. For each `*.mp4` in `builder/regression/`:
   - `POST /api/builder/jobs` with the matching expected.json's vertical/vendor/fps
   - `POST /api/builder/jobs/:id/run-all`
   - Compare the resulting `job-meta.json` + stage outputs against `expected.json` tolerances
3. Block prompt promotion (the env flip) if any check fails

The Cowork sandbox can't push, so this hook gets written + tested by a human on the Mac side. See the main README for the push handoff dance.
