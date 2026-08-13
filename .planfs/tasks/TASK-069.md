---
id: TASK-069
title: Add real VS Code extension-host smoke tests
status: done
priority: high
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
dependsOn:
  - TASK-068
tags:
  - testing
  - vscode
  - extension-host
  - lifecycle
dueDate: 2026-09-25
refinementState: needs-refinement
backlogOrder: 110
createdAt: 2026-06-21T18:04:42Z
updatedAt: 2026-08-13T00:59:33.121Z
---

Add a real VS Code extension-host smoke test layer that launches the PlanFS extension in an actual VS Code test environment and verifies the core extension commands work against a temporary PlanFS workspace.

This should complement the mock-based VS Code lifecycle tests rather than replace them. The goal is to catch activation, packaging, command registration, and runtime integration issues that mocks cannot see.

## Acceptance Criteria

- [x] Test harness launches a VS Code extension development/test host
- [x] Temporary workspace contains a representative `.planfs` repository
- [x] Extension activates from the workspace and registers expected PlanFS commands
- [x] Smoke test can execute repository initialization, board/editor/open commands, or the nearest reliable command-level equivalents
- [x] Tests verify expected on-disk planning files or command side effects after execution
- [x] CI/local documentation explains prerequisites, runtime expectations, and when to run extension-host tests
- [x] Mock-based lifecycle tests remain the fast default; extension-host tests are isolated if they require heavier runtime setup

## Questions

- [x] Use `@vscode/test-electron`, the maintained VS Code test-host launcher.
- [x] Keep host tests isolated in `npm run test:extension-host --workspace=planfs-vscode`.
- [x] Assert command registration, repository initialization, and non-visual view-opening commands.
- [x] Cache the downloaded test binary under the tool's `.vscode-test` directory; test workspaces are temporary.

## Findings

- `npm run test:extension-host --workspace=planfs-vscode` passed against VS Code 1.133.0 after downloading the platform test binary once.
