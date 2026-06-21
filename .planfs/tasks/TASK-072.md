---
id: TASK-072
title: Resolve VS Code extension install deprecation warning
status: done
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
refinementState: ready
backlogOrder: 65
createdAt: 2026-06-21T18:56:42Z
updatedAt: 2026-06-21T19:39:44.824Z
---

Investigate and resolve the repeated Node deprecation warning emitted when installing the packaged VS Code extension with `code --install-extension`.

The warning currently appears after successful installation:

```text
(node:62735) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
```

## Acceptance Criteria

- [x] The source of the `DEP0169` warning is identified using trace output or dependency inspection
- [x] If the warning comes from PlanFS code or packaging scripts, the code is migrated to the WHATWG URL API
- [x] If the warning comes from a transitive dependency or VS Code tooling, the dependency/tooling update path is documented
- [x] Installing the packaged `.vsix` no longer emits the warning, or the remaining upstream warning is documented with a tracking note
- [x] Release/package verification notes include the install command used to confirm the outcome

## Notes

- Reproduction command:

```sh
code --install-extension "/Users/justin.becker/ws/clients/dijgrid/planfs/dist/planfs-vscode-0.8.0.vsix" --force
```

## Completion Notes

- Traced the install warning with:

```sh
ELECTRON_RUN_AS_NODE=1 "/Applications/Visual Studio Code.app/Contents/MacOS/Code" --trace-deprecation "/Applications/Visual Studio Code.app/Contents/Resources/app/out/cli.js" --install-extension "/Users/justin.becker/ws/clients/dijgrid/planfs/dist/planfs-vscode-0.8.0.vsix" --force
```

- The stack originates in VS Code 1.125.1 `cliProcessMain.js` while updating extension gallery metadata after a successful local VSIX install.
- PlanFS source and packaging scripts do not call `url.parse()`, so there is no PlanFS WHATWG URL migration to apply.
- Documented the upstream warning and tracing command in `docs/RELEASE.md`.
