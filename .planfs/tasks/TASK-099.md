---
id: TASK-099
title: Add plan health diagnostics and strict warning modes
status: done
createdAt: 2026-08-12T22:59:36.432Z
updatedAt: 2026-08-12T23:26:30.382Z
priority: high
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
tags:
  - validation
  - cli
  - plan-health
  - reliability
dueDate: 2026-09-08
refinementState: ready
backlogOrder: 30
---

Make validation warnings and broader plan-health problems visible without turning expected historical references into unusable noise.

## Scope

- Always summarize warnings in text validation output, including when the repository has no errors.
- Add `--strict` so CI can optionally fail on warnings.
- Add a focused plan-health or `doctor` report for unfinished archived work, active archived containers, stale review work, inconsistent lifecycle state, and noisy historical references.
- Group repeated warning classes and preserve detailed JSON output for automation.

## Acceptance Criteria

- [x] `planfs validate` reports warning counts even when validation succeeds
- [x] `--verbose` prints warning details and paths without requiring an error
- [x] `--strict` returns a non-zero exit code when warnings exist
- [x] Plan-health output distinguishes actionable issues from accepted historical references
- [x] Archived open tasks and archived active epics are explicitly reported
- [x] JSON output remains stable and includes summary counts by severity and category
- [x] Documentation explains validation, strict CI, and plan-health use cases
- [x] Tests cover clean, warning-only, error, strict, and grouped-output cases

## Findings

- The repository produced 44 validation warnings while normal text output reported only that it was valid.
- Most warnings came from completed work that had not been archived with its completed epic.
- `npm run build --workspace=planfs-cli`, `npm run lint --workspace=planfs-cli`, JSON validation, and `planfs doctor --format json` passed. Strict validation correctly exits non-zero for the repository's 11 warnings.
