---
id: TASK-073
title: Review and update project dependencies
status: todo
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
createdAt: 2026-06-21T18:56:42Z
updatedAt: 2026-06-21T18:56:42Z
refinementState: ready
backlogOrder: 66
---

Perform a dependency review across the PlanFS workspaces and update packages where doing so is safe.

This maintenance pass should look for outdated direct dependencies, security advisories, deprecated APIs, and tooling warnings that affect build, test, packaging, or extension installation workflows.

## Acceptance Criteria

- [ ] Dependency status is reviewed for all npm workspaces
- [ ] Security advisories are checked and triaged
- [ ] Safe patch/minor updates are applied with lockfile changes
- [ ] Major updates are either applied with migration work or documented as follow-up tasks
- [ ] Build, lint, workspace tests, and CLI validation pass after dependency changes
- [ ] Any dependency warnings that remain are documented with owner, cause, and next action
