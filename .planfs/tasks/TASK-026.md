---
id: TASK-026
title: Add risk and requirement entity support
status: todo
priority: medium
assignee: justin
epic: EPIC-risk-requirement-support
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-004
tags:
  - entities
  - risks
  - requirements
  - phase-5
dueDate: 2026-11-03
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
refinementState: needs-refinement
backlogOrder: 40
---

Expand PlanFS beyond the initial MVP entity types.

## Acceptance Criteria

- [ ] Risk entity type supports probability, impact, mitigation, and links to tasks
- [ ] Requirement entity type supports traceability to implementation tasks
- [ ] New entities have schemas and TypeScript types
- [ ] CLI and VS Code can list and open new entity types
- [ ] File format docs cover new entities

## Questions

- [ ] What are the minimum required fields for risk entities in the first version?
- [ ] What are the minimum required fields for requirement entities in the first version?
- [ ] Should risks and requirements have their own statuses, or reuse the existing task status vocabulary where possible?
- [ ] Should probability and impact be numeric scales, named levels, or configurable repository-specific values?
- [ ] Should requirements link directly to tasks only, or also to epics, milestones, decisions, and risks?
- [ ] Should risks support owners, review dates, residual risk, and resolution state in the first version?
- [ ] How should requirement traceability be displayed in VS Code: entity explorer, structured editor, graph view, or reports?
- [ ] Should CLI creation support be included in this task, or should this task only add list/open support for new entity types?
