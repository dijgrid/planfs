---
id: TASK-093
title: Add optional milestone focus lens
status: todo
priority: medium
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: needs-refinement
createdAt: 2026-07-07T05:08:12.000Z
updatedAt: 2026-07-07T05:08:12.000Z
---

Add an optional milestone focus lens for board and next-work views so release-oriented teams can focus on one delivery target without making milestones mandatory.

The default PlanFS workflow should remain process-agnostic. Milestone focus should be an explicit view/filter, not hidden board membership state.

## Acceptance Criteria

- [ ] Board can focus on a selected active milestone without losing normal saved-filter behavior
- [ ] Next Work can scope recommendations to a selected milestone
- [ ] Milestone focus is visible in the UI when active
- [ ] Milestone focus is stored as workspace-local UI state unless represented by a saved filter
- [ ] Ranking explanations mention milestone focus when it affects ordering or visibility
- [ ] Tests cover board and next-work milestone scoping

## Notes

See `docs/MILESTONE_MODEL.md` for the milestone model recommendation.
