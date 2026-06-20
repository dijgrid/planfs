---
id: TASK-052
title: Add backlog CLI workflows
status: done
priority: medium
assignee: justin
epic: EPIC-backlog-management
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-051
tags:
  - cli
  - backlog
dueDate: 2026-10-09
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
refinementState: needs-refinement
backlogOrder: 30
---

Add CLI commands for backlog intake, review, and refinement so backlog management works outside VS Code.

## Acceptance Criteria

- [x] `planfs backlog list` shows backlog items with refinement state, priority, assignee, epic, milestone, and short context
- [x] `planfs backlog list` supports filters for refinement state, assignee, epic, milestone, priority, tag, and text query
- [x] CLI supports marking a backlog item ready, deferred, discarded, or needing refinement
- [x] CLI supports creating a captured backlog item with minimal required input
- [x] CLI can show incomplete or stale backlog items for review
- [x] Output is readable in plain terminals and avoids implying unsupported board interactions
- [x] CLI tests cover listing, filtering, refinement-state updates, captured item creation, and empty-result messaging
