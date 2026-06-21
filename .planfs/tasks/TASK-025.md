---
id: TASK-025
title: Optimize large repository performance
status: todo
priority: low
assignee: justin
epic: EPIC-large-repository-scale
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-013
tags:
  - performance
  - scale
  - phase-5
dueDate: 2026-10-28
refinementState: needs-refinement
backlogOrder: 30
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-21T18:28:24.478Z
---

Keep PlanFS responsive as repositories grow.

## Acceptance Criteria

- [ ] UI loads visible work first
- [ ] Large lists use virtual scrolling or pagination
- [ ] Parsed entities are cached
- [ ] Indexes support common query paths
- [ ] Benchmarks cover repositories with 10k tasks

## Questions

- [ ] What repository sizes should define the target performance tiers beyond the 10k-task benchmark?
- [ ] Which interactions need explicit latency budgets: repository load, board render, search, next-work ranking, validation, or graph views?
- [ ] Should caches be in-memory only, persisted under `.planfs`, or stored in editor/runtime cache directories?
- [ ] How should cache invalidation work when Markdown files are edited outside PlanFS?
- [ ] Which query paths should receive first-class indexes in the initial implementation?
- [ ] Should large repository optimizations prioritize VS Code responsiveness, CLI command speed, or both equally?
- [ ] How should benchmarks generate realistic dependencies, tags, bodies, and metadata without creating brittle fixtures?
- [ ] Should performance work include telemetry or debug timing output for diagnosing user repositories?
