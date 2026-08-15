---
id: TASK-113
title: Expose semantic entity inspection through core and CLI
status: todo
priority: high
assignee: justin
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
dependsOn:
  - TASK-111
  - TASK-112
tags:
  - core
  - cli
  - automation
  - json
dueDate: 2026-12-02
refinementState: ready
backlogOrder: 40
createdAt: 2026-08-15T00:02:13.781Z
updatedAt: 2026-08-15T00:02:13.781Z
---

Expose semantic planning content through shared core APIs and one coherent CLI inspection surface. Automated callers should be able to retrieve an entity's authoritative metadata, normalized content, provenance, diagnostics, and raw source without knowing PlanFS heading conventions.

## Scope

- Export stable core types and functions for parsing and inspecting a loaded entity's semantic document.
- Extend an existing show or inspection workflow, or introduce one focused command if that produces a clearer contract.
- Support complete machine-readable output and focused selection of common views such as acceptance criteria, findings, sections, mentions, and authoritative relationships.
- Clearly distinguish `dependsOn`, epic, and milestone metadata from non-authoritative entity mentions found in body content.
- Include checked, unchecked, and uncheckable acceptance-criteria states without deriving task completion.
- Include enabled NLP signals and their provenance, language, analyzer identity, evidence, and advisory diagnostics without mixing them into authoritative metadata.
- Keep human-readable output concise while making JSON sufficiently complete for agents, CI, and integrations.

## Acceptance Criteria

- [ ] Core consumers can retrieve the semantic document without importing CLI code
- [ ] One documented CLI surface returns authoritative metadata, semantic content, provenance, and diagnostics as JSON
- [ ] Callers can request acceptance criteria and determine checked, unchecked, and `null` states without parsing Markdown
- [ ] Callers can retrieve generic ordered sections so custom content is not hidden
- [ ] Authoritative relationships and body mentions are separate fields with unambiguous names
- [ ] Enabled NLP signals are available through stable JSON and remain clearly distinguishable from structural semantics
- [ ] Raw body content remains available when exact source fidelity is required
- [ ] Missing and malformed semantic sections produce diagnostics and partial output rather than an unusable response
- [ ] JSON key naming and ordering are deterministic and covered by contract tests
- [ ] Text output remains readable and does not dump unnecessary syntax-tree internals
- [ ] Documentation includes agent, CI, release-summary, and editor integration examples

## Non-Goals

- Providing an arbitrary natural-language query engine
- Treating semantic inspection as permission to modify files
- Exposing parser-library-specific AST nodes as the public API
