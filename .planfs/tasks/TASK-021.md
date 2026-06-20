---
id: TASK-021
title: Add branch-aware planning views
status: done
priority: medium
assignee: justin
epic: EPIC-phase-4-collaboration
milestone: MILESTONE-phase-4
dependsOn:
  - TASK-014
tags:
  - git
  - branches
  - phase-4
dueDate: 2026-06-15
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-15T00:00:00Z
refinementState: ready
backlogOrder: 30
---

Support planning workflows that happen on feature branches.

## Acceptance Criteria

- [x] Show tasks added on the current branch
- [x] Show tasks modified on the current branch
- [x] Preview task changes from a PR
- [x] Detect conflicting task changes
- [x] Suggest merge resolutions for common conflicts

## Implementation Notes

- Added shared Git planning helpers in `planfs-core`.
- Added `planfs branch` with text and JSON output.
- Added a Branch tab to the VS Code Insights view.
- Branch context compares `.planfs` changes against a base ref and includes working-tree changes.
- PR preview is local and provider-neutral; provider-backed pull request APIs belong in `TASK-019`.
