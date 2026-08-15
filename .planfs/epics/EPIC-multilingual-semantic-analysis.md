---
id: EPIC-multilingual-semantic-analysis
title: Multilingual Semantic Analysis
status: on-hold
priority: medium
owner: justin
description: Extend local advisory semantic analysis beyond English with evidence-backed, language-specific analyzers.
tags:
  - semantics
  - nlp
  - internationalization
createdAt: 2026-08-15T18:31:05.501Z
updatedAt: 2026-08-15T18:31:05.501Z
---

Extend PlanFS semantic analysis beyond English while preserving the structural, local, advisory, and human-owned boundaries established by the v1.4 semantic document work.

This direction is approved but deferred beyond v1.4. Supporting a language means consistently useful signals for that language, not merely accepting its BCP 47 tag or translating English keyword lists.

## Outcomes

- Workspace and user settings support explicit language selection and a conservative language-detection policy.
- Each supported language has evidence-backed rules or local analyzers, representative labeled fixtures, documented limitations, and language-quality review.
- Analyzer results retain language, analyzer identity/version, provenance, source ranges, evidence or confidence, and advisory-only behavior.
- Unsupported languages fall back cleanly to deterministic structural parsing without hiding content or failing repository workflows.
- Local packaging, licensing, cache behavior, latency, and dependency size are evaluated per analyzer before adoption.
- CLI and VS Code communicate supported languages and fallback behavior consistently.

## Entry Criteria

- The v1.4 English semantic-analysis workflow is stable and its practical value has been reviewed.
- Initial target languages are selected from demonstrated user needs rather than assumed coverage.
- Evaluation includes native-speaker or qualified language review and representative planning-document fixtures.
- Proposed analyzers meet PlanFS requirements for local execution, bounded resource use, compatible licensing, and deterministic fallback.

## Constraints

- Markdown and YAML remain the human-owned source of truth.
- Structural parsing and validation must work without any language analyzer.
- Analysis remains local, optional, provenance-labeled, and advisory.
- Prose signals never silently modify authoritative frontmatter.
- No LLM or remote prose-analysis service is introduced by this epic.

## Non-Goals

- Claiming arbitrary-language support from a generic tokenizer alone
- Automatically translating planning documents
- Making natural-language analysis authoritative
- Replacing explicit Markdown content profiles with language classification

## Deferred Work

Child tasks will be refined when the entry criteria are met and initial target languages have been selected.
