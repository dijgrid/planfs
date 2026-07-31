---
id: TASK-092
title: Add milestone editor task rollups
status: done
priority: medium
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: ready
createdAt: 2026-07-07T05:08:12.000Z
updatedAt: 2026-07-31T03:16:23.053Z
---

Make milestone entities feel like delivery containers by showing associated task rollups in the structured editor.

Task membership should remain canonical on task metadata via `milestone: MILESTONE-id`; the milestone editor should derive its task list from those references and update task files when users change assignment.

## Scope

- Add a pure core rollup helper that derives milestone membership and health from the repository snapshot.
- Define completion as `done tasks / all tasks assigned to the milestone`, with an explicit empty-milestone state rather than a misleading percentage.
- Classify open work as overdue when its `dueDate` has passed, and at risk when it is blocked by incomplete dependencies or its due date falls after the milestone target date.
- Render summary counts, completion percentage, health indicators, and a task list in the milestone structured editor.
- Provide actions to open tasks, assign existing tasks to the milestone, and remove tasks by updating task metadata through normal repository save behavior.

## Acceptance Criteria

- [x] Milestone editor shows tasks associated with the milestone
- [x] Milestone editor shows total, open, done, blocked, overdue, and at-risk counts plus completion percentage
- [x] Empty milestones have a clear zero-scope state rather than displaying 0% complete as failure
- [x] Milestone editor highlights overdue tasks, incomplete dependencies, and tasks dated after the milestone target
- [x] Milestone editor exposes a clear path to open or edit associated tasks
- [x] Users can assign or remove existing tasks through task-file updates with validation and refresh
- [x] Implementation does not add canonical task membership lists to milestone files
- [x] Core tests cover membership, completion, empty milestones, overdue work, dependency risk, and target-date risk
- [x] VS Code tests cover rendering, navigation, assignment changes, validation failures, and refresh behavior

## Decisions

- [x] Task `milestone` metadata remains the only canonical membership relationship.
- [x] Health and completion are derived, not serialized into milestone files.
- [x] Rollup calculations live in core; VS Code remains a thin presenter and editor.
- [x] Detailed task ordering remains a backlog concern and is not managed by the milestone editor.

## Non-Goals

- Duplicating task ID lists, completion percentages, or health snapshots in milestone Markdown
- Replacing the backlog or board with milestone-specific task ordering
- Adding new milestone date-window schema fields

## Notes

See `docs/MILESTONE_MODEL.md` for the milestone model recommendation.
