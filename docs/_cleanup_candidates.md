# Repo cleanup candidates — 2026-05-06

Generated during the "be done" sweep. Each tier is reviewable independently.
Run the listed `rm` (or VS Code delete) per tier; nothing here is mandatory.

Background: per `CANONICAL.md`, the canonical entry is `picker.html`
(server.js routes `/` to it). Both `docs/experiments/geos.html` and `docs/experiments/index-unified.html` are
already thin redirects. The deploy workflow at
`.github/workflows/deploy-pages.yml` plus `.github/scripts/rewrite-paths.mjs`
still ships several legacy entry-point HTMLs that the picker no longer
links to.

---

## Tier 1 — definitely safe (delete now)

Zero references in HTML/JS/MD/JSON, duplicated by canonical assets, or
pure scratch. Approve in one click.

| File | Size | Why |
|---|---|---|
| `index-1.html` | 716K | Identical-shape backup of `index.html`; zero references anywhere. |
| `Iris Logo Sting Final 15s 1080p.gif` | 24M | Duplicate of canonical `assets/iris/iris-logo-sting.gif` (4.3M); unreferenced. |
| `Iris Logo Sting Final 15s 1080p.gif.zip` | 24M | Zip of the duplicate above. |
| `.DS_Store` (×11) | trivial | macOS Finder scratch — should also be added to `.gitignore` if not already. |
| `Youtube demos/No valid account found!pega/` | empty dir | Orphaned empty directory. |

```bash
cd "/Users/patrickmeyer/Documents/Claude/Projects/TGK 2.0"
rm -f "index-1.html"
rm -f "Iris Logo Sting Final 15s 1080p.gif"
rm -f "Iris Logo Sting Final 15s 1080p.gif.zip"
find . -name ".DS_Store" -not -path "./node_modules/*" -not -path "./.git/*" -delete
rmdir "./Youtube demos/No valid account found!pega" 2>/dev/null
```

Total reclaimed: ~50MB.

---

## Tier 2 — safe but linked from deploy script (approve, then prune deploy)

These three pages are not reachable from `picker.html` — they're stale
predecessors. The Pages deploy still ships them because
`.github/scripts/rewrite-paths.mjs` lists them in its file array.
Removing them requires two coupled edits.

| File | Size | Last meaningful edit |
|---|---|---|
| `docs/experiments/auto.html` | 745K | superseded by `picker.html` |
| `docs/experiments/landing.html` | 30K | superseded by `picker.html` |
| `docs/experiments/index-playbook.html` | 36K | superseded by `picker.html` |

To remove cleanly:

1. Edit `.github/scripts/rewrite-paths.mjs` — drop `docs/experiments/auto.html`,
   `docs/experiments/landing.html`, `docs/experiments/index-playbook.html` from the path-rewrite array.
2. Drop the `docs/experiments/landing.html` index→story-demo-classic patch block (since
   the file is gone).
3. `rm auto.html landing.html index-playbook.html`.

```bash
cd "/Users/patrickmeyer/Documents/Claude/Projects/TGK 2.0"
# Step 1+2 first (manual edit of rewrite-paths.mjs), then:
rm -f auto.html landing.html index-playbook.html
```

Total reclaimed: ~810KB plus a cleaner deploy.

---

## Tier 3 — keep (flagged but load-bearing)

| File | Why kept |
|---|---|
| `index.html` (732K) | The Pages workflow renames this to `story-demo-classic.html` at deploy time and writes a fresh redirect index. Local `index.html` is the legacy classic experience — still useful as the source for that rename. |
| `_template.html` | Referenced by audit infrastructure (`_docusign-template-spec.md`, every public-sector and hls-roi sampler). |
| `HANDOFF.html`, `HANDOFF.md` | Active handoff docs (last edited 2026-05-06). |
| `STORYLINES.md`, `CANONICAL.md`, `TASKS.md` | Authoritative project docs. |
| `replit.md` | Replit infra config. |
| Every `*.html` redirect at root | `docs/experiments/geos.html`, `docs/experiments/index-unified.html`, the 11 sampler redirects per CANONICAL.md — keep, they're working URL shims. |
| `hls-discovery-process-map.html` | Per CANONICAL.md, preserved as standalone process-map artifact. |

---

## Notes for next pass

- `flipbooks/vids/` is gitignored (~7GB of source MP4s) — fine.
- `flipbooks/zips/` (extracted frames) is also gitignored.
- `Youtube demos/` (after removing the empty subdir) — confirm it's in `.gitignore` per memory.
- `assets/clips/iam-sales-agentforce.mp4` is intentional — trimmed web clip referenced by builder.

If the deploy script's array gets pruned (Tier 2), also re-grep
`audit/` reports — they reference `docs/experiments/auto.html` and `docs/experiments/landing.html`
historically; keeping those audit reports as historical record is
fine, but flagging here so future audit runs don't try to reload them.
