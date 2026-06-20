---
id: TASK-056
title: Remove Markdown body preview from board details drawer
status: done
priority: medium
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-045
tags:
  - vscode
  - board
  - editor
dueDate: 2026-08-22
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
---

Simplify the board details drawer by removing the Markdown body preview. Users who want to read or edit the Markdown body should use the existing Open Markdown action instead.

## Acceptance Criteria

- [x] Board details drawer no longer renders the task body or Markdown preview
- [x] Drawer keeps the Open Markdown action visible and clearly available
- [x] Drawer still shows task metadata, next-work reasons, dependencies, dependents, links, and editor actions
- [x] Tests cover the absence of the body preview and the continued Open Markdown action
- [x] VS Code documentation or release notes mention that rich Markdown editing stays in the Markdown file, not the board drawer, if relevant
