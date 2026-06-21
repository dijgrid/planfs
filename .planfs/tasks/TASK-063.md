---
id: TASK-063
title: Add AI workflow validation and documentation
status: todo
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
updatedAt: 2026-06-21T00:00:00Z
refinementState: ready
backlogOrder: 97
---

Document and validate the recommended AI-assisted planning workflow so agents can review board state, apply targeted updates, and summarize changes with fewer manual steps.

## Acceptance Criteria

- [ ] Documentation describes the recommended agent workflow for reviewing board state
- [ ] Documentation describes how to preview and apply common planning updates
- [ ] Validation catches common AI update mistakes such as unsupported fields, broken references, inconsistent epic or milestone status, and stale `updatedAt` values
- [ ] Examples show concise board review and cleanup flows
- [ ] Tests cover the new validation checks

## Notes

This task should keep documentation grounded in actual CLI and repository behavior introduced by the earlier AI integration tasks.
