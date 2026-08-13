---
id: TASK-095
title: Refocus the VS Code Marketplace README on extension features
status: review
priority: medium
assignee: justin
createdAt: 2026-07-30T22:46:48.245Z
updatedAt: 2026-08-12T23:04:57.698Z
epic: EPIC-phase-5-advanced
milestone: MILESTONE-v1-3
tags:
  - vscode
  - marketplace
  - documentation
  - release
refinementState: ready
dueDate: 2026-09-30
---

Review and improve the README and Marketplace presentation for the PlanFS VS Code extension so prospective extension users see the extension's capabilities first and do not mistake repository or CLI workflows for features available through the Marketplace installation.

The current extension README is a good foundation, but the published page should be organized around the installable VS Code experience. Contributor setup, local VSIX packaging, core architecture, and CLI-oriented workflows should move to concise links into repository documentation unless they directly help an extension user.

## Scope

- Review the currently published Marketplace page and determine how the Marketplace derives its overview and Features presentation from the packaged README and extension manifest.
- Audit `src/vscode/README.md` against the commands, views, menus, and configuration actually contributed by `src/vscode/package.json`.
- Lead with a concise value proposition and scannable extension features such as Explorer, Backlog, Board, Next Work, Insights, structured editing, creation, saved filters, and automatic refresh.
- Add Marketplace-safe screenshots or short visual examples where they materially explain the VS Code workflow.
- Keep installation and first-run instructions focused on installing the extension and initializing or opening a PlanFS workspace from VS Code.
- Move development setup, local VSIX packaging, architecture details, and CLI usage to clearly labeled repository links.
- Verify all links and images work from the packaged VSIX and the published Marketplace context.

## Acceptance Criteria

- [x] The source of the Marketplace Features presentation is verified and documented before restructuring the README or manifest
- [ ] The published overview leads with VS Code extension benefits and contains a prominent, correctly rendered feature section
- [x] Every advertised feature is available from the Marketplace-installed extension and matches current extension behavior
- [x] CLI commands are not presented as capabilities provided by installing the VS Code extension
- [x] Contributor setup, workspace builds, local VSIX packaging, and architecture details are reduced to concise links to repository documentation
- [x] Installation and getting-started steps work for a user who has only installed the extension from the Marketplace
- [x] Screenshots or visual examples use Marketplace-safe URLs, useful alt text, and current UI
- [x] README links, images, headings, and formatting are checked in the packaged VSIX
- [ ] A Marketplace preview or published-page verification confirms the intended Overview and Features rendering
- [x] Release documentation includes a repeatable check that guards against repository-focused content returning to the extension listing

## Implementation Notes

- The Marketplace web page renders the packaged README in its Overview; VS Code's Feature Contributions view is generated from `package.json` contribution points.
- The README now leads with extension workflows, provides a concise first-run path, and explicitly states that the Marketplace extension does not install the separate CLI.
- The packaged VSIX contains the new README and manifest. Final published-page verification remains for the release step.

## Non-Goals

- Rewriting the repository-level README as part of this task, except for correcting links required by the extension README
- Advertising CLI-only, unreleased, or planned features
- Changing extension functionality solely to match existing documentation
- Duplicating detailed contributor documentation inside the Marketplace README
