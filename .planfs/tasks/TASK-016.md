---
id: TASK-016
title: Add graph visualization and dependency warnings
status: done
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
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-15T00:00:00Z
---

Render dependencies and surface dependency health issues.

## Acceptance Criteria

- [x] Webview displays a DAG of task nodes and edges
- [x] Critical path is highlighted
- [x] Node color reflects task status
- [x] Missing and circular dependencies are shown clearly
- [x] Dependency reports can be exported
