---
id: TASK-028
title: Add repository initialization commands
status: done
priority: high
assignee: justin
epic: EPIC-project-setup-release-readiness
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-007
  - TASK-005
tags:
  - cli
  - vscode
  - setup
dueDate: 2026-06-16
createdAt: 2026-06-16T00:00:00Z
updatedAt: 2026-08-12T23:02:49.326Z
refinementState: ready
backlogOrder: 60
archive:
  archivedAt: 2026-08-12T23:02:49.326Z
  originalPath: .planfs/tasks/TASK-028.md
---

Give users an explicit way to initialize PlanFS structure from both the CLI and VS Code.

## Acceptance Criteria

- [x] `planfs init` creates the expected `.planfs` directories
- [x] Initialization includes saved filter support
- [x] The command is idempotent and does not overwrite user files
- [x] VS Code exposes an initialize repository command
- [x] Documentation uses `planfs init` instead of manual directory creation

## Implementation Notes

- Added `planfs init` with text and JSON output.
- Added `PlanFS: Initialize Repository` for VS Code.
- Initialization creates `.planfs/filters` alongside entity directories.
- Core initialization reports created and existing directories.
