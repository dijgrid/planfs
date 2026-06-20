---
id: TASK-053
title: Add backlog management view in VS Code
status: todo
priority: high
assignee: justin
epic: EPIC-backlog-management
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-045
  - TASK-047
  - TASK-051
tags:
  - vscode
  - backlog
  - board
dueDate: 2026-10-16
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
---

Add a VS Code backlog view that supports triage and refinement before tasks enter Next Work or normal board workflows.

## Acceptance Criteria

- [ ] VS Code exposes a backlog management view or board mode distinct from the status board and Next Work mode
- [ ] Backlog view groups items by refinement state, epic, milestone, assignee, or priority
- [ ] Users can capture a new backlog item with minimal fields and refine it later
- [ ] Users can update refinement state, priority, assignee, epic, milestone, tags, and due date from the backlog view
- [ ] Backlog item details use the board details drawer or equivalent shared UI
- [ ] Ready items are clearly distinguishable from captured, deferred, discarded, and needs-refinement items
- [ ] View respects saved filters and free-text filtering
- [ ] Tests cover grouping, refinement-state updates, item creation, filter interaction, and refresh behavior
