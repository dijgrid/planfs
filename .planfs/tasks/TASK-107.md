---
id: TASK-107
title: Add Git-native entity history workflows
status: done
createdAt: 2026-08-12T22:59:37.383Z
updatedAt: 2026-08-13T01:07:46.182Z
priority: medium
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
tags:
  - git
  - history
  - cli
  - vscode
dueDate: 2026-09-28
refinementState: ready
backlogOrder: 120
---

Turn Git's existing audit trail into a first-class PlanFS history workflow without storing duplicate activity data.

## Scope

- Add core Git helpers that find commits affecting one PlanFS entity across renames and archive moves where practical.
- Summarize metadata and body changes between entity revisions.
- Add `planfs history <id>` with text and JSON formats.
- Add a VS Code history view or editor action that opens commits/diffs through native Git affordances.

## Acceptance Criteria

- [x] CLI lists commits, timestamps, authors, and subjects for an entity
- [x] History follows active-to-archive moves and reports when continuity cannot be proven
- [x] A selected revision can show a readable metadata/body change summary
- [x] VS Code exposes history from task, epic, milestone, and decision surfaces
- [x] No history or activity files are written under `.planfs`
- [x] Behavior is clear for shallow clones, missing Git, uncommitted files, and renamed artifacts
- [x] Tests use isolated Git repositories and cover modification, archive move, rename, and deletion

## Findings

- PlanFS presents Git history as a core benefit but currently offers branch context and commit helpers rather than per-entity history.
- `planfs history TASK-098 --format json` returned Git commit hash, ISO timestamp, author, and subject without creating planning files.
