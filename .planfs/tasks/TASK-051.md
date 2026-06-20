---
id: TASK-051
title: Add backlog query and ordering APIs
status: todo
priority: high
assignee: justin
epic: EPIC-backlog-management
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-013
  - TASK-050
tags:
  - core
  - backlog
  - ranking
dueDate: 2026-10-02
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
---

Add shared core APIs for finding, grouping, and ordering backlog items consistently across CLI and VS Code.

## Acceptance Criteria

- [ ] Core exposes helpers to list backlog tasks by refinement state, epic, milestone, assignee, priority, tag, and text query
- [ ] Core exposes a stable backlog ordering helper that combines explicit backlog order, priority, due date, target context, and task ID tie-breakers
- [ ] Backlog ordering is separate from next-work ranking and does not imply a task is ready to start
- [ ] Helpers identify tasks missing enough context to be considered ready, such as no body, no priority, no epic or milestone when required by options, or unresolved dependencies
- [ ] Tests cover filtering, ordering, incomplete-item detection, and interaction with saved filters
