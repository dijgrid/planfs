---
id: TASK-117
title: Evaluate non-LLM NLP libraries for semantic ticket analysis
status: done
priority: medium
assignee: justin
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
dependsOn:
  - TASK-110
tags:
  - nlp
  - research
  - typescript
  - architecture
dueDate: 2026-11-14
refinementState: ready
backlogOrder: 15
createdAt: 2026-08-15T00:21:51.301Z
updatedAt: 2026-08-15T01:48:41.466Z
---

Run a time-boxed evaluation of non-LLM natural-language processing libraries that could enrich PlanFS semantic documents without weakening deterministic structural interpretation. Compare `winkNLP` as the recommended full TypeScript candidate, `compromise` as the lighter pattern-oriented candidate, and `retext` if the Markdown architecture adopts the unified ecosystem. Record spaCy's rule-based matcher as an optional external-runtime reference rather than a default dependency.

The spike may recommend one library, a narrow hybrid, an analyzer plugin boundary with no built-in NLP dependency, or no NLP integration if the measured value does not justify its accuracy, size, maintenance, or runtime cost.

## Evaluation Scope

- Build a labeled fixture set from real PlanFS criteria plus synthetic canonical, vague, conditional, compound, negated, and relationship-mention examples.
- Compare sentence boundaries, tokenization, lemmas, parts of speech, modality, negation, dates and durations, custom entity recognition, and token-pattern ergonomics.
- Measure support for identifying observable actions, conditional clauses, vague wording, multiple independent clauses, and possible entity relationships.
- Evaluate TypeScript quality, CommonJS and ESM compatibility, Node and VS Code extension packaging, browser compatibility where relevant, model loading, install and bundle size, startup time, throughput, caching, licensing, maintenance, and security posture.
- Measure precision and recall for each proposed PlanFS signal and document false positives that could mislead automation.
- Define a minimum evidence threshold for promoting a signal into production, while allowing useful lower-confidence results to remain experimental or be rejected.

## Acceptance Criteria

- [x] A checked-in evaluation document compares winkNLP, compromise, retext, and the no-NLP baseline against PlanFS-specific requirements
- [x] The evaluation uses a labeled fixture corpus rather than demonstration sentences alone
- [x] Precision, recall, false-positive examples, startup cost, throughput, and package or model size are recorded reproducibly
- [x] CommonJS, ESM, CLI packaging, and VS Code extension-host implications are tested or explicitly documented
- [x] The spike distinguishes deterministic token rules from statistical POS, entity, or other model-derived results
- [x] Each candidate signal has a promote, experimental, defer, or reject recommendation
- [x] The recommendation identifies whether NLP should be built in, optional, adapter-based, or omitted
- [x] Any selected library has an acceptable license, maintenance posture, security posture, and supported runtime story
- [x] The outcome defines work handed to TASK-118 and does not ship an undocumented runtime dependency
- [x] Rejecting all candidates is considered a valid successful spike outcome when supported by evidence

## Decisions

- Keep the optional `SemanticAnalyzer` boundary, but add no third-party NLP runtime dependency in v1.4.
- Send PlanFS-owned token rules to TASK-118 for Markdown-level prototyping; they remain advisory and are versioned as an analyzer.
- Prototype modality, negation, condition, explicit date/duration, and exact-ID relationship phrases. Keep vague wording and compound criteria experimental; defer action and reject actor/object inference for v1.4.

## Findings

- On the 40-example labeled corpus, the no-dependency baseline achieved 0.984 precision, 0.923 recall, and 0.952 F1, outperforming the three library candidates on aggregate F1.
- POS-backed action detection produced more misleading false positives without a compensating accuracy gain. The full results and reproducible methodology are in `docs/SEMANTIC_NLP_EVALUATION.md` and `spikes/semantic-nlp/`.
- The experimental lockfile installed 33 packages and reported zero known audit vulnerabilities. These packages remain isolated from PlanFS runtime dependencies.

## Non-Goals

- Shipping NLP behavior to CLI or VS Code users
- Training a large or generative language model
- Inferring authoritative status, ownership, dependencies, or completion from prose
- Replacing Markdown structure and content profiles with natural-language classification
