---
id: TASK-084
title: Reduce backlog filter widget footprint
status: done
priority: medium
assignee: justin
epic: EPIC-backlog-management
milestone: MILESTONE-phase-5
tags:
  - vscode
  - backlog
  - filters
  - ux
dueDate: 2026-09-25
refinementState: captured
createdAt: 2026-06-24T01:58:01.405Z
updatedAt: 2026-06-24T03:44:35.753Z
---

Reduce the amount of vertical space consumed by filter widgets in the VS Code backlog view.

The backlog view currently gives too much screen real estate to stacked filter controls. Rework the filter area so controls that naturally fit together can be laid out horizontally, wrap cleanly when space is constrained, and leave more room for the backlog list and editor content.

## Acceptance Criteria

- [x] Backlog filter controls use a compact horizontal or wrapping layout where viewport width allows
- [x] Related filter widgets remain visually grouped and easy to scan
- [x] Narrow VS Code panels still fall back to a readable stacked layout without clipped labels or controls
- [x] The backlog list and detail/editor area gain usable vertical space in common desktop panel sizes
- [x] Filter behavior, saved filter selection, grouping, sorting, and text search continue to work unchanged
- [x] Tests or focused manual verification cover wide, medium, and narrow webview widths
