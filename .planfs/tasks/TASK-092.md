---
id: TASK-092
title: Add milestone editor task rollups
status: todo
priority: medium
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: needs-refinement
createdAt: 2026-07-07T05:08:12.000Z
updatedAt: 2026-07-07T05:08:12.000Z
---

Make milestone entities feel like delivery containers by showing associated task rollups in the structured editor.

Task membership should remain canonical on task metadata via `milestone: MILESTONE-id`; the milestone editor should derive its task list from those references and update task files when users change assignment.

## Acceptance Criteria

- [ ] Milestone editor shows tasks associated with the milestone
- [ ] Milestone editor shows completion count and percentage
- [ ] Milestone editor highlights overdue or at-risk open tasks
- [ ] Milestone editor exposes a clear path to open or edit associated tasks
- [ ] Implementation does not add canonical task membership lists to milestone files
- [ ] Tests cover derived milestone task rollups

## Notes

See `docs/MILESTONE_MODEL.md` for the milestone model recommendation.
