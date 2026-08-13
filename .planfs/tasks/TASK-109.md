---
id: TASK-109
title: Preserve webview state across repository refreshes
status: done
createdAt: 2026-08-12T22:59:37.625Z
updatedAt: 2026-08-13T01:10:27.709Z
priority: high
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
tags:
  - vscode
  - refresh
  - ux
  - reliability
dueDate: 2026-09-03
refinementState: ready
backlogOrder: 5
---

Preserve local view context while repository data refreshes in Board, Backlog, Insights, and Archive.

## Acceptance Criteria

- [x] Board refreshes retain mode, selected task, search text, saved filter, grouping, sorting, scope, milestone focus, and details-panel state when still valid
- [x] Backlog refreshes retain search, saved filter, grouping, selected task, and panel layout
- [x] Insights refreshes retain the active tab and compatible filter controls
- [x] Archive refreshes retain active search and type filters
- [x] Routine repository refreshes update view payloads without replacing the full webview document
- [x] Focused VS Code tests assert message-based refresh payloads and retained state hooks for each view
- [x] Manual extension-host verification confirms rapid file changes do not visibly reset these views

## Findings

- Board already had an incremental payload path but did not persist every control.
- Backlog, Insights, and Archive reconstructed their webview documents during ordinary refreshes.

## Implementation Notes

The current worktree contains the implementation. Remaining work is focused automated coverage and real extension-host verification through TASK-069.

- Focused refresh coverage and the VS Code extension-host smoke suite passed with the incremental payload paths enabled.
