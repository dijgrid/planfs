---
id: TASK-114
title: Add a previewable idempotent Markdown formatter
status: todo
priority: medium
assignee: justin
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
dependsOn:
  - TASK-111
  - TASK-112
tags:
  - cli
  - formatter
  - markdown
  - safety
dueDate: 2026-12-05
refinementState: ready
backlogOrder: 50
createdAt: 2026-08-15T00:02:13.902Z
updatedAt: 2026-08-15T00:02:13.902Z
---

Add an explicit formatter and repair workflow for users who want canonical PlanFS Markdown structure. Build on the semantic parser so normalization is deterministic, narrowly scoped, and safe for custom sections and unsupported Markdown.

## Scope

- Provide check, preview/diff, and explicit apply modes for one entity or a bounded repository selection.
- Canonicalize recognized heading names, spacing, and checklist markers only where the semantic model proves the intended construct.
- Preserve preamble content, unknown sections, nested Markdown, comments, code, links, images, and other unsupported constructs.
- Refuse or skip ambiguous repairs such as duplicate recognized sections unless the chosen operation has an explicit lossless behavior.
- Reuse the existing YAML serializer for frontmatter and do not derive authoritative metadata from body prose.
- Add optimistic-concurrency or source-fingerprint protection so a preview cannot overwrite newer human edits.

## Acceptance Criteria

- [ ] Users can check conformance and preview an exact diff without writing files
- [ ] Applying an unchanged preview is protected against newer file edits
- [ ] Formatting canonicalizes only documented, semantically recognized constructs
- [ ] Unknown sections and unsupported Markdown are preserved without data loss
- [ ] Ambiguous duplicate sections are reported and not destructively merged by default
- [ ] A second formatter run produces no diff
- [ ] Formatting never creates `dependsOn`, epic, milestone, status, or other authoritative metadata from prose
- [ ] Batch formatting validates all proposed results before committing bounded writes
- [ ] Round-trip fixture tests cover custom sections, code fences, nested lists, links, HTML, comments, and mixed line endings
- [ ] CLI documentation clearly distinguishes validation, checking, previewing, and applying repairs

## Non-Goals

- Enforcing one section order across all repositories
- Acting as a general-purpose opinionated Markdown formatter
- Silently repairing ambiguous meaning
- Formatting as a side effect of ordinary reads or validation
