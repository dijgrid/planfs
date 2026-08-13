---
id: TASK-105
title: Add PlanFS format versioning and migration previews
status: done
createdAt: 2026-08-12T22:59:37.143Z
updatedAt: 2026-08-12T23:28:12.124Z
priority: high
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
tags:
  - schema
  - migration
  - versioning
  - compatibility
dueDate: 2026-09-10
refinementState: ready
backlogOrder: 40
---

Define a real compatibility contract for evolving PlanFS files before custom fields and new entity families expand the format.

## Scope

- Decide whether format version belongs in repository configuration, individual artifacts, or both.
- Give exported schemas stable IDs and explicit versions.
- Load supported older formats without rewriting them during normal reads.
- Add a dry-run migration/upgrade plan showing every proposed file change.
- Apply migrations transactionally with backup/recovery guidance and validation before commit.

## Acceptance Criteria

- [x] Current repositories have an unambiguous inferred or explicit format version
- [x] Schemas expose stable version identifiers independent of package version
- [x] Unsupported newer versions fail with actionable compatibility guidance
- [x] `planfs migrate` or equivalent previews all changes without writing by default
- [x] Migration application validates the complete repository and avoids partial writes
- [x] Normal saves do not silently migrate unrelated artifacts
- [x] Documentation replaces unsupported versioning claims with the implemented contract
- [x] Tests cover current, older supported, newer unsupported, no-op, failed, and successful migrations

## Findings

- File-format documentation promises independently versioned schemas and migration-period compatibility, but files and schemas currently carry no usable format version.
- `planfs migrate --format json` previewed the legacy v1 marker without writing; workspace builds and validation passed.
