---
id: TASK-102
title: Add saved filter management workflows
status: done
createdAt: 2026-08-12T22:59:36.785Z
updatedAt: 2026-08-13T01:09:29.008Z
priority: medium
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
tags:
  - filters
  - cli
  - vscode
  - workflow
dueDate: 2026-09-18
refinementState: ready
backlogOrder: 80
---

Let users create and maintain repository-shared saved filters from the workflows where those filters are used.

## Scope

- Add core APIs to validate, save, rename, and delete filter JSON safely.
- Add CLI list/show/create/update/delete commands with dry-run previews where writes occur.
- Let Board and Backlog save their current compatible controls as a named filter.
- Add edit, duplicate, and delete actions with clear repository-shared semantics.

## Acceptance Criteria

- [x] Users can save the current board or backlog criteria as a named filter
- [x] Existing filters can be inspected, renamed, edited, duplicated, and deleted
- [x] Invalid criteria or unsafe filter IDs are rejected before writing
- [x] Writes produce deterministic, readable JSON under `.planfs/filters/`
- [x] Personal-only controls such as drawer width are never included in shared filters
- [x] Views update without losing the active filter after filter-file changes
- [x] CLI and VS Code tests cover CRUD, conflicts, malformed filters, and round trips

## Findings

- PlanFS currently loads saved-filter JSON and can apply or clear filters, but exposes no authoring workflow.
- Core filter APIs, CLI `filter` CRUD, and Board/Backlog save/manage controls share validated repository JSON. VS Code tests passed (44).
