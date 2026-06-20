---
id: TASK-043
title: Add Next Work mode to the VS Code board
status: todo
priority: critical
assignee: justin
epic: EPIC-next-work-planning
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-040
tags:
  - vscode
  - board
  - planning
  - next-work
dueDate: 2026-07-31
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
---

Add a board mode focused on recommending and acting on the next useful work instead of only showing status columns.

## Acceptance Criteria

- [ ] Board includes a Next Work mode alongside the existing status board
- [ ] Next Work mode groups tasks into Ready Now, In Progress, Needs Review, Blocked, and Later
- [ ] Ready Now cards are ranked by the shared core next-work candidate API
- [ ] Cards show concise reason badges such as ready, blocked by task ID, high priority, critical path, due soon, overdue, and unblocks downstream work
- [ ] Existing saved filters and free-text filtering can scope Next Work mode
- [ ] Users can start a ready task from the board by moving it to `in-progress`
- [ ] Blocked cards explain the blocking dependencies without requiring the user to open the Markdown file
- [ ] Board tests cover mode switching, grouping, ranking display, blocked explanations, and status updates
