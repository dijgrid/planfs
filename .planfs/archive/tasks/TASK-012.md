---
id: TASK-012
title: Add structured entity editors
status: done
archive:
  archivedAt: 2026-06-24T01:55:21.269Z
  originalPath: .planfs/tasks/TASK-012.md
priority: high
assignee: justin
epic: EPIC-phase-2-enhanced
milestone: MILESTONE-phase-2
dependsOn:
  - TASK-005
  - TASK-006
tags:
  - vscode
  - editing
  - phase-2
dueDate: 2026-06-15
refinementState: ready
backlogOrder: 20
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-24T01:55:21.269Z
---

Provide form-based editing for PlanFS entities.

## Acceptance Criteria

- [x] Task editor exposes all task properties
- [x] Epic and milestone editors exist
- [x] Body content remains Markdown
- [x] Related epics, milestones, tags, and dependencies have assisted inputs
- [x] Invalid saves are blocked with clear feedback

## Implementation Notes

- Added `PlanFS: Open Structured Editor` for tasks, epics, and milestones.
- Task editor includes status, priority, assignee, epic, milestone, dependencies, tags, due date, estimate, links, and Markdown body.
- Epic and milestone editors keep Markdown body editing while exposing metadata fields.
- Saves run PlanFS validation and malformed links JSON is blocked client-side.
