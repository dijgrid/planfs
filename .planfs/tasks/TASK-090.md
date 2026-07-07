---
id: TASK-090
title: Implement board scope presets and actionable default view
status: todo
priority: high
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: ready
createdAt: 2026-07-07T04:40:16.000Z
updatedAt: 2026-07-07T04:40:16.000Z
---

Implement board scope presets so the default PlanFS board focuses on actionable work while still making all open and backlog work easy to reach.

The default board should use task metadata rather than hidden board-only state. Open tasks should appear by default when they are `refinementState: ready` or already `in-progress` / `review`. Alternate scopes should expose all open work and backlog/refinement work.

## Acceptance Criteria

- [ ] Board has a default actionable scope based on `refinementState` and task status
- [ ] Board offers explicit scope presets for default/actionable, all open, backlog/refinement, and saved filters
- [ ] Scope selection is visible in the toolbar and does not hide the active filter/search controls
- [ ] Scope selection persists as a workspace-local UI preference
- [ ] Done and discarded/deferred work do not crowd the default board
- [ ] Tests cover default scope membership, all-open scope membership, backlog scope membership, and persisted scope selection

## Notes

See `docs/BOARD_SCOPE_WORKFLOWS.md` for the workflow recommendation behind this implementation.
