#!/bin/bash
# launch-wave.sh — Launch a wave of parallel Ralph instances in tmux
#
# Usage: ./scripts/launch-wave.sh <wave_number>
# Example: ./scripts/launch-wave.sh 1

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WAVE=$1

if [[ -z "$WAVE" ]]; then
  echo "Usage: $0 <wave_number>"
  echo ""
  echo "Waves:"
  echo "  0  — Foundation (sequential, run manually)"
  echo "  1  — UI Components (7 parallel)"
  echo "  2  — Layout Shell (3 tickets)"
  echo "  3  — Static Pages + SEO (6 parallel)"
  echo "  4  — Responsive Audit (1 ticket)"
  echo "  5  — Sanity Schemas (8 parallel)"
  echo "  6  — CMS Pages (10 parallel)"
  echo "  7  — Auth Stack (8 tickets, semi-serial)"
  echo "  8a — Contact Form (2 tickets)"
  echo "  8b — Events + Calendar (4 tickets)"
  echo "  8c — Announcements (4 tickets)"
  echo "  8d — Newsletter (3 tickets)"
  echo "  9  — SEO + Performance (5 parallel)"
  echo "  10 — Final Audit (2 tickets)"
  exit 1
fi

# Define tickets per wave: "issue:agent:branch"
declare -a TICKETS

case "$WAVE" in
  1)
    SESSION_NAME="wave1-components"
    TICKETS=(
      "32:frontend:P1-01-gold-divider"
      "33:frontend:P1-02-button"
      "34:frontend:P1-03-card"
      "35:frontend:P1-04-section-header"
      "36:frontend:P1-05-page-hero"
      "37:frontend:P1-06-scroll-reveal"
      "38:frontend:P1-07-barrel-exports"
    )
    ;;
  2)
    SESSION_NAME="wave2-layout"
    TICKETS=(
      "39:frontend:P1-08-navbar"
      "40:frontend:P1-09-footer"
      "41:frontend:P1-10-public-layout"
    )
    ;;
  3)
    SESSION_NAME="wave3-pages"
    TICKETS=(
      "42:frontend:P1-11-homepage"
      "43:frontend:P1-12-about"
      "44:frontend:P1-13-first-time"
      "45:frontend:P1-14-giving"
      "46:fullstack:P1-15-json-ld"
      "47:fullstack:P1-16-metadata"
    )
    ;;
  4)
    SESSION_NAME="wave4-audit"
    TICKETS=(
      "48:reviewer:P1-17-responsive-audit"
    )
    ;;
  5)
    SESSION_NAME="wave5-sanity"
    TICKETS=(
      "49:sanity:P2-01-image-pipeline"
      "50:sanity:P2-02-page-content"
      "51:sanity:P2-03-spiritual-leader"
      "52:sanity:P2-04-clergy"
      "53:sanity:P2-05-office-bearer"
      "54:sanity:P2-06-organization"
      "55:sanity:P2-07-useful-link"
      "56:sanity:P2-08-acolytes-choir"
    )
    ;;
  6)
    SESSION_NAME="wave6-cms-pages"
    TICKETS=(
      "64:frontend:P2-16-privacy-policy"
      "65:frontend:P2-17-terms-of-use"
      "66:frontend:P2-18-spiritual-leaders"
      "67:frontend:P2-19-our-clergy"
      "68:frontend:P2-20-office-bearers"
      "69:frontend:P2-21-our-organizations"
      "70:frontend:P2-22-useful-links"
      "71:frontend:P2-23-acolytes-choir"
      "72:fullstack:P2-24-isr-webhook"
      "73:fullstack:P2-25-og-tags"
    )
    ;;
  7)
    SESSION_NAME="wave7-auth"
    TICKETS=(
      "74:supabase:P3-01-profiles-table"
      "75:supabase:P3-02-auth-trigger"
      "76:fullstack:P3-03-login-page"
      "77:fullstack:P3-04-auth-middleware"
      "78:frontend:P3-05-admin-layout"
      "79:frontend:P3-06-dashboard"
      "80:fullstack:P3-07-logout"
      "81:supabase:P3-08-seed-admin"
    )
    ;;
  8a)
    SESSION_NAME="wave8a-contact"
    TICKETS=(
      "83:fullstack:4a-02-contact-action"
      "84:frontend:4a-03-contact-page"
    )
    ;;
  8b)
    SESSION_NAME="wave8b-events"
    TICKETS=(
      "85:supabase:4b-01-events-schema"
      "86:fullstack:4b-02-events-crud"
      "87:frontend:4b-03-calendar-page"
      "88:fullstack:4b-04-event-detail"
    )
    ;;
  8c)
    SESSION_NAME="wave8c-announcements"
    TICKETS=(
      "89:supabase:4c-01-announcements-schema"
      "90:fullstack:4c-02-announcements-crud"
      "91:frontend:4c-03-announcements-feed"
      "92:supabase:4c-04-email-broadcast"
    )
    ;;
  8d)
    SESSION_NAME="wave8d-newsletter"
    TICKETS=(
      "93:fullstack:4d-01-subscribers"
      "94:frontend:4d-02-signup-form"
      "95:fullstack:4d-03-resend-audiences"
    )
    ;;
  9)
    SESSION_NAME="wave9-seo"
    TICKETS=(
      "96:fullstack:5-01-vercel-analytics"
      "97:fullstack:5-02-lighthouse-ci"
      "98:fullstack:5-03-dynamic-og"
      "99:fullstack:5-04-schema-org"
      "100:reviewer:5-05-wcag-audit"
    )
    ;;
  10)
    SESSION_NAME="wave10-final"
    TICKETS=(
      "101:reviewer:5-06-core-web-vitals"
      "104:reviewer:6-02-smoke-test"
    )
    ;;
  *)
    echo "Unknown wave: $WAVE"
    echo "Use waves: 1, 2, 3, 4, 5, 6, 7, 8a, 8b, 8c, 8d, 9, 10"
    exit 1
    ;;
esac

echo "=== Launching Wave ${WAVE}: ${SESSION_NAME} ==="
echo "Tickets: ${#TICKETS[@]}"
echo ""

# Kill existing tmux session if it exists
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Create worktrees for all tickets first
for ticket in "${TICKETS[@]}"; do
  IFS=':' read -r issue agent branch <<< "$ticket"
  "$REPO_ROOT/scripts/generate-worktree.sh" "$issue" "$agent" "$branch"
  echo ""
done

# Create tmux session with first ticket
FIRST_TICKET="${TICKETS[0]}"
IFS=':' read -r issue agent branch <<< "$FIRST_TICKET"
FIRST_WORKTREE="${REPO_ROOT}/../stbasils-worktrees/${branch}"

tmux new-session -d -s "$SESSION_NAME" -n "P-${issue}" -c "$FIRST_WORKTREE"
tmux send-keys -t "$SESSION_NAME:P-${issue}" "ralph" Enter

# Create windows for remaining tickets
for ticket in "${TICKETS[@]:1}"; do
  IFS=':' read -r issue agent branch <<< "$ticket"
  WORKTREE="${REPO_ROOT}/../stbasils-worktrees/${branch}"
  tmux new-window -t "$SESSION_NAME" -n "P-${issue}" -c "$WORKTREE"
  tmux send-keys -t "$SESSION_NAME:P-${issue}" "ralph" Enter
done

echo "=== Wave ${WAVE} launched ==="
echo "tmux session: ${SESSION_NAME}"
echo ""
echo "To attach:    tmux attach -t ${SESSION_NAME}"
echo "To monitor:   tmux list-windows -t ${SESSION_NAME}"
echo "To kill:      tmux kill-session -t ${SESSION_NAME}"
