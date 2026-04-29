#!/usr/bin/env bash
# ============================================================================
# Replit start hook — pulls latest from GitHub before booting the server.
# ============================================================================
#
# Why this exists
# ---------------
# The TGK editing workflow is: Cowork on Mac edits files → push to GitHub →
# Replit deploys. Replit doesn't auto-pull when GitHub changes, and its
# "Publish your App" button keeps creating local commits ("Published your
# App") that diverge from origin/main and break subsequent `git pull`s.
#
# This script makes every Run/Restart in Replit do the right thing:
#   1. Fetch origin
#   2. Hard-reset to origin/main (wipes any local divergence, including
#      Replit's auto-commits — they're deploy noise, not real work)
#   3. Boot the server with the freshly-synced code
#
# Wired in via .replit:
#   run = "bash bin/replit-start.sh"
#   workflows.workflow."Start application".tasks[0].args = "bash bin/replit-start.sh"
#
# Caveats
# -------
# - Any uncommitted edits made directly in the Replit editor will be wiped.
#   That's intentional — the workflow says "never edit in the Repl". If you
#   genuinely need to edit there one-off, comment out the reset line, do the
#   work, push to GitHub from the Repl shell, then uncomment.
# - If `git fetch` fails (network blip, GitHub down), the script falls back
#   to whatever's already in the working tree. The Repl still boots.
# ============================================================================

set -u
cd "$(dirname "$0")/.."

echo "[replit-start] $(date -u +%FT%TZ) — syncing with origin/main..."

if git fetch origin main 2>&1 | sed 's/^/[replit-start] git: /'; then
  # Capture the SHA that's about to land so the boot log shows what code
  # is actually running. Useful when debugging "is this the new build?"
  TARGET_SHA="$(git rev-parse --short origin/main 2>/dev/null || echo 'unknown')"
  git reset --hard origin/main 2>&1 | sed 's/^/[replit-start] reset: /'
  echo "[replit-start] now at origin/main @ ${TARGET_SHA}"
else
  echo "[replit-start] fetch failed — booting from current working tree."
fi

echo "[replit-start] launching node server.js..."
exec node server.js
