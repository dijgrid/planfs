---
id: TASK-115
title: Surface semantic ticket content and diagnostics in VS Code
status: done
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
updatedAt: 2026-08-15T18:40:54.803Z
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

- [x] Users can inspect acceptance criteria and completion counts without manually scanning the Markdown body
- [x] Checked, unchecked, and ordinary-list criteria are visually distinguishable
- [x] Findings and questions are displayed as readable, visually distinct lists with source navigation
- [x] Users can navigate from known sections and diagnostics to the relevant Markdown source range
- [x] Unknown custom sections remain visible and accessible
- [x] Dependencies are presented as authoritative metadata while prose mentions are clearly non-authoritative
- [x] NLP-assisted diagnostics are visually distinguishable, explain their evidence, and can be disabled independently
- [x] Supported local analysis runs automatically for viewed or changed tickets without blocking the editor or modifying files
- [x] The normal view shows deduplicated actionable suggestions instead of an undifferentiated list of raw NLP signals
- [x] Users can preview any suggested metadata change and can dismiss or suppress advisory suggestions without silently changing frontmatter
- [x] The extension consumes shared core semantic and diagnostic types instead of duplicating heading parsing
- [x] Malformed bodies remain openable and show partial content plus actionable diagnostics
- [x] Repository refreshes preserve valid semantic-view state and unsaved editor drafts
- [x] Multi-root workspaces resolve semantic data and diagnostics against the selected repository
- [x] Extension-host smoke coverage exercises at least one semantic inspection and diagnostic workflow

## Decisions

- Use the shared core inspection contract for both the structured editor and backlog summaries; remove the extension-only heading parser.
- Run supported local English analysis automatically per workspace, while keeping structural inspection available when analysis is disabled.
- Keep advisory relationship actions preview-only in this task. Dismissal is workspace-scoped, ticket-specific, and reversible.
- Bind source navigation and preferences to the editor session's repository so changing the selected workspace cannot retarget an open ticket.
- Support multiple languages in a deferred follow-on epic, `EPIC-multilingual-semantic-analysis`; v1.4 retains its proven English-only analyzer scope.
- A future explicit Apply control is desirable only when paired with an explanation widget that presents the evidence, rationale, exact metadata change, and authoritative/advisory boundary before confirmation; TASK-116 owns this follow-up.

## Findings

- Questions needed a first-class core projection, parallel to findings, so all PlanFS surfaces can render them without reparsing Markdown.
- Safe preview fields can be offered only for relationship phrases with an unambiguous frontmatter mapping; other signals remain advisory without a metadata preview.
- Semantic payloads must escape raw HTML before embedding JSON in a webview script while preserving the original Markdown in the core result.

## Non-Goals

- Replacing the Markdown editor with a fully structured document editor
- Automatically changing task status when criteria are checked
- Automatically applying metadata changes inferred from prose
- Adding extension-only content-profile behavior
