---
id: TASK-049
title: Add board bulk selection and action surface
status: todo
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
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
---

Expose bulk task updates on the board once shared bulk update behavior exists, so users can change groups of visible tasks without editing many files one by one.

## Acceptance Criteria

- [ ] Users can select multiple board cards across columns and swimlanes
- [ ] Bulk actions support status, assignee, tag, epic, milestone, and priority updates using the shared bulk update workflow
- [ ] Board previews the number of affected tasks before writing files
- [ ] Conflicts or validation failures are shown before partial writes occur
- [ ] Selection can be cleared quickly and is reset safely after disk refreshes
- [ ] Bulk actions preserve readable Markdown output and do not rewrite unrelated task content
- [ ] Tests cover multi-select behavior, successful bulk updates, validation failures, and refresh behavior
