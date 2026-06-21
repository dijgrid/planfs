---
id: TASK-072
title: Resolve VS Code extension install deprecation warning
status: todo
priority: medium
assignee: justin
epic: EPIC-lifecycle-integration-testing
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-068
tags:
  - maintenance
  - vscode
  - packaging
  - dependencies
dueDate: 2026-10-05
createdAt: 2026-06-21T18:56:42Z
updatedAt: 2026-06-21T18:56:42Z
refinementState: ready
backlogOrder: 65
---

Investigate and resolve the repeated Node deprecation warning emitted when installing the packaged VS Code extension with `code --install-extension`.

The warning currently appears after successful installation:

```text
(node:62735) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
```

## Acceptance Criteria

- [ ] The source of the `DEP0169` warning is identified using trace output or dependency inspection
- [ ] If the warning comes from PlanFS code or packaging scripts, the code is migrated to the WHATWG URL API
- [ ] If the warning comes from a transitive dependency or VS Code tooling, the dependency/tooling update path is documented
- [ ] Installing the packaged `.vsix` no longer emits the warning, or the remaining upstream warning is documented with a tracking note
- [ ] Release/package verification notes include the install command used to confirm the outcome

## Notes

- Reproduction command:

```sh
code --install-extension "/Users/justin.becker/ws/clients/dijgrid/planfs/dist/planfs-vscode-0.8.0.vsix" --force
```
