---
id: TASK-015
title: Build dependency graph engine
status: done
priority: high
assignee: justin
epic: EPIC-phase-3-visualization
milestone: MILESTONE-phase-3
dependsOn:
  - TASK-003
tags:
  - graph
  - phase-3
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-15T00:00:00Z
---

Model task dependency relationships for analysis and visualization.

## Acceptance Criteria

- [x] Build a dependency graph from all tasks
- [x] Compute direct and transitive dependencies
- [x] Calculate critical path
- [x] Compute task levels from root tasks
- [x] Expose graph APIs from `planfs-core`
