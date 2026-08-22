---
id: TASK-121
title: Polish semantic task view hierarchy and visual states
status: done
priority: high
assignee: justin
createdAt: 2026-08-22T02:41:06.600Z
updatedAt: 2026-08-22T02:53:41.836Z
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
refinementState: ready
tags:
  - vscode
  - semantics
  - ui
  - release-polish
---

Polish the existing semantic task view for v1.4 so important planning content is easier to scan without changing the semantic contract or Markdown source-of-truth model.

## Scope

- Hide empty semantic groups and relationships that do not apply to the current entity type.
- Add a theme-safe acceptance-criteria progress bar alongside the existing count.
- Collapse secondary detail groups such as ordered sections, advisory mentions, and diagnostics while keeping primary planning content visible.
- Clamp long ordered-section previews with an explicit expand control.
- Strengthen visual states for criteria, authoritative relationships, advisory suggestions, and diagnostics using accessible labels and VS Code theme colors.

## Acceptance Criteria

- [x] Empty Findings, Questions, Mentions, and Diagnostics groups do not consume task-view space.
- [x] Task views omit decision-only relationship fields while decision views retain them.
- [x] Checkable acceptance criteria show a progress bar with accessible completion text.
- [x] Ordered sections, populated mentions, and populated diagnostics are collapsible and keyboard accessible.
- [x] Long section summaries are clamped by default and can be expanded without losing source navigation.
- [x] Checked, unchecked, ordinary, authoritative, advisory, warning, error, and informational states remain distinct across VS Code themes.
- [x] Rendering stays read-only and continues using the shared semantic inspection result.
- [x] Focused tests cover empty-state suppression, entity-specific relationships, progress rendering, disclosure controls, preview clamping, and visual-state classes.

## Decisions

- Use native `details` and `summary` elements for accessible disclosure behavior without new runtime state.
- Use VS Code theme variables and CSS rather than hard-coded light/dark colors or new assets.
- Keep acceptance criteria, findings, questions, and actionable suggestions expanded because they carry primary planning meaning.

## Findings

- The semantic renderer now suppresses empty or inapplicable groups, shows accessible acceptance progress, and uses native disclosure controls for secondary detail.
- Long section previews use a three-line clamp with an explicit expansion control while retaining their source-navigation action.
- Theme-variable borders and state treatments distinguish checked, unchecked, ordinary, authoritative, advisory, warning, error, and informational content without changing the semantic data contract.
- Renderer-level tests execute the embedded task-view renderer for task and decision fixtures; the full release check passed 252 workspace tests, lint, all builds, repository validation, and VSIX packaging.
- Live screenshot QA could not attach to VS Code because macOS Accessibility and Screen Recording permissions were still pending; deterministic renderer coverage and package verification were used for this pass.

## Non-Goals

- Replacing Markdown with a structured document editor
- Changing semantic parsing, validation, or analysis contracts
- Automatically changing status when criteria are checked
- Redesigning backlog, board, timeline, or explorer views
