## Project context (read this first)

Durable, hard-won context for working in this repo — architecture, the
builder/story-shell/demos systems, environments, conventions, and the parse/
jsdom verification harness — lives in **`.claude/PROJECT_CONTEXT.md`**. Read it
before non-trivial work, and keep it current as you learn more.

@.claude/PROJECT_CONTEXT.md

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Product naming (display vs. slugs)

Two Docusign products were rebranded in **demo-visible TEXT ONLY** — the
underlying filenames, URLs, demo keys, CSS classes, and IDs were intentionally
left on their original slugs:

- **"Maestro" → "Workflow Builder"** (visible label only)
- **"Navigator" → "Agreement Manager"** (visible label only)

What this means in practice:
- Files/paths keep the old names: `demos/maestro.html`, `demos/navigator.html`,
  `story-templates/docusign-maestro-*.html`, `flipbooks/Maestro_Workflow_Templates.html`,
  `flipbooks/Navigator_Demo_Video.html`, `components/future-state/component-{maestro,navigator}-*.html`.
- Code identifiers keep the old slugs: demo-catalog keys `'maestro'` / `'navigator'`,
  classes like `.maestro-*`, `#view-maestro`, `embed-slot-navigator-search`, and the
  shell's `path.indexOf("maestro-address-change")` check.
- The browser `navigator` API (`navigator.clipboard`, etc.) is unrelated and untouched.
- Note: `demos/agreement-manager.html` is a **separate, pre-existing** demo (an AI-analysis
  worksheet) — distinct from `demos/navigator.html` (the repository view that now *displays*
  as "Agreement Manager"). They were deliberately not merged.

Rule going forward: only change the visible label when these names appear; keep the
existing file/URL/key slugs so links and references don't break.
