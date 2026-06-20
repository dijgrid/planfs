---
id: TASK-040
title: Add core next-work readiness and ranking APIs
status: done
priority: critical
assignee: justin
epic: EPIC-next-work-planning
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-015
  - TASK-030
tags:
  - core
  - planning
  - next-work
dueDate: 2026-07-10
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
refinementState: ready
backlogOrder: 10
---

Add shared core APIs that classify task readiness and rank candidate work consistently for CLI, VS Code, and future automation.

## Acceptance Criteria

- [x] Core exposes a task readiness helper that distinguishes ready, blocked, missing dependency, in progress, needs review, and done states
- [x] Readiness uses `dependsOn` task status and missing dependency data from repository state
- [x] Core exposes a next-work candidate helper that filters and ranks open tasks
- [x] Ranking uses generic task priority, epic priority when available, due date, milestone or epic target pressure, critical path status, downstream unblock count, assignee relevance, and stable tie-breakers
- [x] Each candidate includes human-readable reasons explaining the ranking inputs
- [x] Unit tests cover ready tasks, blocked tasks, missing dependencies, priority ordering, due-date ordering, critical-path ordering, and downstream unblock ordering
