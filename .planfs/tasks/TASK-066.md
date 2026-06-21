---
id: TASK-066
title: Redesign backlog view around browse-and-edit workflow
status: done
priority: high
assignee: justin
epic: EPIC-backlog-management
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-012
  - TASK-051
  - TASK-053
tags:
  - vscode
  - backlog
  - editor
  - ux
dueDate: 2026-09-14
createdAt: 2026-06-21T00:00:00Z
updatedAt: 2026-06-21T12:00:00Z
refinementState: ready
backlogOrder: 45
---

Redesign the VS Code backlog view as a browse-and-edit workflow for available work.

The view should help users scan a sorted, filtered list of backlog items while editing the selected item in place. The right side should remain a card list using the existing backlog settings for sorting, grouping, and filtering. The left side should show a focused card editor similar to the PlanFS structured editor so users can refine work without leaving the backlog context.

## Acceptance Criteria

- [x] Backlog view uses a two-panel layout with a selected-item editor on the left and backlog card list on the right
- [x] The right panel presents backlog items as cards sorted and filtered by the existing backlog settings
- [x] Selecting a backlog card updates the editor panel without navigating away from the backlog view
- [x] Editor panel supports common task metadata edits including title, status, priority, assignee, refinement state, epic, milestone, tags, and due date
- [x] Editor panel follows the PlanFS Editor direction: structured fields first, with Markdown body editing handled by opening the Markdown file
- [x] Acceptance Criteria and Questions are rendered when present so users can refine task details while browsing
- [x] Unsaved edits, validation errors, and file refreshes are handled clearly
- [x] Empty, no-selection, and filtered-empty states are useful without adding visual clutter
- [x] Tests or extension coverage verify selection, sorting/filtering behavior, editor saves, validation failures, and refresh behavior

## Questions

- [x] Should the backlog card list live on the right by default for consistency with the current view, or should users be able to swap panel sides? **Yes being able to move around the panel is good, I agree.**
- [x] Should the editor autosave field changes, require an explicit save, or support both? **I think a save button which enables after edits have been made to the view.**
- [x] Should the card list group by refinement state by default, or use a flat sorted list unless grouping is selected? **I think by default the view should just show the backlog ordered by backlog order**
- [x] Should keyboard navigation through the card list automatically update the editor selection? **Yes!**
- [x] Should the backlog editor reuse the same component as the PlanFS structured editor, or use a smaller backlog-specific editor wrapper? **I think the same editor would be preferrable.  This would imply the save behavior changes also apply to the PlanFS Editor as well.**
