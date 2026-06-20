---
id: TASK-036
title: Build epic-scoped task query support for editors
status: done
priority: high
assignee: justin
epic: EPIC-visual-planning-experience
milestone: MILESTONE-visual-planning
dependsOn:
  - TASK-030
tags:
  - editor
  - vscode
  - epic
dueDate: 2026-06-19
createdAt: 2026-06-19T00:00:00Z
updatedAt: 2026-06-19T20:08:35Z
---

Provide the structured editor with reliable access to the tasks associated with the epic being viewed.

## Acceptance Criteria

- [x] Epic editor can load all tasks whose `epic` field matches the active epic
- [x] Tasks are grouped by status using the existing task status model
- [x] Task ordering is stable and useful within each status group
- [x] Missing or stale epic references are handled gracefully
- [x] Tests cover epic-scoped task lookup and grouping behavior
