---
id: TASK-068
title: Add VS Code lifecycle integration test suite
status: todo
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
updatedAt: 2026-06-21T17:49:55Z
refinementState: needs-refinement
backlogOrder: 81
---

Add a VS Code-focused lifecycle integration test suite that exercises PlanFS extension surfaces after the CLI/core lifecycle suite has established the canonical repository workflow.

The first version should concentrate on extension behavior that the CLI lifecycle suite cannot cover: explorer refresh, board rendering and updates, structured editor interactions, and webview command wiring.

## Acceptance Criteria

- [ ] Test fixture starts from a temporary PlanFS repository with representative lifecycle data
- [ ] Explorer shows created epics, milestones, and tasks after repository refresh
- [ ] Board renders lifecycle tasks in status and next-work modes
- [ ] Webview command wiring can open task artifacts and structured editors from lifecycle tasks
- [ ] Task status updates through VS Code board flows preserve repository validity
- [ ] Structured editor lifecycle interactions preserve clean Markdown and expected metadata
- [ ] Tests avoid duplicating CLI lifecycle assertions already covered by `TASK-059`
- [ ] Documentation or test comments clarify when to add VS Code lifecycle coverage versus narrower extension tests

## Questions

- [ ] Should this suite use the existing VS Code mock layer only, or eventually include real extension-host tests?
- [ ] Which webview interactions should be simulated directly versus asserted through rendered HTML and message handlers?
- [ ] Should editor form interactions be part of the first VS Code lifecycle pass, or split into a dedicated editor lifecycle task?
- [ ] How much lifecycle fixture setup should be shared with the CLI lifecycle suite?
