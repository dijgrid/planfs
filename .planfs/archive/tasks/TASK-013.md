---
id: TASK-013
title: Implement search and saved filters
status: done
archive:
  archivedAt: 2026-06-24T01:55:21.269Z
  originalPath: .planfs/tasks/TASK-013.md
priority: medium
assignee: justin
epic: EPIC-phase-2-enhanced
milestone: MILESTONE-phase-2
dependsOn:
  - TASK-002
tags:
  - search
  - filtering
  - phase-2
dueDate: 2026-06-15
refinementState: ready
backlogOrder: 30
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-24T01:55:21.269Z
---

Help users find work quickly across large `.planfs` directories.

## Acceptance Criteria

- [x] Full-text search covers IDs, titles, metadata, and body content
- [x] Filters can target status, assignee, epic, priority, and tags
- [x] Saved filter definitions are named and reusable
- [x] Explorer and board views can consume filtered results

## Implementation Notes

- Added shared search and filter helpers in `planfs-core`.
- Saved filters are JSON files under `.planfs/filters/`.
- The VS Code explorer can apply or clear saved filters from the command palette.
- The VS Code board can select saved filters and combines them with local text search and sorting.
