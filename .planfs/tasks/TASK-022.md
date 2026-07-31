---
id: TASK-022
title: Add local attention notifications and external discussion links
status: todo
priority: low
assignee: justin
epic: EPIC-phase-4-collaboration
milestone: MILESTONE-phase-4
dependsOn:
  - TASK-012
tags:
  - collaboration
  - phase-4
dueDate: 2026-10-03
refinementState: ready
backlogOrder: 40
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-07-30T22:40:34.236Z
---

Help users notice planning work that needs their attention without turning the Git repository into a chat or notification database.

PlanFS should derive attention signals from the current repository state and surface them locally in VS Code. Durable discussion remains in the team's existing collaboration system and can be referenced through the task's existing `links` metadata. Important conclusions can still be summarized in the task body or a PlanFS decision artifact.

## Scope

- Add a pure core API that derives attention items from a repository snapshot for newly assigned work, newly unblocked work, mentions in committed task content, and approaching or overdue due dates.
- Add a VS Code attention view or notification surface backed by the core API.
- Let users configure their identity and mention aliases in workspace-local VS Code settings.
- Store dismissal, acknowledgement, snooze, and last-seen state in VS Code workspace-local storage.
- Surface task `links` clearly in the structured editor so external discussions can be opened in their owning system.
- Recompute attention items after normal PlanFS repository refreshes and when relevant task metadata changes.

## Acceptance Criteria

- [ ] Core exposes deterministic attention-item derivation without reading or writing editor-local state
- [ ] Attention items cover assignment, mentions in committed task content, newly unblocked work, and approaching or overdue due dates
- [ ] VS Code identifies the current user through workspace-local identity and alias configuration
- [ ] VS Code presents attention items with a direct path to the related task
- [ ] Users can acknowledge, dismiss, or snooze attention items without changing `.planfs` files
- [ ] An acknowledged item can reappear when the underlying task state changes materially
- [ ] Task editors render existing external `links` as openable discussion or context references
- [ ] Notification categories and due-date thresholds are configurable through workspace-local preferences
- [ ] Core and VS Code tests cover derivation, identity matching, local acknowledgement state, refresh behavior, and reopening changed items
- [ ] Documentation explains which state is Git-tracked and which state remains local or external

## Decisions

- [x] Discussion and chat content will not be stored in `.planfs` or committed as PlanFS artifacts.
- [x] Existing task `links` metadata will point to discussions owned by GitHub, Slack, or another external system.
- [x] Important durable outcomes belong in task Markdown or decision artifacts, not copied chat transcripts.
- [x] Notification delivery is local to VS Code in this task; email, chat, and provider delivery are deferred.
- [x] User identity, aliases, preferences, and read/dismissed state are workspace-local and never serialized into planning artifacts.
- [x] "Newly unblocked" means an open task whose declared dependencies have all transitioned to done since the user's locally recorded last-seen state.

## Non-Goals

- Git-native comments, replies, reactions, or discussion-resolution records
- Chat transcripts or one-file-per-comment storage under `.planfs`
- Shared read/unread or dismissal state
- Slack, email, GitHub, or pull-request notification delivery
- Replacing external team discussion systems
