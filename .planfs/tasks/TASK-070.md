---
id: TASK-070
title: Define external import mapping and migration workflow
status: todo
priority: low
assignee: justin
epic: EPIC-external-import-workflows
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-002
  - TASK-003
tags:
  - import
  - migration
  - jira
  - gitlab
  - github
  - csv
dueDate: 2026-11-03
refinementState: ready
backlogOrder: 21
createdAt: 2026-06-21T18:24:21Z
updatedAt: 2026-07-30T22:45:41.335Z
---

Define an implementation-ready external import contract for bringing work items from CSV exports, Jira, GitLab, GitHub Issues, and other trackers into PlanFS.

This task produces the shared mapping, traceability, conflict, and preview design before provider-specific importers are built. CSV will be the first follow-on importer and will use a reusable YAML mapping file. Provider adapters should normalize source records into a shared import model; shared planning code should own mapping, validation, duplicate detection, preview, and apply behavior.

## Import Contract

- Add a documented normalized import-record and import-plan model that separates provider extraction from PlanFS mapping.
- Define a Git-tracked YAML mapping format for source fields, status values, users, labels/tags, epics, and milestones.
- Reserve a namespaced `external` metadata object containing `provider`, `id`, optional `key`, optional `url`, and an import `fingerprint`.
- Match repeated imports by normalized provider plus external ID. An unchanged fingerprint is a no-op; changed source data produces a previewed update; ambiguous matches are conflicts.
- Missing users may remain as source strings after preview. Missing epics and milestones must be explicitly mapped or created through an opt-in mapping rule; the default is to fail preview rather than silently create containers.
- Produce both machine-readable JSON plans and concise human-readable summaries before writing files.

## Acceptance Criteria

- [ ] Import workflow distinguishes provider-specific import adapters from shared mapping and validation behavior
- [ ] A design document defines normalized source records, mapping configuration, import plans, conflicts, and provider adapter boundaries
- [ ] CSV is identified as the first implementation and its YAML mapping format includes required columns, optional fields, value maps, and examples
- [ ] Jira, GitLab, and GitHub boundaries document how provider records normalize without embedding provider logic in core mapping
- [ ] The `external` metadata schema preserves provider identity and fingerprint data without adding provider-specific top-level fields
- [ ] Repeated, partial, unchanged, changed, and ambiguous imports have deterministic duplicate/conflict behavior
- [ ] Missing epics, milestones, users, and labels have explicit default and opt-in map/create/fail behavior
- [ ] JSON and human-readable preview formats show creates, updates, no-ops, warnings, and conflicts before writes
- [ ] Apply semantics reuse transactional validation and rollback behavior from in-repository bulk workflows
- [ ] Security guidance covers untrusted CSV/YAML input, formula-like values, URLs, path handling, and provider payloads
- [ ] Documentation clearly distinguishes external migration from normal bulk metadata updates and identifies follow-on implementation tasks

## Decisions

- [x] CSV is the first follow-on importer and uses a reusable YAML mapping file rather than an interactive-only workflow.
- [x] External identity uses a namespaced `external` object with provider, ID/key, source URL, and fingerprint.
- [x] Duplicate detection primarily uses provider plus external ID; fingerprints distinguish no-op and changed records.
- [x] Missing planning containers fail by default and may be created only through explicit mapping rules.
- [x] Previews support both JSON automation and human-readable review.

## Non-Goals

- Implementing CSV, Jira, GitLab, or GitHub provider adapters in this design task
- Live synchronization, webhooks, or bidirectional updates
- Storing provider credentials in `.planfs`
- Silently overwriting locally changed PlanFS artifacts
