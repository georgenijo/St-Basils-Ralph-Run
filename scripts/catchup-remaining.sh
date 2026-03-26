#!/bin/bash
# catchup-remaining.sh — sequentially run the remaining St. Basil's tickets

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_BASE="${REPO_ROOT}/../stbasils-worktrees"
LOG_DIR="${REPO_ROOT}/.ralph/logs"
LOG_FILE="${LOG_DIR}/catchup.log"
PR_REPO="georgenijo/St-Basils-Ralph-Run"
ISSUE_REPO="georgenijo/St-Basils-Boston-Web"
POLL_INTERVAL="${POLL_INTERVAL:-30}"
TICKET_TIMEOUT="${TICKET_TIMEOUT:-1800}"

mkdir -p "$WORKTREE_BASE" "$LOG_DIR"
WORKTREE_BASE="$(cd "$WORKTREE_BASE" && pwd)"
touch "$LOG_FILE"

TOTAL_COMPLETED=0
TOTAL_SKIPPED=0
TOTAL_TIMEOUTS=0
TOTAL_FAILED=0

TICKETS=(
  "51:sanity:P2-03-spiritual-leader"
  "52:sanity:P2-04-clergy"
  "53:sanity:P2-05-office-bearer"
  "54:sanity:P2-06-organization"
  "55:sanity:P2-07-useful-link"
  "56:sanity:P2-08-acolytes-choir"
  "65:frontend:P2-17-terms-of-use"
  "67:frontend:P2-19-our-clergy"
  "68:frontend:P2-20-office-bearers"
  "69:frontend:P2-21-our-organizations"
  "70:frontend:P2-22-useful-links"
  "71:frontend:P2-23-acolytes-choir"
  "73:fullstack:P2-25-og-tags"
  "79:frontend:P3-06-dashboard"
  "80:fullstack:P3-07-logout"
  "81:supabase:P3-08-seed-admin"
  "84:frontend:4a-03-contact-page"
  "85:supabase:4b-01-events-schema"
  "86:fullstack:4b-02-events-crud"
  "87:frontend:4b-03-calendar-page"
  "88:fullstack:4b-04-event-detail"
  "89:supabase:4c-01-announcements-schema"
  "90:fullstack:4c-02-announcements-crud"
  "91:frontend:4c-03-announcements-feed"
  "92:supabase:4c-04-email-broadcast"
  "93:fullstack:4d-01-subscribers"
  "94:frontend:4d-02-signup-form"
  "95:fullstack:4d-03-resend-audiences"
  "96:fullstack:5-01-vercel-analytics"
  "97:fullstack:5-02-lighthouse-ci"
  "98:fullstack:5-03-dynamic-og"
  "99:fullstack:5-04-schema-org"
  "100:reviewer:5-05-wcag-audit"
  "101:reviewer:5-06-core-web-vitals"
  "104:reviewer:6-02-smoke-test"
  "48:reviewer:P1-17-responsive-audit"
)

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}

run_logged() {
  "$@" >>"$LOG_FILE" 2>&1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "ERROR: required command not found: $1"
    exit 1
  fi
}

ensure_cmux_ready() {
  require_command cmux

  launchctl setenv CMUX_ALLOW_SOCKET_OVERRIDE 1 >>"$LOG_FILE" 2>&1 || true
  launchctl setenv CMUX_SOCKET_MODE allowAll >>"$LOG_FILE" 2>&1 || true

  if cmux ping >>"$LOG_FILE" 2>&1; then
    return 0
  fi

  log "cmux is not responding; opening the app"
  open -a cmux >>"$LOG_FILE" 2>&1 || true

  local i
  for i in $(seq 1 30); do
    if cmux ping >>"$LOG_FILE" 2>&1; then
      log "cmux is ready"
      return 0
    fi
    sleep 1
  done

  log "ERROR: cmux did not become ready"
  return 1
}

update_local_main() {
  log "Updating local main"
  run_logged git -C "$REPO_ROOT" checkout main || log "WARN: git checkout main failed"
  run_logged git -C "$REPO_ROOT" pull origin main || log "WARN: git pull origin main failed"
}

cleanup_local_branch() {
  local branch="$1"
  local worktree="${WORKTREE_BASE}/${branch}"

  if git -C "$REPO_ROOT" worktree list --porcelain | grep -Fxq "worktree ${worktree}"; then
    run_logged git -C "$REPO_ROOT" worktree remove "$worktree" --force || \
      log "WARN: failed to remove worktree ${worktree}"
  fi

  if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/feat/${branch}"; then
    run_logged git -C "$REPO_ROOT" branch -D "feat/${branch}" || \
      log "WARN: failed to delete local branch feat/${branch}"
  fi
}

open_pr_number() {
  local branch="$1"
  gh pr list --repo "$PR_REPO" --state open --head "feat/${branch}" \
    --json number --jq '.[0].number // empty' 2>>"$LOG_FILE" || true
}

merged_pr_number() {
  local branch="$1"
  gh pr list --repo "$PR_REPO" --state merged --head "feat/${branch}" \
    --json number --jq '.[0].number // empty' 2>>"$LOG_FILE" || true
}

pr_field() {
  local branch="$1"
  local field="$2"
  gh pr view --repo "$PR_REPO" "feat/${branch}" --json "$field" \
    --jq ".${field}" 2>>"$LOG_FILE" || true
}

close_stale_open_pr() {
  local issue="$1"
  local branch="$2"
  local pr_number="$3"

  log "#${issue} ${branch}: closing stale open PR #${pr_number} before rerun"
  run_logged gh pr close --repo "$PR_REPO" "$pr_number" --delete-branch || \
    log "WARN: failed to close PR #${pr_number}"
  cleanup_local_branch "$branch"
}

merge_branch_pr() {
  local issue="$1"
  local branch="$2"

  log "#${issue} ${branch}: merging PR feat/${branch}"
  if run_logged gh pr merge --repo "$PR_REPO" "feat/${branch}" --squash --delete-branch; then
    log "#${issue} ${branch}: merge complete"
    update_local_main
    cleanup_local_branch "$branch"
    TOTAL_COMPLETED=$((TOTAL_COMPLETED + 1))
    return 0
  fi

  log "#${issue} ${branch}: merge failed"
  TOTAL_FAILED=$((TOTAL_FAILED + 1))
  return 1
}

launch_workspace() {
  local worktree="$1"
  local issue="$2"
  local branch="$3"
  local output
  local workspace

  output="$(cmux new-workspace --cwd "$worktree" \
    --command "bash -c 'ralph; exec bash'" 2>>"$LOG_FILE")" || return 1
  workspace="$(printf '%s\n' "$output" | grep -o 'workspace:[0-9]\+' | head -n 1)"

  if [[ -z "$workspace" ]]; then
    log "#${issue} ${branch}: failed to parse cmux workspace from: ${output}"
    return 1
  fi

  run_logged cmux rename-workspace --workspace "$workspace" "#${issue}: ${branch}" || \
    log "WARN: failed to rename ${workspace}"
  printf '%s\n' "$workspace"
}

close_workspace() {
  local workspace="${1:-}"
  if [[ -n "$workspace" ]]; then
    run_logged cmux close-workspace --workspace "$workspace" || \
      log "WARN: failed to close workspace ${workspace}"
  fi
}

capture_workspace_screen() {
  local workspace="${1:-}"
  if [[ -n "$workspace" ]]; then
    {
      echo "----- cmux screen ${workspace} -----"
      cmux read-screen --workspace "$workspace" --scrollback --lines 120 2>&1 || true
      echo "----- end cmux screen ${workspace} -----"
    } >>"$LOG_FILE"
  fi
}

poll_for_pr() {
  local issue="$1"
  local branch="$2"
  local deadline
  local open_pr
  local merged_pr

  deadline=$(( $(date +%s) + TICKET_TIMEOUT ))

  while true; do
    open_pr="$(open_pr_number "$branch")"
    if [[ -n "$open_pr" ]]; then
      log "#${issue} ${branch}: found open PR #${open_pr}"
      return 0
    fi

    merged_pr="$(merged_pr_number "$branch")"
    if [[ -n "$merged_pr" ]]; then
      log "#${issue} ${branch}: already merged as PR #${merged_pr}"
      return 0
    fi

    if (( $(date +%s) >= deadline )); then
      return 1
    fi

    log "#${issue} ${branch}: waiting for PR"
    sleep "$POLL_INTERVAL"
  done
}

run_ticket() {
  local issue="$1"
  local agent="$2"
  local branch="$3"
  local worktree="${WORKTREE_BASE}/${branch}"
  local workspace=""
  local merged_pr=""
  local open_pr=""
  local mergeable=""
  local is_draft=""

  log ""
  log "================================================================"
  log "Starting #${issue}: ${branch} (${agent})"
  log "================================================================"

  merged_pr="$(merged_pr_number "$branch")"
  if [[ -n "$merged_pr" ]]; then
    log "#${issue} ${branch}: merged PR #${merged_pr} already exists, skipping"
    cleanup_local_branch "$branch"
    TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
    return 0
  fi

  open_pr="$(open_pr_number "$branch")"
  if [[ -n "$open_pr" ]]; then
    mergeable="$(pr_field "$branch" mergeable)"
    is_draft="$(pr_field "$branch" isDraft)"

    if [[ "$mergeable" == "MERGEABLE" && "$is_draft" == "false" ]]; then
      log "#${issue} ${branch}: open PR #${open_pr} already exists; merging instead of rerunning"
      merge_branch_pr "$issue" "$branch"
      return 0
    fi

    close_stale_open_pr "$issue" "$branch" "$open_pr"
  fi

  cleanup_local_branch "$branch"
  update_local_main

  log "#${issue} ${branch}: creating worktree"
  if ! run_logged "$REPO_ROOT/scripts/generate-worktree.sh" "$issue" "$agent" "$branch"; then
    log "#${issue} ${branch}: worktree creation failed"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
    return 1
  fi

  log "#${issue} ${branch}: launching Ralph in cmux"
  if ! workspace="$(launch_workspace "$worktree" "$issue" "$branch")"; then
    log "#${issue} ${branch}: failed to launch cmux workspace"
    cleanup_local_branch "$branch"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
    return 1
  fi
  log "#${issue} ${branch}: launched in ${workspace}"

  if poll_for_pr "$issue" "$branch"; then
    close_workspace "$workspace"

    merged_pr="$(merged_pr_number "$branch")"
    if [[ -n "$merged_pr" ]]; then
      log "#${issue} ${branch}: already merged by the time polling finished"
      update_local_main
      cleanup_local_branch "$branch"
      TOTAL_COMPLETED=$((TOTAL_COMPLETED + 1))
      return 0
    fi

    merge_branch_pr "$issue" "$branch"
    return 0
  fi

  log "#${issue} ${branch}: timed out after ${TICKET_TIMEOUT}s with no PR"
  capture_workspace_screen "$workspace"
  close_workspace "$workspace"
  cleanup_local_branch "$branch"
  TOTAL_TIMEOUTS=$((TOTAL_TIMEOUTS + 1))
  return 0
}

main() {
  require_command gh
  require_command git
  require_command jq
  require_command ralph
  ensure_cmux_ready || exit 1

  log "Catch-up run starting"
  log "Repo root: ${REPO_ROOT}"
  log "Issue repo: ${ISSUE_REPO}"
  log "PR repo: ${PR_REPO}"
  log "Ticket count: ${#TICKETS[@]}"
  log "Poll interval: ${POLL_INTERVAL}s"
  log "Ticket timeout: ${TICKET_TIMEOUT}s"

  local ticket
  local issue
  local agent
  local branch

  for ticket in "${TICKETS[@]}"; do
    IFS=':' read -r issue agent branch <<< "$ticket"
    run_ticket "$issue" "$agent" "$branch"
  done

  log ""
  log "Catch-up run complete"
  log "Completed: ${TOTAL_COMPLETED}"
  log "Skipped: ${TOTAL_SKIPPED}"
  log "Timed out: ${TOTAL_TIMEOUTS}"
  log "Failed: ${TOTAL_FAILED}"
}

main "$@"
