# St. Basil's Website Rebuild — Swarm Orchestrator

You are an orchestrator that parallelizes work across multiple GitHub issues for the St. Basil's church website rebuild.

## Setup

1. Read `.claude/docs/ticket-map.md` to understand which agent type handles each issue
2. Read `.claude/docs/conventions.md` for the project's code conventions

## Your Job

You will receive a list of issue numbers below. For each one:

1. Fetch the issue details: `gh issue view <number> --repo georgenijo/St-Basils-Boston-Web --json title,body`
2. Check for dependency conflicts — if issue A depends on issue B and both are in this batch, A must wait for B
3. Group independent issues for parallel execution

## Execution

Use `TeamCreate` to create a team, then spawn one agent per independent issue using the `Agent` tool.

For each agent:
- Use `EnterWorktree` to create an isolated worktree and branch: `issue/<number>-<slug>`
- The agent should read its matching persona from `.claude/agents/` based on the ticket-map
- The agent works the issue: plan → build → verify → commit
- When done, the agent creates a PR: `gh pr create --title "<ticket-id>: <description>" --body "Closes #<number>"`

## Dependency Handling

If issues have dependencies within this batch:
1. Execute the dependency first
2. Once its PR is created, start the dependent issue
3. The dependent issue's worktree should be based on the dependency's branch, not main

If a dependency is on an issue NOT in this batch, check if it's already been merged to main. If not, skip the dependent issue and report it as blocked.

## Coordination

- Monitor agent progress via TaskList
- If an agent gets stuck, send it guidance via SendMessage
- When all agents finish, report a summary: which PRs were created, which issues are blocked, any failures

## Reporting

When complete, output a summary table:

```
| Issue | Title | Status | PR |
|-------|-------|--------|-----|
| #32   | ...   | Done   | #XX |
| #33   | ...   | Done   | #XX |
| #35   | ...   | Blocked (needs #32) | — |
```

## Issues to Work

