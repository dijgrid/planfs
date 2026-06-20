---
id: TASK-054
title: Add backlog hygiene and stale-item review
status: done
priority: medium
assignee: justin
epic: EPIC-backlog-management
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-051
tags:
  - backlog
  - reports
  - hygiene
dueDate: 2026-10-16
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
refinementState: deferred
backlogOrder: 50
---

Add reports and review signals that keep the backlog from becoming an untrusted dumping ground.

## Acceptance Criteria

- [x] Core can identify stale backlog items using configurable or documented defaults such as old `updatedAt`, deferred state, missing metadata, or no recent movement
- [x] Reports distinguish stale items from blocked next-work candidates
- [x] Hygiene output recommends concrete review actions such as refine, defer, discard, assign, or link to an epic
- [x] CLI exposes stale and incomplete backlog review output
- [x] VS Code backlog view can surface stale and incomplete item badges
- [x] Tests cover stale detection, incomplete metadata detection, and recommendation text
