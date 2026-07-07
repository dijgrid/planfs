---
id: TASK-032
title: Add interactive dependency highlighting to the graph view
status: done
archive:
  archivedAt: 2026-07-07T02:20:00.123Z
  originalPath: .planfs/tasks/TASK-032.md
priority: high
assignee: justin
epic: EPIC-visual-planning-experience
milestone: MILESTONE-visual-planning
dependsOn:
  - TASK-031
tags:
  - graph
  - vscode
  - interaction
dueDate: 2026-06-19
refinementState: ready
backlogOrder: 30
createdAt: 2026-06-19T00:00:00Z
updatedAt: 2026-07-07T02:20:00.123Z
---

Add graph interactions that make dependency relationships easy to inspect without losing the surrounding project context.

## Acceptance Criteria

- [x] Clicking a task highlights its direct prerequisites and downstream dependents
- [x] A selected task shows enough details to identify status, priority, assignee, epic, and relevant dates
- [x] Indirect dependency paths can be distinguished from direct dependencies
- [x] Selection can be cleared without reloading the view
- [x] Keyboard focus and screen-reader labels support the same inspection workflow
