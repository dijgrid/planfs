---
id: TASK-108
title: Add archive dispositions and unfinished-work protections
status: todo
createdAt: 2026-08-12T22:59:37.503Z
updatedAt: 2026-08-12T23:04:00Z
priority: medium
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
tags:
  - archive
  - lifecycle
  - plan-health
  - safety
dueDate: 2026-09-22
refinementState: ready
backlogOrder: 100
---

Make archiving communicate intent and prevent unfinished work from silently disappearing from active planning.

## Scope

- Add an archive disposition such as `completed`, `cancelled`, `duplicate`, `deferred`, or `superseded`, plus an optional human note.
- Require explicit confirmation and disposition when archiving open tasks or active epics.
- Surface unfinished archived work in plan-health output.
- Preserve restore behavior and readable frontmatter.

## Acceptance Criteria

- [ ] Archive metadata records a validated disposition and optional note
- [ ] Archiving done work remains quick while open work requires an explicit reason
- [ ] Bulk epic archive assigns or confirms dispositions for child tasks coherently
- [ ] Archive list and VS Code Archive view display disposition and unfinished state
- [ ] Restore removes archive-only disposition metadata unless the user chooses to retain its note in Markdown
- [ ] Older archives without dispositions remain readable and receive a non-blocking diagnostic
- [ ] CLI, core, VS Code, file-format, and migration tests cover legacy and new archives

## Findings

- TASK-069 and its active epic had been archived while unfinished, making that work disappear from normal planning summaries without explaining why.
