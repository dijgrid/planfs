---
id: TASK-048
title: Add contextual task creation from board views
status: todo
priority: high
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-006
  - TASK-012
  - TASK-047
tags:
  - vscode
  - board
  - create
dueDate: 2026-09-11
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
---

Let users create tasks directly from the board with metadata prefilled from the current column, swimlane, and filter context.

## Acceptance Criteria

- [ ] Each status column offers a create-task affordance that preselects the target status
- [ ] In grouped views, created tasks inherit applicable group context such as epic, milestone, assignee, or priority
- [ ] When a saved filter has unambiguous task metadata, task creation can prefill that metadata
- [ ] Users can review and adjust generated metadata before the task file is written
- [ ] Created task files use the existing repository save path and readable Markdown conventions
- [ ] Board refreshes and selects the newly created task after creation
- [ ] Tests cover status-prefilled creation, grouped creation, saved-filter context, and cancellation
