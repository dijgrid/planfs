---
id: TASK-110
title: Define semantic Markdown content profiles and extraction contract
status: done
priority: high
assignee: justin
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
tags:
  - markdown
  - schema
  - semantics
  - design
dueDate: 2026-11-10
refinementState: ready
backlogOrder: 10
createdAt: 2026-08-15T00:02:13.421Z
updatedAt: 2026-08-15T01:13:12.166Z
---

Define the semantic contract that sits between raw Markdown bodies and PlanFS consumers. Distinguish the existing frontmatter schema, entity-specific Markdown content profiles, and repository-level relationship validation so callers can understand which facts are authoritative and which are interpretations of document structure.

## Scope

- Specify a shared semantic document model containing the preamble, ordered sections, normalized known-section views, raw Markdown, plain text where useful, and source ranges.
- Define content profiles for tasks, epics, milestones, and decisions, including canonical section keys, allowed aliases, cardinality, and expected block shapes.
- Define provenance values such as `canonical`, `alias`, `rule-inferred`, and `nlp-inferred`, plus ambiguity behavior for duplicate or conflicting recognized sections.
- Define an optional, language-aware analyzer boundary so structural extraction remains deterministic when no NLP model is installed or enabled.
- Specify stable serialized shapes for acceptance criteria, findings, decisions, references, generic sections, and entity mentions.
- Decide which rules belong to baseline conformance and which apply only to automation-ready or refinement-ready content.
- Document compatibility and versioning expectations for adding aliases, section keys, validation rules, and output fields.

## Loose Interpretation Contract

- Parse Markdown structurally rather than scanning individual lines. Headings or checklist-looking text inside code fences must not become semantic content.
- Treat content before the first level-two heading as the document preamble and expose it as the description candidate while preserving its Markdown blocks.
- Treat level-two headings as top-level semantic section boundaries. Lower-level headings remain nested within their containing section.
- Normalize heading matching by trimming whitespace, collapsing internal whitespace, comparing case-insensitively, and accepting only documented aliases. Punctuation normalization may be allowed when it is deterministic; fuzzy similarity and model-based classification are out of scope.
- Recognize `Acceptance Criteria` canonically. Explicit aliases such as `Acceptance` or `Success Criteria` must be documented individually rather than guessed.
- Extract task-list items under acceptance criteria with `checked: true` or `checked: false`. Ordinary list items in that section may be exposed as criteria with `checked: null` and a conformance warning instead of being discarded.
- Preserve duplicate recognized sections in source order. A convenience view may combine their items, but it must retain section provenance and emit an ambiguity diagnostic rather than silently choosing one.
- Preserve unknown headings as generic named sections so custom authoring remains available to callers and safe from formatter loss.
- Extract entity IDs found in prose or links only as non-authoritative mentions. `dependsOn`, `epic`, `milestone`, status, and similar relationships continue to come from frontmatter.
- Preserve raw Markdown and source ranges for every extracted section and item so editors and repair tools can make narrow changes.

## Acceptance Criteria

- [x] A design document distinguishes frontmatter schema, Markdown content profiles, and repository integrity rules
- [x] The semantic document, section, criterion, mention, provenance, source-range, and diagnostic shapes are specified
- [x] Task, epic, milestone, and decision profiles define canonical sections and a bounded alias policy
- [x] Preamble, heading hierarchy, code fences, task lists, ordinary lists, duplicates, unknown sections, and empty sections have deterministic behavior
- [x] Authoritative metadata is clearly separated from non-authoritative prose mentions and inferred content
- [x] NLP-derived signals have an explicit advisory contract, language tag, analyzer identity, provenance, and source range
- [x] Baseline and automation-ready conformance expectations are defined without making captured backlog items unnecessarily invalid
- [x] Compatibility rules cover additive section keys, aliases, diagnostics, and serialized semantic output
- [x] Representative canonical, loosely conformant, ambiguous, and malformed examples accompany the contract
- [x] The design explicitly preserves raw Markdown and source locations for round-trip editing
- [x] The design is reviewed before parser and validator behavior is finalized

## Decisions

- Use level-two headings as the only top-level semantic section boundary and keep lower-level headings nested.
- Keep frontmatter authoritative for metadata and relationships; body mentions and analyzer signals are advisory.
- Version the public semantic JSON contract separately from entity schemas, repository format, and content profiles.
- Preserve duplicate and unknown sections in source order, with diagnostics instead of implicit selection or rewriting.
- Require structural parsing to work without NLP and keep any future NLP adapter local, optional, and non-authoritative.

## Findings

- The proposed contract is documented in `docs/SEMANTIC_DOCUMENTS_V1_4.md` with typed shapes, profile tables, diagnostics, conformance tiers, compatibility rules, and representative examples.
- Existing core behavior already separates tolerant frontmatter loading, schema validation, repository integrity, and YAML serialization; semantic body parsing can be added as a separate PlanFS-owned API.
- The current loader trims the body's leading whitespace, so TASK-111 must deliberately establish a loss-aware raw-body input path before claiming exact source preservation.
- Reviewer feedback for future PlanFS UX: provide mouse-operated widgets for approving task reviews and toggling acceptance-criteria checkboxes without manually editing Markdown, while keeping every resulting file change explicit and readable.

## Questions

- Should public line and column values remain one-based as proposed or match VS Code's zero-based positions?
- Should repository mention resolution enrich the structural result or remain a separate repository-aware result?
- Should automation-ready and lifecycle diagnostics appear by default or require an explicit validation tier?
- Which optional NLP signals, if any, will satisfy the evidence and language-quality gates in TASK-117 and TASK-118?

## Non-Goals

- Implementing parsing, validation, CLI, or UI behavior in this task
- Treating natural-language interpretation as authoritative
- Moving body content into frontmatter
- Requiring a canonical section order for tolerant reads
