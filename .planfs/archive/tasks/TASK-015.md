---
id: TASK-015
title: Build dependency graph engine
status: done
archive:
  archivedAt: 2026-07-07T02:20:00.121Z
  originalPath: .planfs/tasks/TASK-015.md
priority: high
assignee: justin
epic: EPIC-phase-3-visualization
milestone: MILESTONE-phase-3
dependsOn:
  - TASK-003
tags:
  - graph
  - phase-3
dueDate: 2026-06-15
refinementState: ready
backlogOrder: 10
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-07-07T02:20:00.121Z
---

Model task dependency relationships for analysis and visualization.

## Acceptance Criteria

- [x] Build a dependency graph from all tasks
- [x] Compute direct and transitive dependencies
- [x] Calculate critical path
- [x] Compute task levels from root tasks
- [x] Expose graph APIs from `planfs-core`
