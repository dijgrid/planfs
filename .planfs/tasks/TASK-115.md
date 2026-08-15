---
id: TASK-115
title: Surface semantic ticket content and diagnostics in VS Code
status: todo
priority: medium
assignee: justin
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
dependsOn:
  - TASK-113
tags:
  - vscode
  - ui
  - semantics
  - diagnostics
dueDate: 2026-12-09
refinementState: ready
backlogOrder: 60
createdAt: 2026-08-15T00:02:14.023Z
updatedAt: 2026-08-15T00:02:14.023Z
---

Use the shared semantic document APIs to make important ticket content easier to inspect in VS Code. Surface acceptance-criteria progress, known sections, and located conformance diagnostics without hiding or replacing the underlying Markdown document.

## Scope

- Show acceptance criteria as structured items with checked, unchecked, and uncheckable states.
- Render findings and questions as polished, visually distinct lists comparable to acceptance criteria while preserving source order and navigation ranges.
- Display or navigate to recognized and custom sections while preserving their source order.
- Present semantic diagnostics with severity, repair guidance, and navigation to the relevant body range.
- Present enabled NLP-assisted quality signals as advisory analysis with distinct provenance rather than structural errors.
- Run supported local analysis automatically for the ticket being viewed or changed, subject to workspace settings and language support, rather than requiring a separate opt-in action for routine use.
- Prefer actionable, deduplicated suggestions such as previewing a missing metadata relationship or locating ambiguous criterion wording; suppress signals already represented by authoritative metadata.
- Let users inspect evidence, navigate to the source range, dismiss or suppress an advisory suggestion, and disable local analysis without hiding deterministic semantic diagnostics.
- Clearly label authoritative dependencies separately from non-authoritative body mentions.
- Reuse `planfs-core` parsing and validation; extension code must remain a thin presentation layer.
- Preserve drafts, workspace scoping, and incremental refresh behavior established in v1.3.

## Acceptance Criteria

- [ ] Users can inspect acceptance criteria and completion counts without manually scanning the Markdown body
- [ ] Checked, unchecked, and ordinary-list criteria are visually distinguishable
- [ ] Findings and questions are displayed as readable, visually distinct lists with source navigation
- [ ] Users can navigate from known sections and diagnostics to the relevant Markdown source range
- [ ] Unknown custom sections remain visible and accessible
- [ ] Dependencies are presented as authoritative metadata while prose mentions are clearly non-authoritative
- [ ] NLP-assisted diagnostics are visually distinguishable, explain their evidence, and can be disabled independently
- [ ] Supported local analysis runs automatically for viewed or changed tickets without blocking the editor or modifying files
- [ ] The normal view shows deduplicated actionable suggestions instead of an undifferentiated list of raw NLP signals
- [ ] Users can preview any suggested metadata change and can dismiss or suppress advisory suggestions without silently changing frontmatter
- [ ] The extension consumes shared core semantic and diagnostic types instead of duplicating heading parsing
- [ ] Malformed bodies remain openable and show partial content plus actionable diagnostics
- [ ] Repository refreshes preserve valid semantic-view state and unsaved editor drafts
- [ ] Multi-root workspaces resolve semantic data and diagnostics against the selected repository
- [ ] Extension-host smoke coverage exercises at least one semantic inspection and diagnostic workflow

## Non-Goals

- Replacing the Markdown editor with a fully structured document editor
- Automatically changing task status when criteria are checked
- Automatically applying metadata changes inferred from prose
- Adding extension-only content-profile behavior
