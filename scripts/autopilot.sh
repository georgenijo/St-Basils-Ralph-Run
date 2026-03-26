#!/bin/bash
# autopilot.sh — Run all waves in cmux, fully visual, one command
#
# Each agent launches in its own cmux workspace — click to watch.
# Autopilot merges PRs, cleans up, and advances automatically.
#
# Usage:
#   ./scripts/autopilot.sh              # Start from Wave 0
#   ./scripts/autopilot.sh 3            # Resume from Wave 3

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_BASE="${REPO_ROOT}/../stbasils-worktrees"
LOG_DIR="${REPO_ROOT}/.ralph/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/autopilot-$(date '+%Y%m%d-%H%M%S').log"

POLL_INTERVAL="${POLL_INTERVAL:-30}"
WAVE_TIMEOUT="${WAVE_TIMEOUT:-2400}"
TICKET_TIMEOUT="${TICKET_TIMEOUT:-1800}"
START_WAVE="${1:-0}"

CODING_WAVES=(0 1 2 3 4 5 6 7 8a 8b 8c 8d 9 10)

TOTAL_MERGED=0
TOTAL_FAILED=0
declare -a FAILED_TICKETS=()

# Track cmux workspace IDs for cleanup
declare -a ACTIVE_WORKSPACES=()

# ─── Helpers ────────────────────────────────────────────────

log() {
  local msg="[$(date '+%H:%M:%S')] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}

get_wave_label() {
  case "$1" in
    0)  echo "Foundation" ;;
    1)  echo "UI Components" ;;
    2)  echo "Layout Shell" ;;
    3)  echo "Static Pages" ;;
    4)  echo "Responsive Audit" ;;
    5)  echo "Sanity Schemas" ;;
    6)  echo "CMS Pages" ;;
    7)  echo "Auth Stack" ;;
    8a) echo "Contact Form" ;;
    8b) echo "Events" ;;
    8c) echo "Announcements" ;;
    8d) echo "Newsletter" ;;
    9)  echo "SEO + Perf" ;;
    10) echo "Final Audit" ;;
  esac
}

get_wave_tickets() {
  case "$1" in
    0) echo "22:fullstack:P0-01-init-nextjs 23:frontend:P0-02-tailwind-config 25:supabase:P0-04-supabase-client 26:sanity:P0-05-sanity-init 27:sanity:P0-06-groq-client 29:fullstack:P0-08-tooling 24:fullstack:P0-03-route-scaffold 30:fullstack:P0-09-redirects 31:fullstack:P0-10-sitemap-robots" ;;
    1) echo "32:frontend:P1-01-gold-divider 33:frontend:P1-02-button 34:frontend:P1-03-card 35:frontend:P1-04-section-header 36:frontend:P1-05-page-hero 37:frontend:P1-06-scroll-reveal 38:frontend:P1-07-barrel-exports" ;;
    2) echo "39:frontend:P1-08-navbar 40:frontend:P1-09-footer 41:frontend:P1-10-public-layout" ;;
    3) echo "42:frontend:P1-11-homepage 43:frontend:P1-12-about 44:frontend:P1-13-first-time 45:frontend:P1-14-giving 46:fullstack:P1-15-json-ld 47:fullstack:P1-16-metadata" ;;
    4) echo "48:reviewer:P1-17-responsive-audit" ;;
    5) echo "49:sanity:P2-01-image-pipeline 50:sanity:P2-02-page-content 51:sanity:P2-03-spiritual-leader 52:sanity:P2-04-clergy 53:sanity:P2-05-office-bearer 54:sanity:P2-06-organization 55:sanity:P2-07-useful-link 56:sanity:P2-08-acolytes-choir" ;;
    6) echo "64:frontend:P2-16-privacy-policy 65:frontend:P2-17-terms-of-use 66:frontend:P2-18-spiritual-leaders 67:frontend:P2-19-our-clergy 68:frontend:P2-20-office-bearers 69:frontend:P2-21-our-organizations 70:frontend:P2-22-useful-links 71:frontend:P2-23-acolytes-choir 72:fullstack:P2-24-isr-webhook 73:fullstack:P2-25-og-tags" ;;
    7) echo "74:supabase:P3-01-profiles-table 75:supabase:P3-02-auth-trigger 76:fullstack:P3-03-login-page 77:fullstack:P3-04-auth-middleware 78:frontend:P3-05-admin-layout 79:frontend:P3-06-dashboard 80:fullstack:P3-07-logout 81:supabase:P3-08-seed-admin" ;;
    8a) echo "83:fullstack:4a-02-contact-action 84:frontend:4a-03-contact-page" ;;
    8b) echo "85:supabase:4b-01-events-schema 86:fullstack:4b-02-events-crud 87:frontend:4b-03-calendar-page 88:fullstack:4b-04-event-detail" ;;
    8c) echo "89:supabase:4c-01-announcements-schema 90:fullstack:4c-02-announcements-crud 91:frontend:4c-03-announcements-feed 92:supabase:4c-04-email-broadcast" ;;
    8d) echo "93:fullstack:4d-01-subscribers 94:frontend:4d-02-signup-form 95:fullstack:4d-03-resend-audiences" ;;
    9) echo "96:fullstack:5-01-vercel-analytics 97:fullstack:5-02-lighthouse-ci 98:fullstack:5-03-dynamic-og 99:fullstack:5-04-schema-org 100:reviewer:5-05-wcag-audit" ;;
    10) echo "101:reviewer:5-06-core-web-vitals 104:reviewer:6-02-smoke-test" ;;
  esac
}

pr_exists() {
  # Check open PRs
  gh pr list --repo georgenijo/St-Basils-Ralph-Run \
    --head "feat/$1" --json number --jq '.[0].number' 2>/dev/null | grep -q . && return 0
  # Check merged PRs
  gh pr list --repo georgenijo/St-Basils-Ralph-Run --state merged \
    --head "feat/$1" --json number --jq '.[0].number' 2>/dev/null | grep -q .
}

update_local_main() {
  git -C "$REPO_ROOT" checkout main 2>/dev/null || true
  git -C "$REPO_ROOT" pull origin main 2>/dev/null || true
}

merge_pr() {
  local branch=$1
  local pr_state
  pr_state=$(gh pr view --repo georgenijo/St-Basils-Ralph-Run \
    "feat/${branch}" --json state --jq '.state' 2>/dev/null || echo "NONE")

  case "$pr_state" in
    OPEN)
      log "  Merging feat/${branch}..."
      if gh pr merge --repo georgenijo/St-Basils-Ralph-Run \
           "feat/${branch}" --squash --delete-branch 2>>"$LOG_FILE"; then
        log "  Merged: ${branch}"
        ((TOTAL_MERGED++))
        return 0
      else
        log "  MERGE FAILED: ${branch}"
        ((TOTAL_FAILED++))
        FAILED_TICKETS+=("${branch}")
        return 1
      fi
      ;;
    MERGED)
      log "  Already merged: ${branch}"
      ((TOTAL_MERGED++))
      return 0
      ;;
    *)
      log "  SKIPPED (${pr_state}): ${branch}"
      ((TOTAL_FAILED++))
      FAILED_TICKETS+=("${branch}")
      return 1
      ;;
  esac
}

# ─── cmux helpers ───────────────────────────────────────────

# Launch an agent in its own cmux workspace
# Returns the workspace ID
launch_agent_workspace() {
  local worktree=$1
  local label=$2

  # Create workspace with ralph running directly
  local ws_id
  ws_id=$(cmux new-workspace --cwd "$worktree" --command "ralph" 2>/dev/null | grep -o 'workspace:[0-9]*')

  if [[ -n "$ws_id" ]]; then
    cmux rename-workspace --workspace "$ws_id" "$label" 2>/dev/null
    ACTIVE_WORKSPACES+=("$ws_id")
    echo "$ws_id"
  fi
}

close_agent_workspace() {
  local ws_id=$1
  cmux close-workspace --workspace "$ws_id" 2>/dev/null || true
}

# ─── Wave execution ────────────────────────────────────────

run_wave() {
  local wave=$1
  local label
  label=$(get_wave_label "$wave")
  local tickets_str
  tickets_str=$(get_wave_tickets "$wave")
  local tickets
  read -ra tickets <<< "$tickets_str"

  local is_sequential=false
  [[ "$wave" == "0" ]] && is_sequential=true

  log ""
  log "══════════════════════════════════════════"
  log "  Wave ${wave}: ${label} (${#tickets[@]} tickets)"
  log "══════════════════════════════════════════"

  ACTIVE_WORKSPACES=()

  if [[ "$is_sequential" == "true" ]]; then
    # Wave 0: one agent at a time — create worktree AFTER previous merge
    local branches=()
    for i in "${!tickets[@]}"; do
      local ticket="${tickets[$i]}"
      IFS=':' read -r issue agent branch <<< "$ticket"
      local worktree="${WORKTREE_BASE}/${branch}"
      branches+=("$branch")

      log "── #${issue}: ${branch} (${agent}) ──"

      # Create worktree from CURRENT main (includes previous merges)
      "$REPO_ROOT/scripts/generate-worktree.sh" "$issue" "$agent" "$branch" >> "$LOG_FILE" 2>&1

      # Launch in cmux
      local ws_id
      ws_id=$(launch_agent_workspace "$worktree" "W0 #${issue}: ${branch}")
      log "  Launched in ${ws_id}"

      # Poll for PR or timeout
      local deadline=$(($(date +%s) + TICKET_TIMEOUT))
      while true; do
        if pr_exists "$branch"; then
          log "  PR created for ${branch}"
          cmux notify --title "PR Created" --body "#${issue}: ${branch}" 2>/dev/null
          break
        fi
        if [[ $(date +%s) -gt $deadline ]]; then
          log "  TIMEOUT: ${branch}"
          cmux notify --title "Timeout" --body "#${issue}: ${branch}" 2>/dev/null
          break
        fi
        sleep "$POLL_INTERVAL"
      done

      # Close the workspace
      [[ -n "$ws_id" ]] && close_agent_workspace "$ws_id"

      # Merge
      if pr_exists "$branch"; then
        merge_pr "$branch"
        update_local_main
      else
        log "  NO PR: ${branch}"
        ((TOTAL_FAILED++))
        FAILED_TICKETS+=("${branch}")
      fi

      # Cleanup worktree
      git -C "$REPO_ROOT" worktree remove "${worktree}" --force 2>/dev/null || true
      git -C "$REPO_ROOT" branch -D "feat/${branch}" 2>/dev/null || true
    done

  else
    # Waves 1-10: all agents in parallel — create all worktrees first
    local branches=()
    for ticket in "${tickets[@]}"; do
      IFS=':' read -r issue agent branch <<< "$ticket"
      branches+=("$branch")
      "$REPO_ROOT/scripts/generate-worktree.sh" "$issue" "$agent" "$branch" >> "$LOG_FILE" 2>&1
    done

    log "  Launching ${#tickets[@]} agents..."

    for ticket in "${tickets[@]}"; do
      IFS=':' read -r issue agent branch <<< "$ticket"
      local worktree="${WORKTREE_BASE}/${branch}"
      local ws_id
      ws_id=$(launch_agent_workspace "$worktree" "W${wave} #${issue}: ${branch}")
      log "  #${issue}: ${branch} → ${ws_id}"
    done

    log "  All agents launched"

    # Poll until all PRs exist or timeout
    local deadline=$(($(date +%s) + WAVE_TIMEOUT))
    while true; do
      local found=0
      for branch in "${branches[@]}"; do
        pr_exists "$branch" && ((found++))
      done

      log "  Wave ${wave}: ${found}/${#branches[@]} PRs"

      if [[ $found -eq ${#branches[@]} ]]; then
        log "  All PRs created"
        cmux notify --title "Wave ${wave} Complete" --body "All ${#branches[@]} PRs ready to merge" 2>/dev/null
        break
      fi

      if [[ $(date +%s) -gt $deadline ]]; then
        log "  TIMEOUT: ${found}/${#branches[@]} PRs"
        cmux notify --title "Wave ${wave} Timeout" --body "${found}/${#branches[@]} PRs" 2>/dev/null
        break
      fi

      sleep "$POLL_INTERVAL"
    done

    # Close all agent workspaces
    for ws_id in "${ACTIVE_WORKSPACES[@]+"${ACTIVE_WORKSPACES[@]}"}"; do
      close_agent_workspace "$ws_id"
    done

    # Merge all PRs — retry up to 3 passes since squash merges
    # invalidate other PRs temporarily
    log "  Merging Wave ${wave}..."
    local remaining=("${branches[@]}")
    for pass in 1 2 3; do
      local still_remaining=()
      for branch in "${remaining[@]}"; do
        local state
        state=$(gh pr view --repo georgenijo/St-Basils-Ralph-Run \
          "feat/${branch}" --json state --jq '.state' 2>/dev/null || echo "NONE")
        if [[ "$state" == "MERGED" ]]; then
          log "  Already merged: ${branch}"
          ((TOTAL_MERGED++))
          continue
        fi
        if [[ "$state" != "OPEN" ]]; then
          continue
        fi
        if gh pr merge --repo georgenijo/St-Basils-Ralph-Run \
             "feat/${branch}" --squash --delete-branch 2>>"$LOG_FILE"; then
          log "  Merged: ${branch}"
          ((TOTAL_MERGED++))
          sleep 3  # let GitHub recalculate mergeability
        else
          still_remaining+=("$branch")
        fi
      done
      remaining=("${still_remaining[@]+"${still_remaining[@]}"}")
      [[ ${#remaining[@]} -eq 0 ]] && break
      log "  Pass ${pass}: ${#remaining[@]} remaining, retrying in 10s..."
      sleep 10
    done
    # Log any that still failed
    for branch in "${remaining[@]+"${remaining[@]}"}"; do
      log "  MERGE FAILED after retries: ${branch}"
      ((TOTAL_FAILED++))
      FAILED_TICKETS+=("${branch}")
    done

    update_local_main

    # Cleanup worktrees
    for branch in "${branches[@]}"; do
      git -C "$REPO_ROOT" worktree remove "${WORKTREE_BASE}/${branch}" --force 2>/dev/null || true
      git -C "$REPO_ROOT" branch -D "feat/${branch}" 2>/dev/null || true
    done
    git -C "$REPO_ROOT" worktree prune 2>/dev/null || true
    rm -rf "$WORKTREE_BASE" 2>/dev/null || true
  fi

  cmux notify --title "Wave ${wave} Done" --body "Merged: ${TOTAL_MERGED}, Failed: ${TOTAL_FAILED}" 2>/dev/null
  log "  Wave ${wave} done"
}

# ─── Main ──────────────────────────────────────────────────

log ""
log "AUTOPILOT — St. Basil's Rebuild"
log "Starting from Wave ${START_WAVE} | $(date)"
log ""

started=false
for wave in "${CODING_WAVES[@]}"; do
  if [[ "$started" != "true" ]]; then
    if [[ "$wave" == "$START_WAVE" ]]; then
      started=true
    else
      continue
    fi
  fi

  run_wave "$wave"
done

log ""
log "══════════════════════════════════════════"
log "  AUTOPILOT COMPLETE"
log "  Merged: ${TOTAL_MERGED}  Failed: ${TOTAL_FAILED}"
log "══════════════════════════════════════════"

if [[ ${#FAILED_TICKETS[@]} -gt 0 ]]; then
  log "Failed:"
  for t in "${FAILED_TICKETS[@]}"; do
    log "  - ${t}"
  done
fi

cmux notify --title "Autopilot Complete" --body "Merged: ${TOTAL_MERGED}, Failed: ${TOTAL_FAILED}" 2>/dev/null
log "Log: ${LOG_FILE}"
