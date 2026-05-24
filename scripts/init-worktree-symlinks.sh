#!/usr/bin/env bash
#
# init-worktree-symlinks.sh — make Chat-owned gitignored docs visible inside
# a Code-session worktree.
#
# Worktrees auto-created by the Claude Code harness inherit only tracked files.
# Several Chat-owned docs are gitignored on purpose (dual-Claude internal
# collaboration record, not part of the product) but Code still needs to read
# them to follow project context. This script symlinks each one from the
# main checkout into the worktree so the paths resolve transparently.
#
# Targets (each pointing at the main-checkout copy):
#   CLAUDE.md
#   STATUS.md
#   BANKED.md
#   project-instructions.md
#   docs/sessions                              (whole directory)
#   docs/shared/project-instructions.md        (second copy)
#   docs/AUDIT-*.md                            (pattern; each present file)
#
# Usage:
#   ./scripts/init-worktree-symlinks.sh           # auto-detect worktree from cwd
#   ./scripts/init-worktree-symlinks.sh <path>    # explicit worktree path
#
# Idempotent: skips entries that already exist (real file or existing symlink).
# No-op when run inside the main checkout itself.

set -e
shopt -s nullglob

# Resolve the main checkout: parent of the common .git directory.
COMMON_GIT_DIR="$(git rev-parse --git-common-dir)"
MAIN_CHECKOUT="$(cd "$(dirname "$COMMON_GIT_DIR")" && pwd)"

# Resolve target worktree.
if [ "$#" -ge 1 ]; then
  TARGET="$(cd "$1" && pwd)"
else
  TARGET="$(git rev-parse --show-toplevel)"
fi

if [ "$TARGET" = "$MAIN_CHECKOUT" ]; then
  echo "init-worktree-symlinks.sh: target is the main checkout — nothing to do."
  exit 0
fi

echo "==> Main checkout: $MAIN_CHECKOUT"
echo "==> Worktree:      $TARGET"

link_if_missing() {
  local rel="$1"
  local src="$MAIN_CHECKOUT/$rel"
  local dst="$TARGET/$rel"

  if [ ! -e "$src" ] && [ ! -L "$src" ]; then
    echo "    skip   $rel (not present in main checkout)"
    return
  fi
  if [ -e "$dst" ] || [ -L "$dst" ]; then
    echo "    skip   $rel (already exists)"
    return
  fi
  mkdir -p "$(dirname "$dst")"
  ln -s "$src" "$dst"
  echo "    link   $rel"
}

# Single files at the worktree root.
link_if_missing CLAUDE.md
link_if_missing STATUS.md
link_if_missing BANKED.md
link_if_missing project-instructions.md

# Whole directory: session archives.
link_if_missing docs/sessions

# Second copy of project-instructions inside docs/shared/.
link_if_missing docs/shared/project-instructions.md

# Pattern: any docs/AUDIT-*.md present in main.
for src in "$MAIN_CHECKOUT"/docs/AUDIT-*.md; do
  rel="docs/$(basename "$src")"
  link_if_missing "$rel"
done

echo "==> Done."
