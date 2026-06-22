---
id: TASK-049
title: Add board bulk selection and action surface
status: done
archive:
  archivedAt: 2026-06-22T06:08:51.853Z
  originalPath: .planfs/tasks/TASK-049.md
priority: medium
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-024
  - TASK-047
tags:
  - vscode
  - board
  - bulk
dueDate: 2026-09-18
refinementState: ready
backlogOrder: 50
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-22T06:08:51.853Z
---

Expose bulk task updates on the board once shared bulk update behavior exists, so users can change groups of visible tasks without editing many files one by one.

## Acceptance Criteria

- [x] Users can select multiple board cards across columns and swimlanes
- [x] Bulk actions support status, assignee, tag, epic, milestone, and priority updates using the shared bulk update workflow
- [x] Board previews the number of affected tasks before writing files
- [x] Conflicts or validation failures are shown before partial writes occur
- [x] Selection can be cleared quickly and is reset safely after disk refreshes
- [x] Bulk actions preserve readable Markdown output and do not rewrite unrelated task content
- [x] Tests cover multi-select behavior, successful bulk updates, validation failures, and refresh behavior

## Implementation Notes

- Added opt-in card selection with a compact bulk action bar that appears only when tasks are selected.
- Bulk actions support status, assignee, tag, epic, milestone, and priority updates through the extension host, with an affected-task confirmation before writes.
- Bulk updates validate the in-memory repository before saving any task files, then write through the existing PlanFS serializer and clear selection after success.
