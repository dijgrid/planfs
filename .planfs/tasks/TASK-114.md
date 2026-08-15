---
id: TASK-114
title: Add a previewable idempotent Markdown formatter
status: done
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
updatedAt: 2026-08-15T19:39:00.393Z
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

- [x] Users can check conformance and preview an exact diff without writing files
- [x] Applying an unchanged preview is protected against newer file edits
- [x] Formatting canonicalizes only documented, semantically recognized constructs
- [x] Unknown sections and unsupported Markdown are preserved without data loss
- [x] Ambiguous duplicate sections are reported and not destructively merged by default
- [x] A second formatter run produces no diff
- [x] Formatting never creates `dependsOn`, epic, milestone, status, or other authoritative metadata from prose
- [x] Batch formatting validates all proposed results before committing bounded writes
- [x] Round-trip fixture tests cover custom sections, code fences, nested lists, links, HTML, comments, and mixed line endings
- [x] CLI documentation clearly distinguishes validation, checking, previewing, and applying repairs

## Decisions

- Limit v1.4 formatting to uniquely recognized level-two headings and acceptance/release criterion markers proven by the shared semantic model.
- Preserve frontmatter and all source outside exact formatter edits byte-for-byte; prose never produces metadata edits.
- Make preview the default CLI mode, make `--check` read-only with a non-zero changes-needed result, and require whole-file SHA-256 preview fingerprints for `--apply`.
- Validate every selected proposed result and recheck all fingerprints before the first bounded batch write.
- Treat archived artifacts as immutable history: formatter selection ignores them, including `--all`. A future archive workflow may offer an explicit pre-archive formatting option, but no formatter operation edits an artifact after it enters the archive.

## Findings

- Duplicate recognized section keys can be safely reported and skipped while independent unique sections in the same document remain formatable.
- Offset-based replacements preserve custom sections, nested content, code, links, images, raw HTML, comments, frontmatter, and mixed line endings without a general Markdown reserialization pass.
- A repository-wide check selected 67 active entities, proposed 12 ordinary-to-unchecked release-criterion marker edits across two milestones, found no blocked documents, and wrote no files.

## Non-Goals

- Enforcing one section order across all repositories
- Acting as a general-purpose opinionated Markdown formatter
- Silently repairing ambiguous meaning
- Formatting as a side effect of ordinary reads or validation
