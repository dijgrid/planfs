---
id: TASK-119
title: Integrate advisory non-LLM NLP analysis into PlanFS core and CLI
status: done
priority: high
assignee: justin
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
dependsOn:
  - TASK-118
tags:
  - nlp
  - core
  - cli
  - automation
dueDate: 2026-11-26
refinementState: ready
backlogOrder: 27
createdAt: 2026-08-15T00:24:03.867Z
updatedAt: 2026-08-15T02:51:29.001Z
---

Productionize the non-LLM NLP library, analyzer boundary, and PlanFS signals proven useful by TASK-117 and TASK-118. Ship the integration in core and CLI as an optional, local, advisory analysis layer over structurally parsed prose while keeping Markdown extraction, validation, and authoritative planning behavior deterministic when NLP is disabled or unavailable.

This task assumes the spikes identify at least one useful signal that meets the agreed accuracy, runtime, packaging, licensing, maintenance, and security thresholds. Signals that do not meet those thresholds remain experimental, deferred, or rejected rather than being included to satisfy the milestone superficially.

## Scope

- Add the selected library or adapter to the supported runtime and package it safely for both the CLI and VS Code extension consumers of core.
- Implement the analyzer interface defined in TASK-110 using only explicitly promoted behavior from the spike decision report.
- Analyze eligible prose nodes from the TASK-111 semantic document instead of reparsing Markdown or examining code and raw syntax.
- Return language, analyzer name and version, `nlp-inferred` provenance, source ranges, and documented evidence or confidence for every result.
- Support promoted signals such as modality, negation, conditions, observable actions, vague wording, compound criteria, dates or durations, and possible relationship mentions only where spike evidence justifies them.
- Provide explicit enablement and configuration through core and CLI, including supported-language behavior and a clean deterministic fallback when NLP is disabled, unsupported, or cannot load.
- Process ticket content locally without network calls and avoid logging or transmitting planning prose.
- Cache results by content, language, analyzer version, and relevant configuration while bounding memory and invalidating stale analysis correctly.
- Expose stable JSON for enabled analysis and keep all suggestions separate from authoritative entity fields and repository graph calculations.

## Acceptance Criteria

- [x] Core exposes an optional analyzer implementation using the spike-selected library or adapter
- [x] The CLI can explicitly enable NLP analysis and returns promoted signals through documented human-readable and JSON output
- [x] Structural semantic parsing, repository loading, and ordinary validation work unchanged when NLP is disabled or unavailable
- [x] Every result identifies its language, analyzer and version, `nlp-inferred` provenance, source range, and documented evidence or confidence
- [x] Only signals promoted by TASK-118 are included in the stable implementation
- [x] Code, inline code, raw markup, URLs, and other excluded Markdown nodes do not produce prose-analysis results
- [x] Possible dependencies, parents, status changes, and completion state remain suggestions and never mutate metadata or repository graph behavior
- [x] Analysis runs locally without sending planning content to a network service
- [x] Content and analyzer-aware caching meets the spike's performance thresholds and invalidates correctly after edits or upgrades
- [x] CLI and VS Code packaging include or resolve the analyzer and any compact model reproducibly without downloading code at runtime
- [x] Unsupported languages and analyzer load failures produce bounded advisory diagnostics rather than hiding entities or failing unrelated commands
- [x] Focused tests cover enablement, disabled fallback, signal serialization, privacy boundaries, caching, packaging, and authoritative-data isolation

## Decisions

- Ship `LocalRuleSemanticAnalyzer` as the TASK-117/TASK-118 selected adapter, with no third-party NLP library, model, remote service, or runtime download.
- Expose only modality, negation, condition, explicit date/duration, and nearby exact-ID relationship-mention signals. Deferred and experimental spike signals remain absent.
- Keep analysis explicitly opt-in through `runSemanticAnalysis({ enabled: true })` and `planfs show <id> --nlp`; preserve legacy output when disabled.
- Use a 256-entry defensive LRU cache keyed by body content, language, analyzer identity/version, and semantic profile identity/version.

## Findings

- Focused core and CLI tests cover source evidence, exclusions, signal serialization, disabled and unsupported fallback, bounded failure diagnostics, caching, and authoritative-data isolation.
- A production analyzer smoke benchmark processed about 20,144 uncached and 73,168 cached short documents per second on the reference machine, above the spike's 1,000 documents/second threshold.
- Package dry runs include `dist/semantic-analyzer.js` and declarations in `planfs-core`; CLI packaging resolves core normally, and the VS Code build resolves the same workspace dependency with no model asset.
- The stable interface and CLI JSON envelope are documented in `docs/SEMANTIC_ANALYSIS.md`.

## Non-Goals

- Shipping signals rejected or left experimental by the spikes
- Supporting arbitrary semantic-role labeling or unrestricted natural-language inference
- Using an LLM, remote analysis API, or runtime model download
- Automatically editing prose or authoritative frontmatter
