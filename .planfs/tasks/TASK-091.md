---
id: TASK-091
title: Add board quick actions for backlog movement
status: todo
priority: medium
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: ready
createdAt: 2026-07-07T04:40:16.000Z
updatedAt: 2026-07-07T04:40:16.000Z
---

Add board card actions for moving tasks between active board readiness and backlog/refinement states.

These actions should update existing task metadata, especially `refinementState`, so board cleanup remains visible in Markdown and shared across CLI, VS Code, and AI workflows.

## Acceptance Criteria

- [ ] Board cards expose quick actions or context actions for move to backlog, defer, mark ready, and discard where appropriate
- [ ] Move to backlog sets `refinementState: needs-refinement`
- [ ] Defer sets `refinementState: deferred`
- [ ] Mark ready sets `refinementState: ready`
- [ ] Discard sets `refinementState: discarded` and uses confirmation or clear wording
- [ ] Actions update task files through shared core save APIs and refresh the board
- [ ] Tests cover each metadata transition and ensure task status is not changed by backlog movement

## Notes

See `docs/BOARD_SCOPE_WORKFLOWS.md` for the workflow recommendation behind these actions.
