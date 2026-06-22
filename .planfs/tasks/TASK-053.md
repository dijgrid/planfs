---
id: TASK-053
title: Add backlog management view in VS Code
status: done
priority: high
assignee: justin
epic: EPIC-backlog-management
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-051
tags:
  - vscode
  - backlog
  - board
dueDate: 2026-10-16
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-22T06:09:22Z
refinementState: captured
backlogOrder: 40
---

Add a VS Code backlog view that supports triage and refinement before tasks enter Next Work or normal board workflows.

## Acceptance Criteria

- [x] VS Code exposes a backlog management view or board mode distinct from the status board and Next Work mode
- [x] Backlog view groups items by refinement state, epic, milestone, assignee, or priority
- [x] Users can capture a new backlog item with minimal fields and refine it later
- [x] Users can update refinement state, priority, assignee, epic, milestone, tags, and due date from the backlog view
- [x] Backlog item details use the board details drawer or equivalent shared UI
- [x] Ready items are clearly distinguishable from captured, deferred, discarded, and needs-refinement items
- [x] View respects saved filters and free-text filtering
- [x] Tests cover grouping, refinement-state updates, item creation, filter interaction, and refresh behavior
