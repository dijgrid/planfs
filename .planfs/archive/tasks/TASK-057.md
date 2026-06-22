---
id: TASK-057
title: Make board view switching more prominent
status: done
archive:
  archivedAt: 2026-06-22T06:08:51.853Z
  originalPath: .planfs/tasks/TASK-057.md
priority: high
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-043
tags:
  - vscode
  - board
  - ux
dueDate: 2026-08-23
refinementState: ready
backlogOrder: 70
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-22T06:08:51.853Z
---

Improve the PlanFS board UI so switching between board modes is obvious and intentional. The current dropdown is too easy to miss now that Status Board and Next Work represent meaningfully different workflows.

## Acceptance Criteria

- [x] Board mode switching is more visually prominent than a generic toolbar dropdown
- [x] Status Board and Next Work are presented as clear peer views, such as tabs, segmented controls, or another obvious mode switcher
- [x] The selected board mode is visually apparent at a glance
- [x] The design does not require separate VS Code webview commands unless that tradeoff is explicitly chosen
- [x] Keyboard and screen-reader behavior remains usable
- [x] Board mode persists across refreshes or reopens if local webview state support is already available or easy to add
- [x] Tests cover the new mode switch UI and mode-specific rendering

## Implementation Notes

- Replaced the board mode dropdown with a segmented tab control inside the existing PlanFS Board webview.
- Added arrow-key mode switching, active tab state, and webview state persistence for the selected board mode.
- Updated VS Code webview tests to cover the new mode switch UI.
