---
id: TASK-112
title: Validate semantic content profiles with stable diagnostics
status: done
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
updatedAt: 2026-08-15T03:33:12.944Z
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

- [x] Baseline and automation-ready content profiles can be selected explicitly
- [x] Existing frontmatter and repository validation continue to work independently of content-profile validation
- [x] Ready tasks can be checked for a meaningful preamble and usable acceptance criteria while captured tasks remain permissive
- [x] Missing, empty, duplicate, aliased, malformed, and wrong-shape recognized sections produce stable diagnostic codes
- [x] Diagnostics identify the file and narrowest available source range
- [x] Any NLP-assisted diagnostics selected by TASK-118 remain distinguishable from deterministic structural diagnostics and can be disabled
- [x] Duplicate sections remain inspectable and are reported as ambiguous rather than silently overwritten
- [x] Ordinary acceptance-criteria bullets can remain extractable while receiving a configurable conformance warning
- [x] Criteria state never changes task status automatically, and unchecked criteria on a done task are diagnostic policy rather than destructive behavior
- [x] CLI text output is actionable and JSON output is stable for CI and automation
- [x] Focused tests cover lifecycle-sensitive severity, strictness selection, and coexistence with malformed frontmatter diagnostics

## Decisions

- Keep semantic validation opt-in and separate from existing YAML schema and repository-integrity validation. Default `planfs validate` output and severity behavior remain unchanged.
- Expose explicit `baseline` and `automation-ready` tiers, plus independent lifecycle and local-analysis options. Non-ready backlog refinement states remain permissive.
- Preserve ordinary list criteria with `checked: null`; callers select `ignore`, `info`, `warning`, or `error` policy without changing source.
- Keep warnings advisory by default. Semantic errors fail validation, while `--strict` lets CI fail on repository or semantic warnings.

## Findings

- Stable enriched diagnostics now include code, severity, entity ID, file path, source range, section key, provenance, conformance domain, and repair guidance.
- Lifecycle checks use authoritative frontmatter for status and parentage, never inferred prose, and do not mutate task status or criterion state.
- Large semantic JSON output required the validate command to set an exit code and allow stdout to flush naturally rather than calling `process.exit` immediately.
- Full verification passes with 222 tests. The repository's explicit automation-ready, lifecycle, and local-analysis run reports 53 warnings, one informational diagnostic, and zero semantic errors across 66 entities; these warnings do not affect default validation.
- The public behavior and CLI examples are documented in `docs/SEMANTIC_VALIDATION.md`.

## Non-Goals

- Rewriting invalid documents during validation
- Making every known section mandatory for every entity
- Treating custom or unknown sections as errors
- Replacing existing JSON Schema validation
