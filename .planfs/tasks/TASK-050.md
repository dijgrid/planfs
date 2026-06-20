---
id: TASK-050
title: Define backlog task states and refinement metadata
status: todo
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
---

Define the minimal file-format support needed to distinguish raw backlog items from refined, ready work without making task files noisy.

## Acceptance Criteria

- [ ] Task metadata can represent backlog refinement state without replacing the existing task status model
- [ ] Supported refinement states are documented and intentionally small, such as captured, needs-refinement, ready, deferred, and discarded
- [ ] Optional backlog ordering metadata is defined in a way that remains human-editable
- [ ] Parser and serializer preserve backlog metadata using existing camelCase output conventions
- [ ] Validation catches invalid refinement state and malformed ordering metadata
- [ ] Existing tasks without backlog metadata continue to load and validate unchanged
- [ ] Tests cover parsing, serialization, validation, and backward compatibility
