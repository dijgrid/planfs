---
id: TASK-071
title: Preserve backlog filters after saving edits
status: done
priority: high
assignee: justin
epic: EPIC-backlog-management
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-066
tags:
  - bug
  - vscode
  - backlog
  - filters
  - ux
dueDate: 2026-09-15
refinementState: ready
backlogOrder: 46
createdAt: 2026-06-21T18:44:00Z
updatedAt: 2026-06-21T18:51:34.225Z
---

Fix a backlog view regression where clicking Save after editing a task clears the backlog filter controls.

The backlog view should preserve the user's active filter options and visible task list context after a task edit is saved. Saving metadata changes should refresh the edited task data without resetting the selected saved filter, text filter, grouping, sorting, or other filter controls.

## Acceptance Criteria

- [x] Editing a task in the VS Code backlog view and clicking Save preserves the current backlog filter controls
- [x] The selected saved filter remains selected after save
- [x] Any typed text filter remains populated after save
- [x] Sort and grouping controls remain unchanged after save
- [x] The edited task data refreshes in the list and editor without clearing the user's backlog context
- [x] Tests cover saving a backlog task while filter controls are active

## Notes

- Reproduction: open the backlog view, apply backlog filter options, edit a task, click Save, and observe that the filter controls are cleared.
