---
id: TASK-111
title: Parse Markdown bodies into a loss-aware semantic document model
status: done
priority: high
assignee: justin
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
dependsOn:
  - TASK-110
tags:
  - core
  - markdown
  - parser
  - semantics
dueDate: 2026-11-20
refinementState: ready
backlogOrder: 20
createdAt: 2026-08-15T00:02:13.543Z
updatedAt: 2026-08-15T01:38:30.933Z
---

Add a real Markdown parsing layer in `planfs-core` that produces the semantic document contract from TASK-110 while retaining the original body. Use a standards-oriented Markdown syntax tree so headings, lists, links, nesting, inline formatting, HTML, and fenced code are interpreted by structure rather than fragile line matching.

## Scope

- Select and integrate a maintained Markdown parser with source-position support and an acceptable dependency footprint.
- Parse the preamble and ordered heading sections without changing existing frontmatter parsing or tolerant repository loading.
- Recognize canonical section headings and explicit aliases through entity-specific profiles.
- Extract task-list and ordinary-list acceptance criteria, including checked state, nested content, raw Markdown, normalized text, provenance, and source range.
- Expose findings, decisions, references, generic sections, and non-authoritative entity mentions using the shared model.
- Keep parse failures local to the affected body and return useful diagnostics without hiding unrelated repository entities.
- Cache or defer semantic parsing where appropriate so ordinary repository operations do not regress unreasonably on large plans.

## Acceptance Criteria

- [x] Core parses Markdown through a syntax tree rather than heading and checklist regular expressions alone
- [x] Preamble and section boundaries follow the contract from TASK-110
- [x] Headings and task-list-like text in fenced or indented code are never extracted as semantic sections or criteria
- [x] Canonical and aliased headings produce the same normalized section key with different provenance
- [x] Acceptance criteria preserve text, checked state or `null`, nesting, order, source section, raw Markdown, and source range
- [x] Duplicate recognized sections and unknown sections remain present in source order
- [x] Entity mentions are exposed separately from authoritative frontmatter relationships
- [x] Malformed or unsupported Markdown degrades to preserved raw content and diagnostics instead of losing the entity
- [x] Focused unit tests cover canonical, aliased, mixed-style, duplicate, nested, code-fenced, HTML, empty, and malformed bodies
- [x] Parser behavior is deterministic across repeated reads and does not mutate source files

## Decisions

- Use `@lezer/markdown` with its GFM extensions for a maintained CommonMark syntax tree, exact offsets, task markers, and CommonJS compatibility.
- Expose `parseSemanticDocument` as an explicit deferred core API instead of parsing every entity during repository loading.
- Keep parser nodes private and return only versioned PlanFS semantic types, profiles, ranges, diagnostics, and advisory mentions.
- Preserve the exact supplied body and use zero-based UTF-16 offsets with one-based lines and columns, as proposed by TASK-110.

## Findings

- `commonmark` was evaluated first but rejected before implementation because its inline nodes do not expose source positions; Lezer provides exact inline and block offsets with a smaller direct dependency surface.
- Semantic parsing catches body-local failures and returns the untouched source plus a baseline diagnostic instead of affecting tolerant repository loading.
- The existing frontmatter parser still trims leading body whitespace; semantic ranges are loss-aware relative to the exact body string supplied by the caller, without changing that established loader behavior in this task.
- The new parser dependency and its transitive packages report no known npm audit vulnerabilities at installation time.

## Non-Goals

- Enforcing content-profile requirements
- Reformatting Markdown
- Inferring dependencies or status from prose
- Adding separate parsers in the CLI or VS Code extension
