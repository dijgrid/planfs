---
id: TASK-030
title: Define shared visual planning view model
status: done
archive:
  archivedAt: 2026-07-07T02:20:00.123Z
  originalPath: .planfs/tasks/TASK-030.md
priority: high
assignee: justin
epic: EPIC-visual-planning-experience
milestone: MILESTONE-visual-planning
dependsOn:
  - TASK-012
  - TASK-016
  - TASK-017
tags:
  - vscode
  - visualization
  - planning
dueDate: 2026-06-19
refinementState: ready
backlogOrder: 10
createdAt: 2026-06-19T00:00:00Z
updatedAt: 2026-07-07T02:20:00.123Z
---

Define a shared data shape for VS Code visual planning views so graph, timeline, and epic editor surfaces use the same task, epic, milestone, dependency, and schedule facts.

## Acceptance Criteria

- [x] View model includes epics, tasks, milestones, dependencies, status, priority, assignee, target dates, due dates, and body summaries where useful
- [x] Dependency direction is explicit and documented for graph and highlighting behavior
- [x] Missing, circular, and cross-epic dependencies are represented without crashing views
- [x] Existing core repository APIs remain the source of truth for parsed PlanFS data
- [x] Unit tests cover model construction for common and malformed dependency cases
