---
id: TASK-006
title: Implement task creation workflows
status: done
priority: high
assignee: justin
epic: EPIC-mvp-core
milestone: MILESTONE-v0-1
dependsOn:
  - TASK-002
  - TASK-005
tags:
  - vscode
  - cli
  - phase-1
dueDate: 2026-06-15
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-15T00:00:00Z
---

Create task files from supported UI and CLI entrypoints.

## Acceptance Criteria

- [x] Next sequential task ID generation works
- [x] VS Code command prompts for a task title
- [x] CLI accepts `planfs create task --title`
- [x] New tasks are written to `.planfs/tasks/`
- [x] Unsupported entity creation is not advertised as complete
