---
id: TASK-025
title: Optimize large repository performance
status: todo
priority: high
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-013
tags:
  - performance
  - scale
  - phase-5
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-15T00:00:00Z
---

Keep PlanFS responsive as repositories grow.

## Acceptance Criteria

- [ ] UI loads visible work first
- [ ] Large lists use virtual scrolling or pagination
- [ ] Parsed entities are cached
- [ ] Indexes support common query paths
- [ ] Benchmarks cover repositories with 10k tasks
