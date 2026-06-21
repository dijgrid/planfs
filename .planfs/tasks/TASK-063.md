---
id: TASK-063
title: Add AI workflow validation and documentation
status: done
priority: medium
assignee: justin
epic: EPIC-ai-integration
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-061
  - TASK-062
tags:
  - ai
  - validation
  - docs
dueDate: 2026-10-11
createdAt: 2026-06-21T00:00:00Z
updatedAt: 2026-06-21T17:23:39Z
refinementState: ready
backlogOrder: 97
---

Document and validate the recommended AI-assisted planning workflow so agents can review board state, apply targeted updates, and summarize changes with fewer manual steps.

## Acceptance Criteria

- [x] Documentation describes the recommended agent workflow for reviewing board state
- [x] Documentation describes how to preview and apply common planning updates
- [x] Validation catches common AI update mistakes such as unsupported fields, broken references, inconsistent epic or milestone status, and stale `updatedAt` values
- [x] Examples show concise board review and cleanup flows
- [x] Tests cover the new validation checks

## Implementation Notes

- Added `docs/AI_WORKFLOWS.md` and linked it from getting-started and architecture docs.
- Validation now flags unsupported metadata fields, stale or inconsistent `updatedAt` values, and open tasks linked to inactive planning containers.
- Added validator tests for the new AI-safety checks.

## Notes

This task should keep documentation grounded in actual CLI and repository behavior introduced by the earlier AI integration tasks.
