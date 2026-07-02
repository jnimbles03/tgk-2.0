# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.
- **Graph state:** `graphify-out/` is **gitignored / regenerable** — empty in a
  fresh container, rebuild per session. The default rebuild is **AST/code-only**
  (indexes the `.js`/`.py`/`.json`: builder lib, server, `demo-engine.js`,
  audit/flipbook scripts) and does **NOT** index the ~450 HTML demos/stories, so
  `graphify query` won't surface UI/markup — read those files directly. Full HTML
  indexing is the costly semantic build; opt in only when asked.

# autopilot kickoff (durable convention)
- The demo a customer opens **waits for their first action, then autopilot drives**.
  Full detail in `PROJECT_CONTEXT.md` §6 (story-shell) and §7 (demo engine).
  - **Story:** opens *held* (`holdingForGesture`/`engageHold`); first gesture →
    `releaseHoldAndResume`. `#kickoff-catch` is a transparent over-stage overlay so
    a click over the scene iframe still begins it. `webform_intake` scenes keep the
    form interactive and hand off via `tgk:armKickoff` → Next → `tgk:kickoff` →
    advance to s2. Async-usecase / IDB re-renders call `goTo` (clears the hold) and
    must re-`engageHold()` (guarded `!playing`) or the cold-open freezes.
  - **Demo engine** (separate code): agent demos open *armed* (first chip click →
    `driveRest`); movie demos use the `#de-startveil` "Start" overlay. Gate params:
    `kickoff=1` (force the wait when embedded), `autostart=1`/`loop=1`/`attract=1`
    (force autoplay), `attract=0` (static thumbnail). `?autostart=1` (story) restores
    the old auto-begin. Ambient discovery embeds (`?embed=1&loop=1`) auto-run.
