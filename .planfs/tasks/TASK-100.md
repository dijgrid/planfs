---
id: TASK-100
title: Stabilize PlanFS views in multi-root workspaces
status: todo
createdAt: 2026-08-12T22:59:36.550Z
updatedAt: 2026-08-12T23:04:00Z
priority: high
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
tags:
  - vscode
  - multi-root
  - workspace
  - ux
dueDate: 2026-09-12
refinementState: ready
backlogOrder: 50
---

Keep every open PlanFS view attached to the repository the user chose in multi-root VS Code workspaces.

## Scope

- Replace the single mutable active-workspace pointer with explicit repository context for commands, panels, and tree data.
- Let users select a PlanFS workspace when a command is ambiguous.
- Bind each webview/editor panel to its opening workspace until intentionally switched or closed.
- Route file-watcher events only to views associated with the changed workspace.

## Acceptance Criteria

- [ ] A background change in workspace B does not switch views opened for workspace A
- [ ] Commands prompt for a workspace when multiple PlanFS repositories are available and context cannot resolve one
- [ ] Panel titles or context make the selected repository clear
- [ ] Create, edit, archive, refresh, and navigation actions write only to the bound workspace
- [ ] Closing or removing a workspace produces a clear empty/error state without falling through to another repository
- [ ] Tests cover two roots, simultaneous panels, watcher events, explicit selection, and workspace removal

## Findings

- File-watcher callbacks currently set one global active workspace from whichever `.planfs` file changed most recently.
