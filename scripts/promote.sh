#!/usr/bin/env bash
#
# promote.sh — promote a Code-session worktree branch into main and clean up.
#
# Usage:
#   ./scripts/promote.sh <worktree-name> "<commit-message>"
#
# Example:
#   ./scripts/promote.sh optimistic-ptolemy-671704 "S133f: chip mechanism stripes"
#
# Sequence:
#   1. cd into the worktree at .claude/worktrees/<worktree-name>
#   2. If staged changes exist, commit them with the supplied message.
#      (Skips cleanly when Code has already committed — the new discipline.)
#   3. Switch to the main checkout, fast-forward / merge claude/<worktree-name>.
#   4. Push origin main (deploy fires via GitHub Actions).
#   5. Remove the worktree, delete the branch (-d, falling back to -D).
#
# set -e for fail-fast; each step echoes so a failure is diagnosable.

set -e

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <worktree-name> \"<commit-message>\"" >&2
  exit 2
fi

WORKTREE_NAME="$1"
COMMIT_MSG="$2"

REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKTREE_PATH="$REPO_ROOT/.claude/worktrees/$WORKTREE_NAME"
BRANCH="claude/$WORKTREE_NAME"

if [ ! -d "$WORKTREE_PATH" ]; then
  echo "promote.sh: worktree not found at $WORKTREE_PATH" >&2
  exit 1
fi

echo "==> Worktree: $WORKTREE_PATH"
echo "==> Branch:   $BRANCH"
echo "==> Message:  $COMMIT_MSG"

# Step 1 — commit any uncommitted/staged work in the worktree.
cd "$WORKTREE_PATH"

# Stage any unstaged tracked changes so the commit captures them.
git add -A

if git diff --cached --quiet; then
  echo "==> No staged changes in worktree — skipping commit (Code already committed, or no edits)."
else
  echo "==> Committing staged changes in worktree."
  git commit -m "$COMMIT_MSG"
fi

# Step 2 — switch to main and merge.
cd "$REPO_ROOT"
echo "==> Switching to main."
git checkout main

echo "==> Merging $BRANCH into main."
git merge --no-ff "$BRANCH" -m "Merge $BRANCH: $COMMIT_MSG"

# Step 3 — push.
echo "==> Pushing origin main."
git push origin main

# Step 4 — cleanup.
echo "==> Removing worktree at $WORKTREE_PATH."
git worktree remove "$WORKTREE_PATH"

echo "==> Deleting branch $BRANCH."
if ! git branch -d "$BRANCH" 2>/dev/null; then
  echo "    -d refused; falling back to -D (branch is merged, safe)."
  git branch -D "$BRANCH"
fi

echo "==> Promote complete."
