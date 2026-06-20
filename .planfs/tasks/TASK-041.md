---
id: TASK-041
title: Add native epic priority support
status: done
priority: high
assignee: justin
epic: EPIC-next-work-planning
milestone: MILESTONE-phase-5
dependsOn: []
tags:
  - core
  - schema
  - priority
  - next-work
dueDate: 2026-07-17
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
refinementState: ready
backlogOrder: 20
---

Support generic priority on epics using the same priority values as tasks so next-work ranking can account for the importance of the larger effort.

## Acceptance Criteria

- [x] Epic entities support optional `priority` with values `low`, `medium`, `high`, and `critical`
- [x] Parser and serializer preserve epic priority using camelCase frontmatter output conventions
- [x] Validation reports invalid epic priority values
- [x] JSON schema documents epic priority
- [x] File format documentation includes epic priority without introducing a separate urgency or business-value concept
- [x] Tests cover loading, saving, validating, and schema expectations for epic priority
