---
id: TASK-014
title: Add Git-aware planning helpers
status: done
priority: medium
assignee: justin
epic: EPIC-phase-2-enhanced
milestone: MILESTONE-phase-2
dependsOn:
  - TASK-007
tags:
  - git
  - phase-2
dueDate: 2026-06-15
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-15T00:00:00Z
refinementState: ready
backlogOrder: 40
---

Start connecting planning artifacts to branch and commit workflows.

## Acceptance Criteria

- [x] Extract task IDs from branch names
- [x] Show tasks related to the current branch
- [x] Suggest task IDs for commit messages
- [x] Validate commit message task references

## Implementation Notes

- Branch context is available through `planfs branch` and the VS Code Insights Branch tab.
- Commit message suggestions are available through `planfs git commit-message`.
- Commit message reference validation is available through `planfs git validate-message`.
- Provider-backed pull request integration remains tracked by Phase 4 tasks.
