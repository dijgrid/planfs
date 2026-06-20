---
id: TASK-059
title: Add full project lifecycle integration test suite
status: todo
priority: high
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-006
  - TASK-011
  - TASK-012
  - TASK-040
tags:
  - testing
  - integration
  - lifecycle
dueDate: 2026-09-20
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
---

Add a substantial integration test suite that simulates a realistic project from initial planning through completion. The suite should create epics, milestones, and tasks, exercise planning workflows, move work through statuses, and verify the repository remains valid and useful at each stage.

## Acceptance Criteria

- [ ] Test fixture starts from an empty temporary PlanFS repository and initializes the expected directory structure
- [ ] Scenario creates multiple epics, milestones, and tasks with dependencies, priorities, assignees, tags, and due dates
- [ ] Scenario exercises task creation through supported APIs or CLI flows rather than hand-writing every final file
- [ ] Scenario moves tasks through todo, in-progress, review, and done states in a realistic order
- [ ] Dependency readiness and next-work ranking are asserted at multiple points in the project lifecycle
- [ ] Validation is run after each major phase and fails the test on broken links, schema errors, or stale assumptions
- [ ] Final project state verifies all planned work is complete, terminal states are represented correctly, and summaries/counts match expectations
- [ ] Test output makes failures diagnosable without requiring manual inspection of generated Markdown
- [ ] Suite is documented so future contributors know when to update it versus adding narrower unit tests
