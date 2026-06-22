---
id: TASK-074
title: Add current-work quick view to the PlanFS explorer
status: done
archive:
  archivedAt: 2026-06-22T06:08:51.853Z
  originalPath: .planfs/tasks/TASK-074.md
priority: high
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-064
  - TASK-067
tags:
  - vscode
  - explorer
  - current-work
  - ux
dueDate: 2026-09-16
refinementState: ready
backlogOrder: 86
createdAt: 2026-06-21T18:59:38Z
updatedAt: 2026-06-22T06:08:51.853Z
---

Add a compact Current Work quick view to the PlanFS Explorer so users can see work already assigned to them and actively underway.

This should mirror the lightweight feel of the existing Next Work explorer section, but focus on tasks where `status` is `in-progress` or `review` and the assignee matches the current user.

## Acceptance Criteria

- [x] PlanFS Explorer shows a compact Current Work section when the current user has assigned active work
- [x] Current Work includes tasks assigned to the current user with status `in-progress` or `review`
- [x] The section appears near the existing Next Work section without crowding normal navigation
- [x] Each item shows task ID, title, status, priority, and due date or epic/milestone context when available
- [x] Current Work items can open the task artifact or structured editor directly
- [x] The section refreshes when task files, assignee, or status values change
- [x] Empty and no-current-user states are handled without noisy placeholder text
- [x] Tests cover current-user matching, status filtering, empty state behavior, refresh behavior, and command wiring

## Implementation Notes

- Added current Git user detection in `planfs-core` using repository `user.name` and `user.email`.
- Added a compact Current Work explorer section before Next Work for assigned `in-progress` and `review` tasks.
- Covered current-user matching, filtering, empty state behavior, ordering, and command wiring in VS Code explorer tests.

## Questions

- [x] Which statuses should count as current work? **Use `in-progress` and `review`.**
- [x] Should current work be scoped by assignee? **Yes, only show tasks assigned to the current user.**
- [x] Should this replace Next Work? **No, add it as a separate explorer section.**
