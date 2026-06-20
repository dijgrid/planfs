---
id: TASK-031
title: Redesign dependency graph layout around epic-to-task flow
status: done
priority: high
assignee: justin
epic: EPIC-visual-planning-experience
milestone: MILESTONE-visual-planning
dependsOn:
  - TASK-030
tags:
  - graph
  - vscode
  - visualization
dueDate: 2026-06-19
createdAt: 2026-06-19T00:00:00Z
updatedAt: 2026-06-19T20:08:35Z
refinementState: ready
backlogOrder: 20
---

Replace the current dependency visualizer with a graph layout that makes epic-to-task flow and task dependencies understandable at a glance.

## Acceptance Criteria

- [x] Epics appear as parent or grouping nodes with their child tasks arranged in a readable flow
- [x] Dependency edges clearly show prerequisite direction and downstream work
- [x] Tasks without dependencies remain visible but visually distinct from connected work
- [x] Status and priority are encoded without making the graph hard to scan
- [x] Large graphs remain navigable with pan, zoom, fit-to-view, and readable labels
