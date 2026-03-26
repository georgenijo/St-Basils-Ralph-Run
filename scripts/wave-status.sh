#!/bin/bash
# wave-status.sh — Check the status of all worktrees and their PRs
#
# Usage: ./scripts/wave-status.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_DIR="${REPO_ROOT}/../stbasils-worktrees"

echo "=== St. Basil's Ralph Loop — Worktree Status ==="
echo ""

if [[ ! -d "$WORKTREE_DIR" ]]; then
  echo "No worktrees found. Run launch-wave.sh first."
  exit 0
fi

# List all worktrees
for dir in "$WORKTREE_DIR"/*/; do
  [[ -d "$dir" ]] || continue
  branch_name=$(basename "$dir")

  # Get git status
  changes=$(git -C "$dir" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  last_commit=$(git -C "$dir" log -1 --format="%s" 2>/dev/null || echo "no commits")

  # Check for open PR
  pr_status=$(gh pr view "feat/${branch_name}" --json state,url 2>/dev/null || echo "no-pr")

  if [[ "$pr_status" == "no-pr" ]]; then
    pr_display="No PR"
  else
    pr_state=$(echo "$pr_status" | jq -r '.state' 2>/dev/null || echo "unknown")
    pr_url=$(echo "$pr_status" | jq -r '.url' 2>/dev/null || echo "")
    pr_display="${pr_state} ${pr_url}"
  fi

  # Ralph status
  if [[ -f "$dir/.ralph/fix_plan.md" ]]; then
    done_count=$(grep -c '\[x\]' "$dir/.ralph/fix_plan.md" 2>/dev/null || echo "0")
    total_count=$(grep -c '\[.\]' "$dir/.ralph/fix_plan.md" 2>/dev/null || echo "0")
    ralph_display="${done_count}/${total_count} tasks"
  else
    ralph_display="no fix_plan"
  fi

  echo "  ${branch_name}"
  echo "    Uncommitted: ${changes} files | Ralph: ${ralph_display}"
  echo "    Last commit: ${last_commit}"
  echo "    PR: ${pr_display}"
  echo ""
done

# Show active tmux sessions
echo "=== Active tmux sessions ==="
tmux list-sessions 2>/dev/null | grep "wave" || echo "  No wave sessions running"
