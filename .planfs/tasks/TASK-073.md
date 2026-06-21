---
id: TASK-073
title: Review and update project dependencies
status: done
priority: medium
assignee: justin
epic: EPIC-lifecycle-integration-testing
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-068
tags:
  - maintenance
  - dependencies
  - security
  - tooling
dueDate: 2026-10-06
refinementState: ready
backlogOrder: 66
createdAt: 2026-06-21T18:56:42Z
updatedAt: 2026-06-21T19:40:20Z
---

Perform a dependency review across the PlanFS workspaces and update packages where doing so is safe.

This maintenance pass should look for outdated direct dependencies, security advisories, deprecated APIs, and tooling warnings that affect build, test, packaging, or extension installation workflows.

## Acceptance Criteria

- [x] Dependency status is reviewed for all npm workspaces
- [x] Security advisories are checked and triaged
- [x] Safe patch/minor updates are applied with lockfile changes
- [x] Major updates are either applied with migration work or documented as follow-up tasks
- [x] Build, lint, workspace tests, and CLI validation pass after dependency changes
- [x] Any dependency warnings that remain are documented with owner, cause, and next action

## Completion Notes

- Ran `npm outdated --workspaces --long` and `npm audit --workspaces --audit-level=low`; audit reported 0 vulnerabilities.
- Updated `yargs` from 17.7.2 to 17.7.3 in the CLI workspace and lockfile.
- Pinned `@types/vscode` to `1.60.0` to match `engines.vscode` and prevent `vsce` packaging failures from a higher VS Code API declaration.
- Documented held update tracks in `docs/RELEASE.md`: ESLint 10, TypeScript 6, Node 26 type definitions, yargs 18, and `@types/vscode` alignment with `engines.vscode`.
- Remaining warnings: `vsce` reports the extension is unbundled and includes many files; owner is PlanFS packaging, cause is the current unbundled runtime dependency layout, and the next action is to plan a bundling/package-size pass.
