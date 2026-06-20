---
id: TASK-058
title: Collapse terminal board states
status: done
priority: high
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-047
tags:
  - vscode
  - board
  - ux
dueDate: 2026-09-06
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
refinementState: ready
backlogOrder: 80
---

Limit the visual weight of terminal board states so completed work does not crowd out active planning. Done and other terminal-like groups should remain available for reference without dominating the board.

## Acceptance Criteria

- [x] Done columns show a limited number of recent or relevant cards by default
- [x] Users can expand a terminal column or swimlane column to see all hidden tasks
- [x] Collapsed terminal-state counts clearly show how many tasks are hidden
- [x] The behavior works in ungrouped Status Board mode and grouped swimlane mode
- [x] Next Work mode suppresses or limits terminal tasks consistently with its workflow goals
- [x] Filtering and saved filters still apply before terminal-state limiting
- [x] Drag-and-drop and quick actions continue to work for visible terminal-state cards
- [x] Tests cover collapsed Done columns, expansion, grouped swimlanes, and filter interaction

## Implementation Notes

- Done columns now show a limited preview by default and include hidden counts with Show all / Show fewer controls.
- Expansion state is tracked per terminal column, including grouped swimlane columns, so one swimlane's Done column can expand without expanding every Done column.
- Filtering and saved filters still run before terminal-state limiting, and Next Work continues to suppress completed tasks.
