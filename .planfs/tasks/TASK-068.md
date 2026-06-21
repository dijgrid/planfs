---
id: TASK-068
title: Add VS Code lifecycle integration test suite
status: done
priority: medium
assignee: justin
epic: EPIC-lifecycle-integration-testing
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-059
tags:
  - testing
  - integration
  - vscode
  - lifecycle
dueDate: 2026-09-27
createdAt: 2026-06-21T17:49:55Z
updatedAt: 2026-06-21T18:10:15Z
refinementState: ready
backlogOrder: 81
---

Add a VS Code-focused lifecycle integration test suite that exercises PlanFS extension surfaces after the CLI/core lifecycle suite has established the canonical repository workflow.

The first version should concentrate on extension behavior that the CLI lifecycle suite cannot cover: explorer refresh, board rendering and updates, structured editor interactions, and webview command wiring.

## Acceptance Criteria

- [x] Test fixture starts from a temporary PlanFS repository with representative lifecycle data
- [x] Explorer shows created epics, milestones, and tasks after repository refresh
- [x] Board renders lifecycle tasks in status and next-work modes
- [x] Webview command wiring can open task artifacts and structured editors from lifecycle tasks
- [x] Task status updates through VS Code board flows preserve repository validity
- [x] Structured editor lifecycle interactions preserve clean Markdown and expected metadata
- [x] Tests avoid duplicating CLI lifecycle assertions already covered by `TASK-059`
- [x] Documentation or test comments clarify when to add VS Code lifecycle coverage versus narrower extension tests

## Implementation Notes

- Added a mock-based VS Code lifecycle suite in `src/vscode/src/lifecycle.test.ts`.
- The suite covers Explorer refresh, Next Work quick view, board rendering, board command wiring, board status transitions, raw Markdown opening, structured editor rendering, and structured editor saves.
- Negative paths cover invalid board quick transitions and invalid structured editor saves without corrupting repository state.
- Real extension-host smoke coverage is intentionally split into `TASK-069`.

## Questions

- [x] Should this suite use the existing VS Code mock layer only, or eventually include real extension-host tests? **This task uses the existing mock layer; real extension-host coverage is tracked in `TASK-069`.**
- [x] Which webview interactions should be simulated directly versus asserted through rendered HTML and message handlers? **Assert key rendered HTML and simulate message handlers for open, status transition, raw file open, and editor save.**
- [x] Should editor form interactions be part of the first VS Code lifecycle pass, or split into a dedicated editor lifecycle task? **This task covers provider save behavior through a direct webview message, not browser-level form interaction.**
- [x] How much lifecycle fixture setup should be shared with the CLI lifecycle suite? **Use a similar generated lifecycle fixture, but keep it local to the VS Code test suite to avoid coupling package tests.**
