#!/bin/bash
# stop-after-next-merge.sh — merge a specific branch PR, then stop the catch-up runner

set -uo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <branch> <workspace> [runner_pid ...]" >&2
  exit 1
fi

BRANCH="$1"
WORKSPACE="$2"
shift 2
RUNNER_PIDS=("$@")

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PR_REPO="georgenijo/St-Basils-Ralph-Run"
LOG_FILE="${REPO_ROOT}/.ralph/logs/stop-after-next.log"
WORKTREE="${REPO_ROOT}/../stbasils-worktrees/${BRANCH}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >>"$LOG_FILE"
}

close_runner() {
  if [[ ${#RUNNER_PIDS[@]} -gt 0 ]]; then
    kill "${RUNNER_PIDS[@]}" >>"$LOG_FILE" 2>&1 || true
  fi
}

mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

log "Watcher armed for feat/${BRANCH}; workspace=${WORKSPACE}; runner_pids=${RUNNER_PIDS[*]:-none}"

while true; do
  open_pr="$(gh pr list --repo "$PR_REPO" --state open --head "feat/${BRANCH}" \
    --json number --jq '.[0].number // empty' 2>>"$LOG_FILE" || true)"
  merged_pr="$(gh pr list --repo "$PR_REPO" --state merged --head "feat/${BRANCH}" \
    --json number --jq '.[0].number // empty' 2>>"$LOG_FILE" || true)"

  if [[ -n "$open_pr" ]]; then
    log "Open PR detected: #${open_pr}; merging"
    if gh pr merge --repo "$PR_REPO" "feat/${BRANCH}" --squash --delete-branch >>"$LOG_FILE" 2>&1; then
      merged_pr="$open_pr"
      log "Merged PR #${open_pr}"
    else
      log "Merge attempt failed for #${open_pr}; retrying"
      sleep 2
      continue
    fi
  fi

  if [[ -n "$merged_pr" ]]; then
    log "Stopping catch-up runner after merged PR #${merged_pr}"
    git -C "$REPO_ROOT" checkout main >>"$LOG_FILE" 2>&1 || true
    git -C "$REPO_ROOT" pull origin main >>"$LOG_FILE" 2>&1 || true
    cmux close-workspace --workspace "$WORKSPACE" >>"$LOG_FILE" 2>&1 || true
    git -C "$REPO_ROOT" worktree remove "$WORKTREE" --force >>"$LOG_FILE" 2>&1 || true
    git -C "$REPO_ROOT" branch -D "feat/${BRANCH}" >>"$LOG_FILE" 2>&1 || true
    close_runner
    log "Queue stop complete"
    exit 0
  fi

  sleep 2
done
