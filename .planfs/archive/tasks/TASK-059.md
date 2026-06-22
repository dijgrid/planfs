---
id: TASK-059
title: Add full project lifecycle integration test suite
status: done
archive:
  archivedAt: 2026-06-22T06:08:55.554Z
  originalPath: .planfs/tasks/TASK-059.md
priority: high
assignee: justin
epic: EPIC-lifecycle-integration-testing
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
refinementState: ready
backlogOrder: 80
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-22T06:08:55.554Z
---

Add a substantial integration test suite that simulates a realistic project from initial planning through completion. The suite should create epics, milestones, and tasks, exercise planning workflows, move work through statuses, and verify the repository remains valid and useful at each stage.

## Acceptance Criteria

- [x] Test fixture starts from an empty temporary PlanFS repository and initializes the expected directory structure
- [x] Scenario creates multiple epics, milestones, and tasks with dependencies, priorities, assignees, tags, and due dates
- [x] Scenario exercises task creation through supported APIs or CLI flows rather than hand-writing every final file
- [x] Scenario moves tasks through todo, in-progress, review, and done states in a realistic order
- [x] Dependency readiness and next-work ranking are asserted at multiple points in the project lifecycle
- [x] Validation is run after each major phase and fails the test on broken links, schema errors, or stale assumptions
- [x] Final project state verifies all planned work is complete, terminal states are represented correctly, and summaries/counts match expectations
- [x] Test output makes failures diagnosable without requiring manual inspection of generated Markdown
- [x] Suite is documented so future contributors know when to update it versus adding narrower unit tests

## Implementation Notes

- Added a CLI-focused lifecycle integration test in `src/cli/src/commands/lifecycle.test.ts`.
- The suite initializes a temporary repository, creates an epic, milestone, and tasks through CLI commands, enriches metadata through supported core APIs, moves tasks through todo, in-progress, review, and done, and validates after each major phase.
- The suite also verifies invalid AI metadata updates fail before writing and leave the repository valid.
- The first version intentionally excludes VS Code lifecycle coverage; that follow-up is tracked separately in `TASK-068`.

## Questions

- [x] Should the lifecycle suite exercise the CLI, core repository APIs, VS Code behavior, or a layered combination? **First version covers CLI workflows plus core repository assertions; VS Code is split into `TASK-068`.**
- [x] Should the fixture be generated entirely during the test, stored as a snapshot fixture, or both? **Generated entirely in a temporary repository.**
- [x] Which workflows should be considered part of the canonical lifecycle for the first version? **Initialize, create epic/milestone/tasks, enrich metadata, validate, rank next work, transition through statuses, list completed work, and summarize final state.**
- [x] Should the scenario include Git operations such as branch changes, commits, or pull request metadata? **No, keep Git and PR lifecycle coverage separate.**
- [x] How much should the suite assert exact Markdown output versus behavior through repository APIs? **Assert behavior through CLI/core APIs; avoid exact Markdown snapshots in this lifecycle test.**
- [x] Should the lifecycle test cover archive, backlog, and next-work workflows once those features exist? **Next-work and summary are covered now; archive and deeper backlog lifecycle should be added when those features mature.**
- [x] What runtime budget is acceptable for the full lifecycle suite in local development and CI? **Small enough for normal CLI test runs; current suite runs inside the existing CLI Jest suite.**
- [x] Should failures emit generated artifacts for inspection, and if so where should those artifacts be written? **No persistent artifacts for now; Jest failures include the exact lifecycle phase and generated repo path is temporary.**
