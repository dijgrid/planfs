---
id: TASK-078
title: Move epic archive into the structured editor
status: done
priority: high
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
tags:
  - vscode
  - editor
  - archive
  - ux
dueDate: 2026-09-20
refinementState: ready
createdAt: 2026-06-23T00:00:00Z
updatedAt: 2026-06-23T00:00:00Z
---

Remove the inline archive affordance from the PlanFS Explorer epic list and make epic archival a structured editor action.

Clicking an epic in the explorer should continue to open the structured editor. Archiving should be a deliberate red action inside that editor, with confirmation before any files move to the archive.

## Acceptance Criteria

- [x] Epics in the PlanFS Explorer no longer show an inline archive button
- [x] Opening an epic from the PlanFS Explorer opens the structured editor
- [x] Epic structured editor includes a red Archive Epic action
- [x] Archive Epic shows a confirmation before archiving
- [x] Confirmation lets the user choose whether to archive the epic only or archive child tasks too
- [x] Existing task archive behavior remains available from the structured editor
- [x] Tests cover epic archive from the structured editor

## Notes

- Keep the lower-level archive command available for existing command callers, but do not advertise it as an explorer button for epics.
