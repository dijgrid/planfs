---
id: TASK-085
title: Research board scope management workflows
status: done
priority: medium
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: ready
createdAt: 2026-07-07T03:04:35.546Z
updatedAt: 2026-07-07T04:41:14.710Z
---

Research common ways planning boards keep the active board focused without hiding important work.

The current board can become crowded because many task states and planning contexts appear together. Before choosing a workflow, compare lightweight board-scope patterns such as explicit backlog movement, saved board filters, swimlanes, WIP-focused status sets, deferred/icebox states, milestone or epic views, and contextual right-click actions.

## Acceptance Criteria

- [x] Common board-scope workflows are documented with tradeoffs for PlanFS
- [x] Recommendation covers whether board membership should be explicit, filter-driven, backlog-driven, or a combination
- [x] Right-click or quick-action options such as "move to backlog" are evaluated
- [x] Recommendation preserves Markdown as the source of truth and avoids hidden board-only state where possible
- [x] Follow-up implementation tasks are created if the recommended workflow is larger than this research task

## Questions

- [x] Should moving an item off the board mean changing `refinementState`, status, milestone, a new board visibility field, or a saved filter?
  - Answer: use `refinementState` as the primary shared signal. Moving work off the default board should usually mean moving it back to `captured`, `needs-refinement`, `deferred`, or `discarded` backlog states rather than inventing a board-only visibility field. Saved filters should control alternate board views, while task status remains about execution state.
- [x] Should the default board show only ready/current work, or continue showing all open work with stronger filtering?
  - Answer: make the default board focus on actionable work: open tasks that are `ready` or already in progress/review. Provide explicit alternate views for "All open" and "Backlog" so nothing is hidden, but the everyday board stays calm.
- [x] Should board-scope preferences be repository-shared, workspace-local, or both?
  - Answer: use both, with a clear split. Repository-shared saved filters define team-visible board scopes; VS Code workspace/global state stores personal UI choices such as the selected board view, collapsed groups, panel width, and density.
- [x] How should board cleanup interact with Next Work and backlog refinement?
  - Answer: board cleanup should feed the same readiness model used by Next Work. Moving something to backlog should make it disappear from the default board and from Next Work recommendations until it is refined back to `ready`.
