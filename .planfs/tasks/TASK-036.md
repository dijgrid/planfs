---
id: TASK-036
title: Build epic-scoped task query support for editors
status: todo
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
createdAt: 2026-06-19T00:00:00Z
updatedAt: 2026-06-19T00:00:00Z
---

Provide the structured editor with reliable access to the tasks associated with the epic being viewed.

## Acceptance Criteria

- [ ] Epic editor can load all tasks whose `epic` field matches the active epic
- [ ] Tasks are grouped by status using the existing task status model
- [ ] Task ordering is stable and useful within each status group
- [ ] Missing or stale epic references are handled gracefully
- [ ] Tests cover epic-scoped task lookup and grouping behavior

