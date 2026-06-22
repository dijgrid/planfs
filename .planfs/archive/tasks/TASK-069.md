---
id: TASK-069
title: Add real VS Code extension-host smoke tests
status: todo
archive:
  archivedAt: 2026-06-22T06:08:55.554Z
  originalPath: .planfs/tasks/TASK-069.md
priority: medium
assignee: justin
epic: EPIC-lifecycle-integration-testing
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-068
tags:
  - testing
  - vscode
  - extension-host
  - lifecycle
dueDate: 2026-10-04
refinementState: needs-refinement
backlogOrder: 82
createdAt: 2026-06-21T18:04:42Z
updatedAt: 2026-06-22T06:08:55.554Z
---

Add a real VS Code extension-host smoke test layer that launches the PlanFS extension in an actual VS Code test environment and verifies the core extension commands work against a temporary PlanFS workspace.

This should complement the mock-based VS Code lifecycle tests rather than replace them. The goal is to catch activation, packaging, command registration, and runtime integration issues that mocks cannot see.

## Acceptance Criteria

- [ ] Test harness launches a VS Code extension development/test host
- [ ] Temporary workspace contains a representative `.planfs` repository
- [ ] Extension activates from the workspace and registers expected PlanFS commands
- [ ] Smoke test can execute repository initialization, board/editor/open commands, or the nearest reliable command-level equivalents
- [ ] Tests verify expected on-disk planning files or command side effects after execution
- [ ] CI/local documentation explains prerequisites, runtime expectations, and when to run extension-host tests
- [ ] Mock-based lifecycle tests remain the fast default; extension-host tests are isolated if they require heavier runtime setup

## Questions

- [ ] Should the project use `@vscode/test-electron`, VS Code's current extension test runner, or another maintained harness?
- [ ] Should extension-host tests run in normal `npm test --workspaces`, a separate script, or CI-only smoke job?
- [ ] Which commands are reliable enough to assert in a headless extension-host environment without brittle UI inspection?
- [ ] How should downloaded VS Code binaries and test workspaces be cached in CI?
