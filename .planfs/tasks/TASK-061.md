---
id: TASK-061
title: Add AI-ready board status summary
status: done
priority: high
assignee: justin
epic: EPIC-ai-integration
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-040
  - TASK-051
tags:
  - ai
  - board
  - cli
  - summary
dueDate: 2026-09-27
createdAt: 2026-06-21T00:00:00Z
updatedAt: 2026-06-21T17:23:39Z
refinementState: ready
backlogOrder: 95
---

Add a compact board and roadmap summary that AI agents can load quickly before making planning recommendations or updates.

The summary should avoid broad file scans for common status reviews while still deriving from the Markdown source of truth.

## Acceptance Criteria

- [x] CLI can emit a compact machine-readable board/status summary
- [x] Summary includes open tasks, active epics, active milestones, blocked work, ready work, stale plan indicators, and recently completed work
- [x] Summary includes enough identifiers and file paths for an agent to make targeted follow-up reads
- [x] Output can be scoped by milestone, epic, assignee, status, or refinement state
- [x] Summary is generated from repository APIs rather than duplicating parsing logic in the CLI
- [x] Tests cover summary counts, filtering, blocked/ready classification, and empty repository behavior

## Implementation Notes

- Added `buildPlanningSummary` in `planfs-core` and exposed it through `planfs ai summary`.
- Summary output includes scoped counts, open work, active planning containers, ready/blocked work, stale indicators, recently completed tasks, and file paths for targeted reads.
- Added core and CLI tests for summary shape, counts, filtering, and readiness classification.

## Notes

This should be the first AI integration slice because it directly reduces the number of files an agent needs to read before answering "what is next?" or "what needs cleanup?"
