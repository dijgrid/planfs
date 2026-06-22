---
id: TASK-067
title: Add persistent VS Code UI state preferences
status: done
archive:
  archivedAt: 2026-06-22T06:08:51.853Z
  originalPath: .planfs/tasks/TASK-067.md
priority: medium
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-053
  - TASK-064
  - TASK-066
tags:
  - vscode
  - preferences
  - ui-state
  - ux
dueDate: 2026-09-21
refinementState: ready
backlogOrder: 87
createdAt: 2026-06-21T00:00:00Z
updatedAt: 2026-06-22T06:08:51.853Z
---

Add a shared persistence layer for VS Code UI state preferences used by PlanFS webviews and explorer surfaces.

Individual webviews can use VS Code webview state for local session restoration, but PlanFS should have a consistent way to persist user layout preferences across views, reloads, and future sessions where appropriate.

## Acceptance Criteria

- [x] Shared helper stores and retrieves PlanFS UI preferences from VS Code workspace or global state
- [x] Preferences are scoped intentionally so repository-specific layout choices do not leak unexpectedly across workspaces
- [x] Backlog panel side preference can persist through panel recreation and VS Code restart
- [x] Future views can reuse the same helper for sort, grouping, collapsed sections, selected view mode, and panel layout preferences
- [x] Defaults remain predictable when no saved preference exists
- [x] Tests cover storing, loading, clearing, and fallback behavior
- [x] Documentation explains which UI preferences are persisted and where they are scoped

## Questions

- [x] Should layout preferences be workspace-scoped by default, with global preferences only for truly user-wide choices? **Lets go with global preferences here**
- [x] Should saved UI state live in VS Code `workspaceState`, `globalState`, `.planfs` config, or a mix by preference type? **I think UI state should live in the vscode globalState store**
- [x] Should UI state be exportable or intentionally local-only to avoid repository churn? **Ya this state should be stored only within vscode and should not affect the repo**
