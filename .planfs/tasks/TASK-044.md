---
id: TASK-044
title: Add next-work documentation and validation coverage
status: done
priority: medium
assignee: justin
epic: EPIC-next-work-planning
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-041
  - TASK-042
  - TASK-043
tags:
  - docs
  - tests
  - next-work
dueDate: 2026-08-07
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
refinementState: ready
backlogOrder: 50
---

Document the next-work workflow and back it with validation that reflects the implemented behavior.

## Acceptance Criteria

- [x] Getting started documentation explains how to use `planfs next` and the board Next Work mode
- [x] File format documentation explains task and epic priority in the context of next-work ranking
- [x] VS Code documentation describes Next Work mode without promising unsupported automation
- [x] Release notes call out the next-work workflow and its ranking signals
- [x] Validation and tests cover the full next-work path from parsed files to CLI output and board payload
