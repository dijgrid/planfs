---
id: TASK-062
title: Add safe AI-assisted planning update commands
status: done
priority: high
assignee: justin
epic: EPIC-ai-integration
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-061
tags:
  - ai
  - cli
  - updates
  - preview
dueDate: 2026-10-04
createdAt: 2026-06-21T00:00:00Z
updatedAt: 2026-06-21T17:23:39Z
refinementState: ready
backlogOrder: 96
---

Add first-class planning update commands that let AI agents and users make common metadata updates without manually editing Markdown frontmatter.

The workflow should support previewing changes before writing so multi-file planning updates are easier to review and safer to apply.

## Acceptance Criteria

- [x] CLI supports updating task metadata fields commonly changed during board cleanup
- [x] Supported fields include status, priority, assignee, refinement state, due date, epic, milestone, and tags
- [x] Update commands preserve clean YAML formatting and human-readable Markdown bodies
- [x] Commands support a dry-run or preview mode before applying file writes
- [x] Applied changes update `updatedAt` consistently
- [x] Invalid updates fail before writing partial changes
- [x] Tests cover successful updates, preview output, validation failures, and formatting preservation

## Implementation Notes

- Added validated task metadata updates through `updateTaskPlanning` and `planfs ai update-task`.
- Dry runs return changed fields and a full Markdown preview without writing files.
- Applied updates reuse the core serializer, preserve Markdown bodies, update `updatedAt`, and validate before writing.

## Notes

This should build on existing repository write APIs where possible so VS Code and future agent-facing workflows can reuse the same behavior.
