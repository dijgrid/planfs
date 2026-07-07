---
id: TASK-016
title: Add graph visualization and dependency warnings
status: done
archive:
  archivedAt: 2026-07-07T02:20:00.121Z
  originalPath: .planfs/tasks/TASK-016.md
priority: high
assignee: justin
epic: EPIC-phase-3-visualization
milestone: MILESTONE-phase-3
dependsOn:
  - TASK-015
tags:
  - graph
  - vscode
  - phase-3
dueDate: 2026-06-15
refinementState: ready
backlogOrder: 20
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-07-07T02:20:00.121Z
---

Render dependencies and surface dependency health issues.

## Acceptance Criteria

- [x] Webview displays a DAG of task nodes and edges
- [x] Critical path is highlighted
- [x] Node color reflects task status
- [x] Missing and circular dependencies are shown clearly
- [x] Dependency reports can be exported
