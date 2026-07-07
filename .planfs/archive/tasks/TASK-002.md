---
id: TASK-002
title: Build core parser and repository API
status: done
archive:
  archivedAt: 2026-07-07T02:20:00.142Z
  originalPath: .planfs/tasks/TASK-002.md
priority: critical
assignee: justin
epic: EPIC-mvp-core
milestone: MILESTONE-v0-1
dependsOn:
  - TASK-001
tags:
  - core
  - phase-1
dueDate: 2026-06-15
refinementState: ready
backlogOrder: 10
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-07-07T02:20:00.142Z
---

Implement the foundational core library for discovering, parsing, loading, querying, and serializing PlanFS entities.

## Acceptance Criteria

- [x] TypeScript package structure exists
- [x] `.planfs` file discovery works
- [x] YAML frontmatter parsing works
- [x] Entity types exist for task, epic, milestone, and decision
- [x] Repository loading API returns typed maps
- [x] Entity serialization writes human-readable Markdown files
