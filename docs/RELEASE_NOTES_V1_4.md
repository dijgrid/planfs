# PlanFS 1.4 Release Notes

PlanFS 1.4 adds semantic Markdown inspection without changing the human-owned repository format. Existing format-v1 repositories remain readable and require no rewrite.

Highlights:

- loss-aware task, epic, milestone, and decision content profiles with exact source ranges and raw Markdown preservation;
- stable semantic inspection JSON for acceptance criteria, findings, sections, mentions, and authoritative relationships;
- compact shared semantic planning context for AI workflows and human review, including readiness and resolved authoritative relationships;
- baseline, automation-ready, and lifecycle-sensitive read-only validation;
- optional local English rule analysis with explicit provenance, evidence, confidence, bounded caches, and deterministic fallback;
- polished VS Code content/diagnostic views with acceptance progress, reduced empty-state clutter, collapsible secondary detail, clamped section previews, theme-safe visual states, reversible workspace-scoped suggestion dismissal, and a confirmed, explained Apply path for a small set of safely mapped metadata suggestions;
- conservative semantic formatting with exact preview edits, idempotence, whole-file stale protection, and immutable archived artifacts.
- a unified `PlanFS: Open Item` command for tasks, epics, milestones, and decisions.

Formatting is opt-in. `validate`, `inspect`, repository loading, and editor refresh never normalize source. Prose mentions never silently become dependencies, parents, status changes, or checked criteria. No LLM, remote prose service, model download, or non-English analyzer is included in 1.4.

The compatibility corpus and release verification cover canonical, legacy, custom/imported, ambiguous, duplicate, empty, malformed, and NLP-enriched tickets. Multilingual analysis is tracked separately and deferred beyond 1.4.
