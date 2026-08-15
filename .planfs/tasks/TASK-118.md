---
id: TASK-118
title: Prototype advisory NLP signals for ticket quality and relationships
status: done
priority: medium
assignee: justin
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
dependsOn:
  - TASK-111
  - TASK-117
tags:
  - nlp
  - prototype
  - validation
  - automation
dueDate: 2026-11-24
refinementState: ready
backlogOrder: 25
createdAt: 2026-08-15T00:21:51.425Z
updatedAt: 2026-08-15T01:48:59.500Z
---

Prototype the NLP approach selected by TASK-117 on top of structurally extracted Markdown sections. Test whether classic NLP and PlanFS-owned token rules can provide trustworthy advisory signals about acceptance-criteria quality and possible relationships without changing authoritative metadata or making structural extraction depend on a language model.

## Prototype Scope

- Add an experimental analyzer interface whose absence leaves semantic parsing and validation fully functional and deterministic.
- Run NLP only on eligible prose nodes identified by the Markdown parser, excluding code, raw markup, URLs, and other structurally inappropriate content.
- Prototype signals for modality (`must`, `should`, `may`), negation, conditions, observable actions, actors or objects, vague wording, compound criteria, dates or durations, and possible entity relationship mentions.
- Return source ranges, language, analyzer name and version, provenance, and a calibrated confidence category or other documented evidence measure.
- Compare possible dependency or parent mentions with frontmatter and emit suggestions only; never create or update relationships.
- Cache analysis by body content and analyzer version, and measure repository-load and interactive-editor impact.
- Produce a decision report that promotes, defers, or rejects each signal before TASK-119 productionizes selected analysis and TASK-112 integrates any resulting diagnostics.

## Acceptance Criteria

- [x] The prototype consumes TASK-111 semantic sections rather than reparsing raw Markdown independently
- [x] NLP is optional and disabling or omitting it produces the same authoritative semantic document and repository state
- [x] Every NLP result is labeled `nlp-inferred` and includes language, analyzer identity, source range, and documented confidence or evidence
- [x] Code fences, inline code, URLs, and Markdown syntax do not generate prose-analysis false positives
- [x] Modality, negation, condition, action, vague-language, compound-criterion, and relationship-mention signals are evaluated against labeled fixtures
- [x] Possible dependencies and parent relationships remain suggestions and never modify frontmatter or repository graph behavior
- [x] False-positive and false-negative cases are recorded for every candidate production signal
- [x] Startup, throughput, cache effectiveness, package size, and VS Code extension impact remain within thresholds chosen by TASK-117 or are documented as reasons to defer
- [x] A decision report marks every signal as promote, experimental, defer, or reject and explains the evidence
- [x] TASK-119 receives only explicitly promoted analysis behavior; the prototype itself is not exposed as a stable public contract

## Decisions

- Promote exact modality, negation, bounded condition, explicit date/duration, and exact-ID relationship-phrase signals to TASK-119.
- Keep vague wording and compound criteria experimental, defer observable-action detection, and reject actor/object inference for v1.4.
- Use a PlanFS-owned local token-rule analyzer with no third-party NLP dependency; keep its eligible-prose projection and cache implementation private.

## Findings

- All five promoted signals reached 1.000 precision and recall on 47 Markdown-level fixtures, with zero code, raw-HTML, URL, source-range, or mutation failures.
- The final recorded prototype run measured a 4.068 ms cold start, 18,855 uncached parse-and-analysis documents per second, and 140,491 cached analyses per second on the reference machine.
- Action detection still confuses nouns with verbs and misses passive or descriptive forms. The complete evidence and production boundary are in `docs/SEMANTIC_NLP_PROTOTYPE.md`.

## Non-Goals

- Automatically repairing or rewriting prose
- Claiming complete actor-action-object or semantic-role understanding
- Supporting every natural language in the first prototype
- Making NLP a prerequisite for retrieving acceptance criteria or authoritative relationships
