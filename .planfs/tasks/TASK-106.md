---
id: TASK-106
title: Add general CLI entity update commands
status: done
createdAt: 2026-08-12T22:59:37.263Z
updatedAt: 2026-08-13T01:10:17.523Z
priority: medium
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
tags:
  - cli
  - updates
  - workflow
  - core
dueDate: 2026-09-22
refinementState: ready
backlogOrder: 90
---

Expose safe core update behavior through ordinary CLI commands instead of requiring users to enter the AI-specific command group.

## Scope

- Add `planfs update task` for common task metadata with dry-run and optimistic concurrency.
- Extend the command shape to epics, milestones, and decisions as their editable fields permit.
- Reuse the same core patch, validation, preview, and transactional behavior used by AI and bulk workflows.
- Keep `planfs ai update-task` as a compatible automation-oriented wrapper.

## Acceptance Criteria

- [x] Users can preview and apply supported entity metadata updates through a normal CLI command
- [x] Clearing optional values has explicit syntax and never relies on ambiguous empty strings
- [x] Stale `updatedAt` tokens refuse overwrites
- [x] Cross-reference and repository validation run before writes
- [x] JSON output is stable for scripts and text output is concise for humans
- [x] AI and normal CLI update paths produce equivalent files and errors
- [x] Documentation clearly distinguishes single-entity, bulk, backlog, and AI workflows

## Findings

- Safe task mutation exists in core and under `planfs ai`, but ordinary CLI users have create/show commands without a corresponding general update command.
- `planfs update TASK-098 --status done --dry-run --format json` verified the normal preview path; `--clear` makes optional-field deletion explicit.
