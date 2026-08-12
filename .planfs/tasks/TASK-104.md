---
id: TASK-104
title: Centralize and coalesce VS Code repository refreshes
status: todo
createdAt: 2026-08-12T22:59:37.024Z
updatedAt: 2026-08-12T23:04:00Z
priority: high
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
tags:
  - vscode
  - refresh
  - performance
  - architecture
dueDate: 2026-09-15
refinementState: ready
backlogOrder: 60
dependsOn:
  - TASK-098
---

Replace repeated full repository reloads with one coalesced refresh pipeline that distributes a shared snapshot to bound views.

## Scope

- Debounce or coalesce bursts of watcher events per workspace.
- Load and validate one repository snapshot for a refresh cycle.
- Pass the snapshot or derived payloads to Explorer, Backlog, Archive, Board, Insights, and clean editors.
- Prevent self-generated save events from triggering redundant refresh work.
- Preserve view-local state and the draft protections introduced by TASK-098.

## Acceptance Criteria

- [ ] One logical file change causes at most one repository load per workspace refresh cycle
- [ ] Rapid create/change/delete bursts are coalesced without losing the final state
- [ ] Views receive a consistent snapshot rather than independently loading at different times
- [ ] Refresh errors are isolated and surfaced without permanently breaking later refreshes
- [ ] Save-triggered watcher events do not cause visible flicker or duplicate renders
- [ ] Timing diagnostics can measure refresh phases locally
- [ ] Tests cover event bursts, concurrent workspaces, failed loads, self-writes, and final-state correctness

## Relationship to TASK-025

This task establishes the refresh architecture needed by the broader 10,000-task caching, indexing, and virtualization work in TASK-025.
