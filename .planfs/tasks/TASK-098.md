---
id: TASK-098
title: Protect structured editor drafts and detect write conflicts
status: todo
createdAt: 2026-08-12T22:59:36.310Z
updatedAt: 2026-08-12T23:04:00Z
priority: high
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
tags:
  - vscode
  - editor
  - reliability
  - concurrency
dueDate: 2026-09-05
refinementState: ready
backlogOrder: 20
---

Prevent repository refreshes and concurrent file edits from discarding or overwriting work in the structured entity editor.

## Scope

- Track whether a structured editor form has unsaved changes.
- Refresh clean editors incrementally without replacing the webview document.
- Keep dirty editors stable and notify the user when disk data changes underneath them.
- Carry the entity's loaded `updatedAt` value as an optimistic concurrency token when saving.
- Offer explicit reload, compare/open Markdown, and retry choices after a conflict.

## Acceptance Criteria

- [ ] Unrelated `.planfs` file changes do not clear form values, focus, scroll position, or validation messages
- [ ] Clean editors update from disk without reconstructing the webview
- [ ] Dirty editors retain their draft when the underlying entity changes
- [ ] Saving refuses to overwrite an entity whose `updatedAt` differs from the loaded token
- [ ] Conflict UI identifies the changed entity and provides safe recovery actions
- [ ] Task, epic, and milestone editors share the same draft and conflict behavior
- [ ] Tests cover clean refresh, dirty refresh, stale saves, deleted entities, and successful retry

## Findings

- `EntityEditorProvider.refresh()` currently assigns new HTML to every open panel.
- Structured editor saves reload current disk state but do not verify that the form was based on that version.
