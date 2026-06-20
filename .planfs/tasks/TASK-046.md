---
id: TASK-046
title: Add board card quick actions
status: done
priority: medium
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-011
  - TASK-045
tags:
  - vscode
  - board
  - actions
dueDate: 2026-08-28
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
refinementState: ready
backlogOrder: 20
---

Add focused card actions for common board workflows so users do not need to manually edit files for simple transitions.

## Acceptance Criteria

- [x] Cards expose focused workflow actions for start work, mark ready for review, and mark done
- [x] Cards can be selected directly by clicking or keyboard activation without a Details button
- [x] The details panel exposes utility actions to open Markdown, open the structured editor, and copy the task ID
- [x] Actions use the existing save path and preserve human-readable Markdown output
- [x] Actions are hidden or disabled when they do not apply to the current task status
- [x] Quick actions can be used with keyboard focus, not only mouse hover
- [x] Failed writes show actionable VS Code error messages and refresh the board back to disk state
- [x] Tests cover each supported action and invalid-state handling

## Implementation Notes

- Added card-level quick actions for moving tasks through common workflow transitions.
- Moved utility actions for opening the structured editor, opening Markdown, and copying task IDs into the details panel to keep cards lighter.
- Kept drag-and-drop status moves flexible while adding guarded quick-action transitions for start work, ready for review, and done.
- Added VS Code tests for action rendering, clipboard writes, valid quick transitions, and invalid transition errors.
