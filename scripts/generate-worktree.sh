#!/bin/bash
# generate-worktree.sh — Create a git worktree with Ralph config for a single ticket
#
# Usage: ./scripts/generate-worktree.sh <issue_number> <agent_type> <branch_suffix>
# Example: ./scripts/generate-worktree.sh 32 frontend P1-01-gold-divider

set -e

ISSUE=$1
AGENT=$2
BRANCH=$3

if [[ -z "$ISSUE" || -z "$AGENT" || -z "$BRANCH" ]]; then
  echo "Usage: $0 <issue_number> <agent_type> <branch_suffix>"
  echo "Example: $0 32 frontend P1-01-gold-divider"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_DIR="${REPO_ROOT}/../stbasils-worktrees/${BRANCH}"

echo "Creating worktree: ${WORKTREE_DIR}"
echo "  Branch: feat/${BRANCH}"
echo "  Issue: #${ISSUE}"
echo "  Agent: ${AGENT}"

# Create worktree from main
git -C "$REPO_ROOT" worktree add "$WORKTREE_DIR" -b "feat/${BRANCH}" main 2>/dev/null || {
  echo "Branch feat/${BRANCH} may already exist. Trying checkout..."
  git -C "$REPO_ROOT" worktree add "$WORKTREE_DIR" "feat/${BRANCH}" 2>/dev/null || {
    echo "Worktree already exists at ${WORKTREE_DIR}, skipping creation."
  }
}

# Copy .claude/ directory (agent prompts, design system, conventions) into worktree
if [[ -d "${REPO_ROOT}/.claude" ]]; then
  cp -r "${REPO_ROOT}/.claude" "${WORKTREE_DIR}/.claude"
  echo "  Copied .claude/ (agents, docs) into worktree"
fi

# Copy root CLAUDE.md if it exists and worktree doesn't have one
if [[ -f "${REPO_ROOT}/CLAUDE.md" && ! -f "${WORKTREE_DIR}/CLAUDE.md" ]]; then
  cp "${REPO_ROOT}/CLAUDE.md" "${WORKTREE_DIR}/CLAUDE.md"
  echo "  Copied CLAUDE.md into worktree"
fi

# Create .ralph directory in worktree
mkdir -p "${WORKTREE_DIR}/.ralph/specs"

# Generate ticket-specific PROMPT.md
cat > "${WORKTREE_DIR}/.ralph/PROMPT.md" << EOF
# Task: Issue #${ISSUE} — feat/${BRANCH}

You are the **${AGENT}** agent for the St. Basil's church website rebuild.

## Step 1: Read Context
Read these files in order before doing anything else:
1. \`.claude/agents/${AGENT}.md\` — Your role, rules, and patterns
2. \`.claude/docs/design-system.md\` — Design tokens and specs
3. \`.claude/docs/conventions.md\` — Code style and file structure

## Step 2: Read the Ticket
Run: \`gh issue view ${ISSUE} --repo georgenijo/St-Basils-Boston-Web\`
This contains the full requirements, acceptance criteria, and dependencies.

## Step 3: Check Dependencies
If the issue lists dependency tickets, verify their code exists in the codebase.
If dependencies are missing, note it and build what you can.

## Step 4: Build
Implement the feature following the conventions and design system exactly.

## Step 5: Verify
- Run \`npm run build\` to verify TypeScript compiles
- Check for no console errors
- Verify responsive behavior if building UI

## Step 6: Ship
- Stage and commit: \`feat: <description> (#${ISSUE})\`
- Create PR: \`gh pr create --title "feat/${BRANCH}" --body "Implements georgenijo/St-Basils-Boston-Web#${ISSUE}"\`

## Rules
- No Co-Authored-By lines
- No AI/Claude/Anthropic attribution
- Use \`@/\` path alias for all imports
- Follow conventions.md exactly
EOF

# Generate AGENT.md (required by Ralph integrity check)
cat > "${WORKTREE_DIR}/.ralph/AGENT.md" << EOF
# Agent: ${AGENT}

You are the **${AGENT}** agent for the St. Basil's church website rebuild.
See \`.claude/agents/${AGENT}.md\` for your full role definition.
EOF

# Generate claude-opus wrapper (passes --model opus to every invocation)
cat > "${WORKTREE_DIR}/.ralph/claude-opus" << 'WRAPPER'
#!/bin/bash
exec claude --model opus "$@"
WRAPPER
chmod +x "${WORKTREE_DIR}/.ralph/claude-opus"

# Generate .ralphrc at REPO ROOT (required by Ralph integrity check)
cat > "${WORKTREE_DIR}/.ralphrc" << EOF
PROJECT_NAME="stbasils-${BRANCH}"
PROJECT_TYPE="typescript"
CLAUDE_CODE_CMD=".ralph/claude-opus"
MAX_CALLS_PER_HOUR=100
CLAUDE_TIMEOUT_MINUTES=15
CLAUDE_OUTPUT_FORMAT="json"
ALLOWED_TOOLS="Write,Read,Edit,Glob,Grep,Bash"
SESSION_CONTINUITY=true
SESSION_EXPIRY_HOURS=24
CB_NO_PROGRESS_THRESHOLD=3
CB_SAME_ERROR_THRESHOLD=5
EOF

# Generate fix_plan.md
cat > "${WORKTREE_DIR}/.ralph/fix_plan.md" << EOF
# Fix Plan: Issue #${ISSUE} — feat/${BRANCH}

## Tasks
- [ ] Read agent prompt, design system, and conventions
- [ ] Read ticket requirements: \`gh issue view ${ISSUE} --repo georgenijo/St-Basils-Boston-Web\`
- [ ] Implement the feature per acceptance criteria
- [ ] Verify build passes: \`npm run build\`
- [ ] Commit with conventional commit message
- [ ] Create PR to main linking issue #${ISSUE}
EOF

# Also copy .ralphrc into .ralph/ for scripts that look there
cp "${WORKTREE_DIR}/.ralphrc" "${WORKTREE_DIR}/.ralph/.ralphrc"

echo "Worktree ready: ${WORKTREE_DIR}"
echo "  To run: cd ${WORKTREE_DIR} && ralph --monitor"
