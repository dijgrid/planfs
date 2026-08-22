---
id: TASK-120
title: Expose shared semantic planning context for agents and humans
status: done
priority: high
assignee: justin
createdAt: 2026-08-22T00:39:36.615Z
updatedAt: 2026-08-22T00:44:39.663Z
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
refinementState: ready
tags:
  - semantics
  - ai
  - context
  - cli
---

Turn the semantic document model into a compact planning context that agents can consume without reparsing Markdown and people can review without reading a raw JSON inspection envelope.

## Scope

- Add a shared core projection for one entity's intent, recognized sections, criteria, authoritative relationships, readiness, and diagnostics.
- Resolve authoritative relationship IDs to small entity summaries while keeping unresolved references visible.
- Expose the projection through `planfs ai context --id <entity-id>` as stable JSON or concise text.
- Keep advisory local analysis optional and visibly separate from authoritative planning data.
- Update agent-awareness guidance and workflow documentation to use semantic context after the repository summary identifies relevant work.

## Acceptance Criteria

- [x] Core returns a versioned semantic planning context without mutating repository data.
- [x] Context includes the entity preamble, recognized section content, acceptance criteria, findings, decisions, questions, and references.
- [x] Task context includes readiness plus resolved epic, milestone, and dependency summaries.
- [x] Missing authoritative references remain explicit and do not cause context generation to discard the entity.
- [x] CLI JSON is deterministic and text output is concise enough for human planning review.
- [x] Advisory analysis is disabled by default and can be explicitly enabled with analyzer identity and provenance preserved.
- [x] Agent-awareness and user documentation explain the summary-to-context workflow.
- [x] Focused core and CLI tests cover semantic projection, relationship resolution, human text output, and missing entities.

## Decisions

- Build on `inspectSemanticEntity` so context, CLI inspection, validation, and VS Code continue to share one parser and diagnostic model.
- Preserve semantic source ranges in the context contract so consumers can trace compact values back to human-owned Markdown.
- Treat frontmatter relationships as authoritative and prose-derived mentions or conclusions as advisory only.

## Findings

- `buildSemanticPlanningContext` now provides the versioned shared projection and keeps unresolved authoritative IDs explicit.
- `planfs ai context --id <id>` emits deterministic JSON by default, supports compact JSON and concise text, and enables local advisory analysis only with `--nlp`.
- Verification passed lint, all workspace builds, 251 workspace tests, repository validation, and text/compact-JSON smoke checks against this task.
- Full verification also exposed and repaired a pre-existing clock-boundary test fixture that became stale after 60 days; product backlog-readiness behavior was unchanged.

## Non-Goals

- Generating or rewriting a plan with an LLM
- Automatically converting prose mentions into dependencies or parent relationships
- Replacing the complete semantic inspection API or raw Markdown access
- Adding recursive transitive context that could grow without a predictable bound
