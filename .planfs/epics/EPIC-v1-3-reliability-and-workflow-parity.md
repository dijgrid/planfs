---
id: EPIC-v1-3-reliability-and-workflow-parity
title: v1.3 Reliability and Workflow Parity
status: completed
priority: high
owner: justin
description: Make everyday PlanFS workflows stable, complete, and safe before
  expanding the domain model.
targetDate: 2026-09-30
createdAt: 2026-08-12T22:59:18.853Z
updatedAt: 2026-08-13T01:14:43.046Z
---

Deliver the next PlanFS minor release around reliability and workflow parity. This version closes daily-use gaps found in refresh behavior, editing safety, validation visibility, multi-root workspaces, decisions, filters, CLI updates, archive semantics, and Git-native history.

## Outcomes

- Repository refreshes never discard valid local view state or unsaved editor drafts.
- Writes detect stale data before overwriting newer human changes.
- Core entities have coherent create, read, update, and navigation workflows.
- Validation and archive behavior make hidden or unhealthy planning state obvious.
- File-format evolution has an explicit, previewable compatibility story.

## Implementation Summary

- Added protected structured-editor drafts, stale-write detection, and incremental webview updates.
- Bound VS Code views to their selected workspace and coalesced watcher refreshes per workspace.
- Added strict validation, plan-health diagnostics, archive dispositions, format migration previews, saved-filter management, normal entity updates, decision lifecycle support, and Git-native entity history.
- Added isolated real VS Code extension-host smoke coverage alongside the fast mock suite.

## Architectural Decisions

- Planning remains Markdown/YAML-first: findings and history do not introduce separate stored entities or activity files.
- Shared repository behavior lives in `planfs-core`; CLI and VS Code consume the same validation and persistence paths.
- Refreshes deliver payload updates instead of rebuilding active webview documents, preserving valid user state.

## Child Tasks

- TASK-098: Protect structured editor drafts and detect write conflicts
- TASK-099: Add plan health diagnostics and strict warning modes
- TASK-100: Stabilize PlanFS views in multi-root workspaces
- TASK-101: Complete decision lifecycle workflows
- TASK-102: Add saved filter management workflows
- TASK-103: Complete task Findings section integration
- TASK-104: Centralize and coalesce VS Code repository refreshes
- TASK-105: Add PlanFS format versioning and migration previews
- TASK-106: Add general CLI entity update commands
- TASK-107: Add Git-native entity history workflows
- TASK-108: Add archive dispositions and unfinished-work protections
- TASK-109: Preserve webview state across repository refreshes
- TASK-069: Add real VS Code extension-host smoke tests
