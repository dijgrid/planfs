---
id: TASK-020
title: Add CI validation workflows
status: done
priority: high
assignee: justin
epic: EPIC-phase-4-collaboration
milestone: MILESTONE-phase-4
dependsOn:
  - TASK-007
tags:
  - ci
  - validation
  - phase-4
dueDate: 2026-06-15
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-15T00:00:00Z
---

Make repository validation usable in automation.

This is the first implementation slice for Phase 4. CI should use the same validation pipeline as the CLI and editor, with a machine-readable output mode that future provider integrations can consume without scraping text.

## Acceptance Criteria

- [x] GitHub Actions workflow validates `.planfs`
- [x] Validation results are machine-readable
- [x] Invalid planning changes can block PRs
- [x] GitLab CI and Azure Pipelines examples exist

## Implementation Notes

- Add `planfs validate --format json` with stable counts and validation result fields.
- Keep exit codes unchanged: `0` when valid, `1` when invalid or unreadable.
- Add a repository workflow that runs on pushes and pull requests.
- Document GitHub Actions, GitLab CI, and Azure Pipelines examples.
