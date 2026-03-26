#!/bin/bash
# cleanup-wave.sh — Remove worktrees for a completed wave after PRs are merged
#
# Usage: ./scripts/cleanup-wave.sh <wave_number>
# Example: ./scripts/cleanup-wave.sh 1

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WAVE=$1

if [[ -z "$WAVE" ]]; then
  echo "Usage: $0 <wave_number>"
  exit 1
fi

# Map wave to branch prefixes
declare -a BRANCHES

case "$WAVE" in
  1) BRANCHES=("P1-01-gold-divider" "P1-02-button" "P1-03-card" "P1-04-section-header" "P1-05-page-hero" "P1-06-scroll-reveal" "P1-07-barrel-exports") ;;
  2) BRANCHES=("P1-08-navbar" "P1-09-footer" "P1-10-public-layout") ;;
  3) BRANCHES=("P1-11-homepage" "P1-12-about" "P1-13-first-time" "P1-14-giving" "P1-15-json-ld" "P1-16-metadata") ;;
  4) BRANCHES=("P1-17-responsive-audit") ;;
  5) BRANCHES=("P2-01-image-pipeline" "P2-02-page-content" "P2-03-spiritual-leader" "P2-04-clergy" "P2-05-office-bearer" "P2-06-organization" "P2-07-useful-link" "P2-08-acolytes-choir") ;;
  6) BRANCHES=("P2-16-privacy-policy" "P2-17-terms-of-use" "P2-18-spiritual-leaders" "P2-19-our-clergy" "P2-20-office-bearers" "P2-21-our-organizations" "P2-22-useful-links" "P2-23-acolytes-choir" "P2-24-isr-webhook" "P2-25-og-tags") ;;
  7) BRANCHES=("P3-01-profiles-table" "P3-02-auth-trigger" "P3-03-login-page" "P3-04-auth-middleware" "P3-05-admin-layout" "P3-06-dashboard" "P3-07-logout" "P3-08-seed-admin") ;;
  8a) BRANCHES=("4a-02-contact-action" "4a-03-contact-page") ;;
  8b) BRANCHES=("4b-01-events-schema" "4b-02-events-crud" "4b-03-calendar-page" "4b-04-event-detail") ;;
  8c) BRANCHES=("4c-01-announcements-schema" "4c-02-announcements-crud" "4c-03-announcements-feed" "4c-04-email-broadcast") ;;
  8d) BRANCHES=("4d-01-subscribers" "4d-02-signup-form" "4d-03-resend-audiences") ;;
  9) BRANCHES=("5-01-vercel-analytics" "5-02-lighthouse-ci" "5-03-dynamic-og" "5-04-schema-org" "5-05-wcag-audit") ;;
  10) BRANCHES=("5-06-core-web-vitals" "6-02-smoke-test") ;;
  *) echo "Unknown wave: $WAVE"; exit 1 ;;
esac

WORKTREE_DIR="${REPO_ROOT}/../stbasils-worktrees"

echo "=== Cleaning up Wave ${WAVE} ==="

for branch in "${BRANCHES[@]}"; do
  TREE_PATH="${WORKTREE_DIR}/${branch}"
  if [[ -d "$TREE_PATH" ]]; then
    echo "  Removing worktree: ${branch}"
    git -C "$REPO_ROOT" worktree remove "$TREE_PATH" --force 2>/dev/null || {
      echo "    Force removing directory..."
      rm -rf "$TREE_PATH"
      git -C "$REPO_ROOT" worktree prune
    }
  else
    echo "  Worktree not found: ${branch} (already cleaned?)"
  fi
done

# Clean up empty worktrees directory
rmdir "${WORKTREE_DIR}" 2>/dev/null || true

echo ""
echo "Wave ${WAVE} cleaned up."
