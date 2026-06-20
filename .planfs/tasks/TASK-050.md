---
id: TASK-050
title: Define backlog task states and refinement metadata
status: done
priority: high
assignee: justin
epic: EPIC-backlog-management
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-041
tags:
  - core
  - backlog
  - file-format
dueDate: 2026-09-25
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
refinementState: ready
backlogOrder: 10
---

Define the minimal file-format support needed to distinguish raw backlog items from refined, ready work without making task files noisy.

## Acceptance Criteria

- [x] Task metadata can represent backlog refinement state without replacing the existing task status model
- [x] Supported refinement states are documented and intentionally small, such as captured, needs-refinement, ready, deferred, and discarded
- [x] Optional backlog ordering metadata is defined in a way that remains human-editable
- [x] Parser and serializer preserve backlog metadata using existing camelCase output conventions
- [x] Validation catches invalid refinement state and malformed ordering metadata
- [x] Existing tasks without backlog metadata continue to load and validate unchanged
- [x] Tests cover parsing, serialization, validation, and backward compatibility
