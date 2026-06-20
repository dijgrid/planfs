---
id: TASK-042
title: Add next-work CLI command
status: done
priority: high
assignee: justin
epic: EPIC-next-work-planning
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-040
tags:
  - cli
  - planning
  - next-work
dueDate: 2026-07-24
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
---

Add a CLI workflow for listing the most actionable next tasks from the repository.

## Acceptance Criteria

- [x] `planfs next` lists ranked next-work candidates with task ID, title, status, priority, assignee, due date, and short explanation
- [x] Command supports scope filters for assignee, epic, milestone, tag, and status where appropriate
- [x] Command supports an option to include blocked tasks with blocking explanations
- [x] Command supports an explanation-focused output mode for debugging ranking decisions
- [x] Output remains readable in plain terminals and does not require VS Code
- [x] CLI tests cover default ranking, scoped ranking, blocked-task handling, and empty-result messaging
