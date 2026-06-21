---
id: TASK-060
title: Add archive workflow for epics and tasks
status: done
priority: high
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-004
  - TASK-046
  - TASK-049
  - TASK-058
tags:
  - archive
  - vscode
  - ux
  - tasks
  - epics
dueDate: 2026-09-13
refinementState: ready
backlogOrder: 90
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-21T18:51:34.253Z
---

Add an archive workflow that can be applied to tasks and epics so old or inactive planning artifacts are completely hidden from normal PlanFS UI surfaces.

Archived items should remain valid, searchable through a dedicated archive experience, and restorable without manual file surgery. The default UI should treat archived items as out of sight unless the user intentionally opens the archive UI.

## Acceptance Criteria

- [x] Tasks can be archived and unarchived through supported UI actions
- [x] Epics can be archived and unarchived through supported UI actions
- [x] Archived tasks and epics are hidden from normal board, explorer, list, next-work, and search views by default
- [x] A dedicated archive UI lets users browse, inspect, filter, and restore archived tasks and epics
- [x] Archived artifacts remain stored as readable Markdown with clear metadata
- [x] Validation understands archived items and reports broken links or invalid metadata clearly
- [x] Dependencies, child-task lists, and milestone references handle archived items consistently
- [x] Tests cover archive metadata parsing, repository queries, UI filtering, archive browsing, and restore behavior
- [x] Documentation explains the archive workflow and the difference between archived, completed, deferred, and discarded work

## Questions

- [x] Should archive state be represented by a new `archived: true` field, a timestamp such as `archivedAt`, a status value, or a separate metadata object? **I think a separate metadata object would be useful so someone can still review the archived tasks and things and get information about what happened.**
- [x] Should archiving an epic also archive its child tasks by default, ask for confirmation, or leave child tasks unchanged? **Child tasks should be archived as part of archiving an epic but there should be a confirmation about this**
- [x] Should archived items still be included in validation link checks, dependency readiness checks, and project counts? **I think archived items should be dropped from checks and other things that might depend upon those things being visible.  However, project stats should contain archived information as well I think**
- [x] Should archived items be hidden from CLI output by default as well as VS Code UI output? **Yes**
- [x] What should happen when an active task depends on an archived task? **I don't think archived dependencies should be considered after archival, otherwise there is no way to trim down a large project**
- [x] Should archived items remain in their current directories or move to a dedicated archive directory?  **Yes I think a dedicated archive directory is important here**
- [x] Should archive actions require a reason or note for future context? **No**
- [x] Should archived items be excluded from saved filters unless a filter explicitly includes them?  **Yes**
- [x] Should the archive UI support bulk restore and permanent delete, or only restore? **Both, but permanent delete should be blocked behind confirmation**
- [x] Should archive state apply to future entity types such as decisions, risks, requirements, and milestones? **Yes**
- [x] Should archived epics still appear as grouping labels when visible non-archived tasks reference them?  **Yes**
- [x] Should archive restore preserve original ordering fields, or recalculate backlog and board ordering on restore? **Recalculate**
