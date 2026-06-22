---
id: TASK-075
title: Add backlog readiness information box to task view
status: done
priority: medium
assignee: justin
epic: EPIC-backlog-management
milestone: MILESTONE-phase-5
tags:
  - vscode
  - backlog
  - task-view
  - ux
dueDate: 2026-09-17
refinementState: ready
createdAt: 2026-06-22T05:55:00Z
updatedAt: 2026-06-22T06:07:14.658Z
---

Add an information box to the VS Code task view that explains what the current task needs in order to leave the backlog `Needs review` state and become fully ready.

The box should make the readiness rules visible where the user is already editing the task, so they do not have to infer why a backlog card is marked for review.

## Acceptance Criteria

- [ ] The task view shows a clear readiness information box for task entities
- [ ] The box explains that `Needs review` can be caused by missing body content, missing priority, blocking dependencies, missing dependency IDs, or stale update metadata
- [ ] When the current task has specific readiness problems, the box lists those concrete reasons
- [ ] When the current task is fully ready, the box clearly indicates that no backlog review blockers remain
- [ ] The copy distinguishes backlog readiness from task workflow status such as `todo`, `in-progress`, `review`, and `done`
- [ ] The box updates after saving task metadata in the structured editor
- [ ] Tests cover rendering both a task with review blockers and a fully ready task

## Notes

- The current backlog label comes from `reviewBacklog(repository)` in `planfs-core`.
- The readiness explanation should stay grounded in the same logic used to mark backlog cards as `Needs review`.
