---
id: EPIC-semantic-planning-documents
title: Semantic Planning Documents
status: active
priority: high
owner: justin
description: Make PlanFS Markdown entities semantically inspectable, verifiable,
  and safely normalizable.
targetDate: 2026-12-15
createdAt: 2026-08-15T00:02:13.299Z
updatedAt: 2026-08-15T18:31:05.501Z
---

Make PlanFS planning artifacts useful as both human-authored documents and stable semantic inputs for automated processes. Core will interpret explicit Markdown structure conservatively, preserve raw content and source locations, and expose provenance when meaning comes from an alias or a limited inference rather than a canonical construct.

Dependencies, parent relationships, status, and other planning metadata remain authoritative in YAML frontmatter. Text such as `TASK-123` mentioned in prose may be exposed as a mention, but it must not silently become a dependency or other authoritative relationship.

## Outcomes

- Entity bodies have a shared, loss-aware semantic document model.
- Entity-specific content profiles define known sections and expected content shapes without rejecting custom sections.
- Validation produces stable, located diagnostics suitable for CLI, CI, editors, and agents.
- Core and CLI offer stable semantic inspection output.
- Core and CLI provide optional local non-LLM analysis for evidence-backed ticket-quality and possible-relationship signals.
- Formatting is opt-in, deterministic, idempotent, and conservative.
- VS Code presents extracted content and diagnostics without implementing a second parser.

## Interpretation Principles

- Prefer explicit Markdown signals such as headings, task-list markers, links, and code boundaries over natural-language guesses.
- Recognize canonical headings and a documented, intentionally small alias table; do not use fuzzy or AI-dependent heading classification.
- Preserve ordered source sections, raw Markdown, unknown content, and source ranges even when a normalized semantic view is available.
- Attach provenance such as `canonical`, `alias`, `rule-inferred`, or `nlp-inferred` to semantic values that automation may treat differently.
- Keep natural-language analysis optional, language-tagged, and advisory; NLP output must never silently become authoritative planning metadata.
- Report ambiguity instead of silently selecting among duplicate or contradictory sections.
- Keep validation read-only and make all rewrites explicit and previewable.

## Child Tasks

- TASK-110: Define semantic Markdown content profiles and extraction contract
- TASK-111: Parse Markdown bodies into a loss-aware semantic document model
- TASK-112: Validate semantic content profiles with stable diagnostics
- TASK-113: Expose semantic entity inspection through core and CLI
- TASK-114: Add a previewable idempotent Markdown formatter
- TASK-115: Surface semantic ticket content and diagnostics in VS Code
- TASK-116: Harden compatibility and document semantic automation workflows
- TASK-117: Evaluate non-LLM NLP libraries for semantic ticket analysis
- TASK-118: Prototype advisory NLP signals for ticket quality and relationships
- TASK-119: Integrate advisory non-LLM NLP analysis into PlanFS core and CLI
- TASK-120: Expose shared semantic planning context for agents and humans
- TASK-121: Polish semantic task view hierarchy and visual states

## Follow-on Epics

- EPIC-multilingual-semantic-analysis: Multilingual Semantic Analysis (`on-hold`; deferred beyond v1.4)

## Findings

- The v1.4 implementation now provides the loss-aware model, entity profiles, stable diagnostics, shared core/CLI inspection, optional local analysis, conservative formatter, and VS Code presentation described by this epic.
- TASK-116 release verification found the active repository baseline-conformant with zero semantic diagnostics; stricter automation-ready findings remain advisory and visible rather than triggering rewrites.
- The VS Code Apply path remains separate from analysis and accepts only narrow, explained, user-confirmed, validation-safe metadata changes.
- Core and `planfs ai context` now project bounded semantic intent, criteria, readiness, diagnostics, and resolved authoritative relationships for shared agent and human planning workflows.
- The VS Code semantic view now emphasizes primary planning content while suppressing empty groups, collapsing secondary detail, and presenting accessible, theme-safe progress and state cues.

## Questions

- Human release review should decide whether to apply the two optional milestone formatting previews; compatibility does not require them.

## Non-Goals

- Replacing Markdown bodies with JSON or YAML content fields
- Using an LLM to determine authoritative planning relationships
- Requiring all repositories to adopt one exact section order
- Automatically changing task status from acceptance-criteria state
- Treating every prose mention of an entity ID as a dependency
