---
id: TASK-007
title: Build CLI query commands
status: done
archive:
  archivedAt: 2026-07-07T02:20:00.142Z
  originalPath: .planfs/tasks/TASK-007.md
priority: high
assignee: justin
epic: EPIC-mvp-core
milestone: MILESTONE-v0-1
dependsOn:
  - TASK-002
  - TASK-003
tags:
  - cli
  - phase-1
dueDate: 2026-06-15
refinementState: ready
backlogOrder: 60
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-07-07T02:20:00.142Z
---

Provide command-line access for validation and querying.

## Acceptance Criteria

- [x] `planfs validate` validates a repository
- [x] `planfs list tasks` lists tasks
- [x] `planfs list` supports filters for status, assignee, and epic
- [x] `planfs show TASK-001` displays entity details
- [x] Table and JSON output modes are available where expected
- [x] CLI yargs parser executes commands from the built binary
