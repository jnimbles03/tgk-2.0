# Working in this repo
- Read **PROJECT_CONTEXT.md** (repo root) before non-trivial work — it holds the
  durable architecture + hard-won gotchas. Keep it current as you learn.
- **Verify every HTML edit** (there is no test runner): run the inline-JS parse
  check (PROJECT_CONTEXT §9) after editing any HTML with inline scripts; for
  visual/behavioral changes, screenshot with the pre-installed Chromium (§9).
- **Usecase narration loads from the EXTERNAL `_audits/usecase-narrations-*.json`**
  via async fetch — the inline `tgk-usecases` bundle is dead on load. Edit the
  external file, keep the inline copy in sync, and mirror any per-scene build
  logic into the **async-rebuild path** or it vanishes once the bundle lands
  (PROJECT_CONTEXT §6).
- One small change per task → branch off fresh `main` → draft PR. No PR CI.

# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.
