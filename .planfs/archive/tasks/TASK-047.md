---
id: TASK-047
title: Add board swimlanes and grouping modes
status: done
archive:
  archivedAt: 2026-06-22T06:08:51.853Z
  originalPath: .planfs/tasks/TASK-047.md
priority: high
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-013
  - TASK-035
tags:
  - vscode
  - board
  - grouping
dueDate: 2026-09-04
refinementState: ready
backlogOrder: 30
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-22T06:08:51.853Z
---

Add board grouping modes so the same task set can be scanned by ownership, delivery structure, or priority while retaining status context.

## Acceptance Criteria

- [x] Board can group visible tasks by epic, milestone, assignee, priority, or no grouping
- [x] Grouped views preserve existing status columns within each swimlane
- [x] Saved filters and free-text filters apply before grouping
- [x] Empty groups are suppressed unless they provide useful planning context
- [x] Group headers show counts and enough metadata to identify the epic, milestone, assignee, or priority
- [x] Layout remains readable for repositories with many groups and tasks
- [x] Tests cover grouping by each supported dimension and interaction with saved filters

## Implementation Notes

- Added a Status Board grouping selector for no grouping, epic, milestone, assignee, and priority.
- Grouped views render as swimlanes, each preserving the existing status columns and filtered task set.
- Grouping runs after saved filters and free-text filters, suppresses empty groups, and persists the selected grouping in webview state.
