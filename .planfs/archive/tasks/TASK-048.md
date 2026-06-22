---
id: TASK-048
title: Add contextual task creation from board views
status: done
archive:
  archivedAt: 2026-06-22T06:08:51.853Z
  originalPath: .planfs/tasks/TASK-048.md
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
refinementState: ready
backlogOrder: 40
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-22T06:08:51.853Z
---

Let users create tasks directly from the board with metadata prefilled from the current column, swimlane, and filter context.

## Acceptance Criteria

- [x] Each status column offers a create-task affordance that preselects the target status
- [x] In grouped views, created tasks inherit applicable group context such as epic, milestone, assignee, or priority
- [x] When a saved filter has unambiguous task metadata, task creation can prefill that metadata
- [x] Users can review and adjust generated metadata before the task file is written
- [x] Created task files use the existing repository save path and readable Markdown conventions
- [x] Board refreshes and selects the newly created task after creation
- [x] Tests cover status-prefilled creation, grouped creation, saved-filter context, and cancellation

## Implementation Notes

- Added create buttons to Status Board columns with status-prefilled context.
- Grouped board columns merge saved-filter metadata, swimlane metadata, and column status before prompting for review.
- Creation prompts for a title, lets users review comma-separated metadata, saves through the existing PlanFS repository path, refreshes the board, and selects the new task.
