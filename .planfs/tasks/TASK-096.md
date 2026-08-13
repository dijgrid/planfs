---
id: TASK-096
title: Remove the VS Code Marketplace Preview designation
status: done
priority: high
assignee: justin
createdAt: 2026-07-30T22:52:28.136Z
updatedAt: 2026-08-13T03:48:45.018Z
epic: EPIC-phase-5-advanced
milestone: MILESTONE-v1-3
tags:
  - vscode
  - marketplace
  - release
refinementState: ready
dueDate: 2026-09-30
---

Publish the next PlanFS VS Code extension release as a stable Marketplace release rather than a Preview extension.

The Marketplace Preview badge is controlled by the optional `preview` field in `src/vscode/package.json`. Stable release packaging should omit `preview: true`, and the release checklist should verify the generated package and published page remain stable.

## Acceptance Criteria

- [x] `src/vscode/package.json` no longer declares `preview: true`
- [x] Packaged extension metadata does not contain a Preview designation
- [x] Release documentation includes a stable-versus-preview manifest check before publishing
- [x] Post-release checks confirm the Marketplace page no longer displays the Preview badge
- [x] The change is recorded in the unreleased changelog
- [x] Extension packaging and the full repository verification suite pass

## Implementation Notes

- Removed the manifest `preview` property and verified it is absent from both packaged `package.json` and `extension.vsixmanifest`.
- Updated release checks and the unreleased changelog.
- Fixed package staging so stale excluded `node_modules` content is deleted before dependency installation.
- Updated the locked `fast-uri` runtime dependency to 3.1.5; the clean packaged runtime audit reports zero vulnerabilities.
- Verified the propagated 1.3.0 Marketplace page no longer displays the Preview badge.

## Non-Goals

- Publishing the release from this task
- Changing the extension version without an agreed release version
- Altering VS Code compatibility or introducing proposed APIs
