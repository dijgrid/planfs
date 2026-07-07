---
id: TASK-003
title: Implement repository validation pipeline
status: done
archive:
  archivedAt: 2026-07-07T02:20:00.142Z
  originalPath: .planfs/tasks/TASK-003.md
priority: critical
assignee: justin
epic: EPIC-mvp-core
milestone: MILESTONE-v0-1
dependsOn:
  - TASK-002
tags:
  - core
  - validation
  - phase-1
dueDate: 2026-06-15
refinementState: ready
backlogOrder: 20
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-07-07T02:20:00.142Z
---

Validate individual entities and repository-wide constraints.

## Acceptance Criteria

- [x] Required fields are checked
- [x] Status and priority enums are checked
- [x] Epic, milestone, and dependency references are checked
- [x] Duplicate IDs are reported
- [x] Circular dependencies are detected without false positives for shared dependencies
- [x] Validation results include severity and useful messages
