---
id: TASK-112
title: Validate semantic content profiles with stable diagnostics
status: todo
priority: high
assignee: justin
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
dependsOn:
  - TASK-111
  - TASK-119
tags:
  - core
  - validation
  - diagnostics
  - semantics
dueDate: 2026-11-27
refinementState: ready
backlogOrder: 30
createdAt: 2026-08-15T00:02:13.662Z
updatedAt: 2026-08-15T00:02:13.662Z
---

Validate parsed Markdown bodies against entity-specific content profiles without conflating stylistic convention with repository corruption. Add stable, source-located diagnostics that can support interactive editing, CI enforcement, and automated repair.

## Scope

- Add validation layers for Markdown parseability, known-section structure, selected readiness profile, and existing repository integrity.
- Define a permissive baseline profile for backward-compatible reads and an automation-ready profile for documents expected to support semantic workflows.
- Validate missing or duplicate recognized sections, unexpected content shapes, empty criteria, ordinary bullets used where checklists are expected, and ambiguous aliases.
- Make readiness-sensitive rules aware of lifecycle metadata so a captured backlog item is not judged like a ready implementation task.
- Assign stable diagnostic codes, severity, entity ID, file path, source range, semantic section key, and actionable repair guidance.
- Consume promoted NLP signals through the production analyzer from TASK-119, keep their diagnostics opt-in or advisory, identify their analyzer and language, and preserve a deterministic validation path when NLP is unavailable.
- Extend CLI validation options without changing files or unexpectedly turning existing warnings into default hard failures.

## Acceptance Criteria

- [ ] Baseline and automation-ready content profiles can be selected explicitly
- [ ] Existing frontmatter and repository validation continue to work independently of content-profile validation
- [ ] Ready tasks can be checked for a meaningful preamble and usable acceptance criteria while captured tasks remain permissive
- [ ] Missing, empty, duplicate, aliased, malformed, and wrong-shape recognized sections produce stable diagnostic codes
- [ ] Diagnostics identify the file and narrowest available source range
- [ ] Any NLP-assisted diagnostics selected by TASK-118 remain distinguishable from deterministic structural diagnostics and can be disabled
- [ ] Duplicate sections remain inspectable and are reported as ambiguous rather than silently overwritten
- [ ] Ordinary acceptance-criteria bullets can remain extractable while receiving a configurable conformance warning
- [ ] Criteria state never changes task status automatically, and unchecked criteria on a done task are diagnostic policy rather than destructive behavior
- [ ] CLI text output is actionable and JSON output is stable for CI and automation
- [ ] Focused tests cover lifecycle-sensitive severity, strictness selection, and coexistence with malformed frontmatter diagnostics

## Non-Goals

- Rewriting invalid documents during validation
- Making every known section mandatory for every entity
- Treating custom or unknown sections as errors
- Replacing existing JSON Schema validation
