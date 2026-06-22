---
id: TASK-045
title: Add board task details drawer
status: done
archive:
  archivedAt: 2026-06-22T06:08:51.853Z
  originalPath: .planfs/tasks/TASK-045.md
priority: high
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-012
  - TASK-030
tags:
  - vscode
  - board
  - editor
dueDate: 2026-08-21
refinementState: ready
backlogOrder: 10
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-22T06:08:51.853Z
---

Add a board-side details drawer so selecting a task reveals enough context to decide and act without immediately opening the Markdown file.

## Acceptance Criteria

- [x] Activating a card Details control opens a details drawer without losing the current board filters
- [x] Drawer shows task title, ID, status, priority, assignee, epic, milestone, tags, due date, estimate, links, dependencies, dependents, and Markdown access
- [x] Drawer provides clear paths to open the Markdown file and structured editor
- [x] Drawer reflects missing or blocked dependency context from shared planning data where available
- [x] Drawer updates when the underlying task file changes on disk
- [x] Board remains usable on narrow VS Code panels without overlapping cards, filters, or drawer content
- [x] Tests cover drawer rendering, selection persistence, refresh behavior, and keyboard access
