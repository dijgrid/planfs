---
id: TASK-047
title: Add board swimlanes and grouping modes
status: todo
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
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
---

Add board grouping modes so the same task set can be scanned by ownership, delivery structure, or priority while retaining status context.

## Acceptance Criteria

- [ ] Board can group visible tasks by epic, milestone, assignee, priority, or no grouping
- [ ] Grouped views preserve existing status columns within each swimlane
- [ ] Saved filters and free-text filters apply before grouping
- [ ] Empty groups are suppressed unless they provide useful planning context
- [ ] Group headers show counts and enough metadata to identify the epic, milestone, assignee, or priority
- [ ] Layout remains readable for repositories with many groups and tasks
- [ ] Tests cover grouping by each supported dimension and interaction with saved filters
