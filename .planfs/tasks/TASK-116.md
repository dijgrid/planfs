---
id: TASK-116
title: Harden compatibility and document semantic automation workflows
status: done
priority: medium
assignee: justin
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
dependsOn:
  - TASK-113
  - TASK-114
  - TASK-115
tags:
  - documentation
  - compatibility
  - automation
  - release
dueDate: 2026-12-15
refinementState: ready
backlogOrder: 70
createdAt: 2026-08-15T00:02:14.143Z
updatedAt: 2026-08-15T21:28:08.193Z
---

Harden semantic document behavior against real repository variation and publish the compatibility and automation guidance needed to ship PlanFS 1.4.0 confidently.

## Scope

- Update the file-format specification with content profiles, canonical sections, aliases, structural and NLP provenance, validation levels, and formatter guarantees.
- Decide and document whether semantic reads are an additive v1 capability and which future changes would require a format or API version transition.
- Build a representative fixture corpus from canonical, legacy, loosely structured, custom, imported, and malformed Markdown without rewriting project artifacts into throwaway fixtures.
- Test large-repository performance and avoid reparsing unchanged bodies unnecessarily.
- Document CLI JSON contracts and examples for agents, CI checks, release reports, acceptance-criteria inspection, and editor integrations.
- Document NLP enablement, supported language and analyzer limitations, local model packaging, caching, provenance, advisory semantics, and deterministic fallback behavior.
- Define stable workspace and user settings for automatic interactive analysis, explicit validation enablement, language selection or detection, and complete disablement.
- Harden suppression and dismissal behavior so repeated advisory findings remain quiet without altering source Markdown or authoritative metadata.
- Add a safe explicit Apply workflow for supported metadata suggestions. The control must be paired with an explanation widget showing why the suggestion exists, its source evidence, the exact field/value change, and that the user—not the analyzer—is authorizing an authoritative metadata edit.
- Document archived semantic artifacts as immutable and excluded from formatting. If archive-time formatting is later exposed, it must be an explicit option applied and previewed before the artifact moves into the archive.
- Measure incremental analysis latency and cache behavior for viewed and changed tickets, with graceful fallback when a language or analyzer is unsupported.
- Run the full release verification suite and validate the repository's own planning artifacts under the intended baseline and automation-ready profiles.

## Acceptance Criteria

- [x] `docs/FILE_FORMAT.md` accurately describes semantic interpretation and does not claim unsupported behavior
- [x] Canonical section names, explicit aliases, profile rules, provenance, and diagnostic stability are documented
- [x] Compatibility guidance explains which repositories need no rewrite and when explicit formatting is useful
- [x] A mixed-style fixture corpus covers legacy, canonical, custom, imported, ambiguous, and malformed documents
- [x] Parser and validation performance are measured on a large synthetic or fixture repository with an agreed regression threshold
- [x] Automation examples retrieve acceptance criteria, distinguish dependencies from mentions, enforce a selected profile, and preview formatting
- [x] NLP documentation identifies promoted signals, known limitations, enablement controls, local-processing guarantees, and behavior when analysis is unavailable
- [x] Interactive analysis defaults, opt-out controls, validation opt-in behavior, and language fallback are documented and covered by tests
- [x] Advisory suppression is stable, reversible, scoped, and never encoded as an inferred authoritative relationship
- [x] Any Apply control is limited to safely mapped suggestions, explains its evidence and exact metadata change before confirmation, uses normal validation and stale-write protection, and never mutates source from an unsupported or ambiguous signal
- [x] Incremental local analysis and cache performance meet an agreed editor-interaction threshold on the representative corpus
- [x] The pre-v1.4 canonical task corpus remains semantically readable, with intentional updates documented as the corpus grows
- [x] Release notes identify semantic inspection as additive and formatting as opt-in
- [x] Lint, workspace builds, workspace tests, CLI validation, and relevant CLI smoke checks pass
- [x] Milestone and epic outcomes are reviewed against actual verified behavior before completion

## Non-Goals

- Publishing optimistic compatibility claims without fixture and command evidence
- Reformatting all existing `.planfs` artifacts solely to demonstrate the formatter
- Expanding into natural-language requirement inference or arbitrary document classification

## Decisions

- Semantic reads remain additive within repository format v1; the semantic document, inspection JSON, profiles, diagnostics, and formatter retain independent version contracts.
- Archived artifacts are immutable and excluded from formatting. Any future archive-time format option must preview and apply before the archive move.
- The editor Apply path is limited to existing, type-compatible task `dependsOn`, `epic`, and `milestone` targets and requires explanation, confirmation, validation, and a current `updatedAt` token.
- Interactive supported-English analysis is automatic and workspace-disableable; validation/CI analysis remains explicitly opt-in.

## Findings

- The six-style compatibility corpus preserves canonical, legacy, custom/imported, ambiguous/duplicate, empty, and malformed Markdown while exposing diagnostics.
- The local measurement parsed and automation-ready validated 1,000 mixed documents in 84.12 ms and served 100 unchanged cached inspections in 3.49 ms; checked regression budgets are 5,000 ms and 1,000 ms respectively.
- Full verification passed with 155 core, 50 VS Code, and 41 CLI tests. Repository validation has zero errors; baseline semantic validation has zero diagnostics across 67 active entities.
- Automation-ready validation remains valid with advisory findings. A repository-wide formatter check identified two optional active-milestone normalizations, no blockers, and made no writes.

## Questions

- Should the two optional milestone formatting previews be applied before the 1.4 release? They are not required for compatibility.
- Non-English analysis remains deferred to `EPIC-multilingual-semantic-analysis`; v1.4 intentionally ships only the proven English signals.
