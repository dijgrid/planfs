---
id: TASK-027
title: Add CLI epic and milestone creation
status: done
priority: medium
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-008
tags:
  - cli
  - creation
  - phase-5
dueDate: 2026-06-16
createdAt: 2026-06-16T00:00:00Z
updatedAt: 2026-06-16T00:00:00Z
refinementState: ready
backlogOrder: 50
---

Expand `planfs create` beyond tasks so users can create top-level planning structure from the CLI.

## Acceptance Criteria

- [x] `planfs create epic --title ...` creates an epic with a slug ID
- [x] `planfs create milestone --title ... --target-date ...` creates a milestone with a slug ID
- [x] Duplicate slug IDs are resolved with numeric suffixes
- [x] Optional owner, status, and description fields are supported where relevant
- [x] CLI tests cover task, epic, and milestone creation

## Implementation Notes

- Added slug ID helpers for epics and milestones.
- Added core templates for epic and milestone creation.
- Extended `planfs create` to support `task`, `epic`, and `milestone`.
- Milestone creation requires `--target-date`.
