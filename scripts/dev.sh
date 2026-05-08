#!/usr/bin/env bash
#
# dev.sh — start the Vite dev server inside a Code-session worktree.
#
# Usage:
#   ./scripts/dev.sh <worktree-name>   start dev server in the named worktree
#   ./scripts/dev.sh                   auto-resolve to newest worktree by mtime
#
# Example:
#   ./scripts/dev.sh sleepy-cannon-026604
#
# Behaviour:
#   1. Resolve repo root via `git rev-parse --show-toplevel`.
#   2. If a worktree name is passed, cd into it and run `npm run dev`.
#   3. If no name is passed, list .claude/worktrees/ by mtime, pick the
#      newest entry, print which worktree was selected, then run dev.
#   4. Error gracefully when no worktrees exist or the named worktree
#      is missing.
#
# set -e for fail-fast.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKTREES_DIR="$REPO_ROOT/.claude/worktrees"

if [ "$#" -ge 1 ]; then
  WORKTREE_NAME="$1"
  WORKTREE_PATH="$WORKTREES_DIR/$WORKTREE_NAME"
  if [ ! -d "$WORKTREE_PATH" ]; then
    echo "dev.sh: worktree not found at $WORKTREE_PATH" >&2
    echo "        Run ./scripts/dev.sh with no argument to auto-resolve to the newest worktree," >&2
    echo "        or check the spelling of the worktree name." >&2
    exit 1
  fi
else
  if [ ! -d "$WORKTREES_DIR" ] || [ -z "$(ls -A "$WORKTREES_DIR" 2>/dev/null)" ]; then
    echo "dev.sh: no worktrees found at $WORKTREES_DIR" >&2
    echo "        Start a Code session to create one, or use ./scripts/promote.sh" >&2
    echo "        to merge and clean up an existing worktree." >&2
    exit 1
  fi
  WORKTREE_NAME="$(ls -t "$WORKTREES_DIR" | head -n 1)"
  WORKTREE_PATH="$WORKTREES_DIR/$WORKTREE_NAME"
  echo "==> Auto-selected newest worktree: $WORKTREE_NAME"
fi

echo "==> Starting dev server in $WORKTREE_PATH"
cd "$WORKTREE_PATH"
exec npm run dev
