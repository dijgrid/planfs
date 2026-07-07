---
id: TASK-087
title: Make board task details panel resizable and dismissible
status: done
priority: medium
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: ready
createdAt: 2026-07-07T03:04:51.954Z
updatedAt: 2026-07-07T04:30:26.709Z
---

Improve the PlanFS board task details panel so it can be resized and dismissed without losing the normal task selection workflow.

Clicking a task should still open the details panel for that task, but users should be able to reclaim board space when they are scanning or grooming many cards.

## Acceptance Criteria

- [x] Details panel width can be resized with a visible drag affordance
- [x] Resizing has sensible minimum and maximum widths across supported viewport sizes
- [x] Details panel includes a close button that dismisses the current panel
- [x] Clicking a board task after dismissal reopens the details panel for that task
- [x] Panel state does not cause task cards, columns, or toolbar controls to overlap
- [x] Keyboard and screen-reader behavior remains usable for opening and closing details
- [x] Tests cover resizing, closing, reopening, and layout persistence or reset behavior

## Questions

- [x] Should the preferred panel width persist in VS Code workspace/global state?  Yes, the panel width should be serialized into the PlanFS preferences system.
- [x] Should closing the panel clear selection, keep selection, or only hide the details surface? Clear selection.
- [x] Should the panel support a compact mode in addition to manual resizing? Yes, compact mode would be great.
