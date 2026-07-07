---
id: TASK-008
title: Add CLI task creation
status: done
archive:
  archivedAt: 2026-07-07T02:20:00.142Z
  originalPath: .planfs/tasks/TASK-008.md
priority: high
assignee: justin
epic: EPIC-mvp-core
milestone: MILESTONE-v0-1
dependsOn:
  - TASK-006
  - TASK-007
tags:
  - cli
  - phase-1
dueDate: 2026-06-15
refinementState: ready
backlogOrder: 70
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-07-07T02:20:00.142Z
---

Support task creation from the CLI and keep unsupported creation paths explicit.

## Acceptance Criteria

- [x] `planfs create task` creates a task
- [x] `--title` is required
- [x] Optional status, priority, and assignee values are accepted
- [x] Repositories are initialized when needed
- [x] `create epic` and `create milestone` are rejected until implemented
