---
id: TASK-113
title: Expose semantic entity inspection through core and CLI
status: done
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
updatedAt: 2026-08-15T17:32:54.295Z
---

Expose semantic planning content through shared core APIs and one coherent CLI inspection surface. Automated callers should be able to retrieve an entity's authoritative metadata, normalized content, provenance, diagnostics, and raw source without knowing PlanFS heading conventions.

## Scope

- Export stable core types and functions for parsing and inspecting a loaded entity's semantic document.
- Extend an existing show or inspection workflow, or introduce one focused command if that produces a clearer contract.
- Support complete machine-readable output and focused selection of common views such as acceptance criteria, findings, sections, mentions, and authoritative relationships.
- Clearly distinguish `dependsOn`, epic, and milestone metadata from non-authoritative entity mentions found in body content.
- Include checked, unchecked, and uncheckable acceptance-criteria states without deriving task completion.
- Include enabled NLP signals and their provenance, language, analyzer identity, evidence, and advisory diagnostics without mixing them into authoritative metadata.
- Run the supported local analyzer by default in the normal human-facing inspection flow, with an explicit opt-out such as `--no-nlp`; keep machine-oriented validation enforcement opt-in.
- Collapse overlapping structural and NLP observations into concise actionable conclusions for text output while retaining complete raw signals in detailed JSON.
- Keep human-readable output concise while making JSON sufficiently complete for agents, CI, and integrations.

## Acceptance Criteria

- [x] Core consumers can retrieve the semantic document without importing CLI code
- [x] One documented CLI surface returns authoritative metadata, semantic content, provenance, and diagnostics as JSON
- [x] Callers can request acceptance criteria and determine checked, unchecked, and `null` states without parsing Markdown
- [x] Callers can retrieve generic ordered sections so custom content is not hidden
- [x] Authoritative relationships and body mentions are separate fields with unambiguous names
- [x] Enabled NLP signals are available through stable JSON and remain clearly distinguishable from structural semantics
- [x] Normal human-facing inspection runs supported local analysis by default and provides a documented explicit opt-out
- [x] Default text output favors deduplicated actionable conclusions while detailed JSON preserves complete analysis evidence
- [x] Raw body content remains available when exact source fidelity is required
- [x] Missing and malformed semantic sections produce diagnostics and partial output rather than an unusable response
- [x] JSON key naming and ordering are deterministic and covered by contract tests
- [x] Text output remains readable and does not dump unnecessary syntax-tree internals
- [x] Documentation includes agent, CI, release-summary, and editor integration examples

## Decisions

- Add a dedicated `planfs inspect <id>` command so the semantic JSON contract can evolve additively without changing legacy `planfs show` output.
- Use a versioned, deterministic envelope with fixed `entity`, `data`, and `diagnostics` fields; focused views change only the contents of `data`.
- Keep core analysis explicit while enabling the bundled local analyzer by default for interactive CLI inspection with `--no-nlp` as the opt-out.
- Return complete raw signals in JSON, but reduce normal text output to deduplicated actionable conclusions. Suppress relationship suggestions already represented by authoritative frontmatter.

## Findings

- The shared inspection API preserves raw Markdown, unknown and duplicate sections, source ranges, and all three acceptance-criterion states without mutating the loaded entity.
- Full inspection JSON for this task is approximately 47 KB, so the CLI allows stdout to flush naturally instead of exiting immediately.
- The built command inspected this repository's TASK-113 with 13 criteria, three ordered sections, five raw analyzer signals, one actionable conclusion, and zero semantic diagnostics.
- Full verification passes with 142 core tests, 48 VS Code tests, and 39 CLI tests.

## Questions

- Whether interactive language selection should eventually use workspace settings or conservative language detection remains deferred to TASK-116; v1.4 currently defaults inspection to English and reports unsupported languages.
- Whether legacy `show --nlp` should eventually redirect to or be deprecated in favor of `inspect` depends on usage evidence and is not required for this additive contract.

## Non-Goals

- Providing an arbitrary natural-language query engine
- Treating semantic inspection as permission to modify files
- Exposing parser-library-specific AST nodes as the public API
- Making advisory NLP findings fail validation unless the caller explicitly selects that policy
