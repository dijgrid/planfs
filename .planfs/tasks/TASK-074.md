---
id: TASK-074
title: Add current-work quick view to the PlanFS explorer
status: todo
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
createdAt: 2026-06-21T18:59:38Z
updatedAt: 2026-06-21T18:59:38Z
refinementState: ready
backlogOrder: 86
---

Add a compact Current Work quick view to the PlanFS Explorer so users can see work already assigned to them and actively underway.

This should mirror the lightweight feel of the existing Next Work explorer section, but focus on tasks where `status` is `in-progress` or `review` and the assignee matches the current user.

## Acceptance Criteria

- [ ] PlanFS Explorer shows a compact Current Work section when the current user has assigned active work
- [ ] Current Work includes tasks assigned to the current user with status `in-progress` or `review`
- [ ] The section appears near the existing Next Work section without crowding normal navigation
- [ ] Each item shows task ID, title, status, priority, and due date or epic/milestone context when available
- [ ] Current Work items can open the task artifact or structured editor directly
- [ ] The section refreshes when task files, assignee, or status values change
- [ ] Empty and no-current-user states are handled without noisy placeholder text
- [ ] Tests cover current-user matching, status filtering, empty state behavior, refresh behavior, and command wiring

## Questions

- [x] Which statuses should count as current work? **Use `in-progress` and `review`.**
- [x] Should current work be scoped by assignee? **Yes, only show tasks assigned to the current user.**
- [x] Should this replace Next Work? **No, add it as a separate explorer section.**
