---
id: TASK-024
title: Add bulk update and import workflows
status: todo
priority: medium
assignee: justin
epic: EPIC-bulk-import-workflows
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-012
  - TASK-013
tags:
  - bulk
  - import
  - phase-5
dueDate: 2026-10-21
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
refinementState: needs-refinement
backlogOrder: 20
---

Support managing or migrating many tasks at once.

## Acceptance Criteria

- [ ] Multiple tasks can be selected and updated together
- [ ] Bulk status, assignee, tag, epic, and milestone updates work
- [ ] CSV import is supported
- [ ] Jira and other export imports have a migration path
- [ ] Conflicts are detected before writing files

## Questions

- [ ] Should bulk update workflows start in the CLI, VS Code, core API, or all three in the first slice?
- [ ] Should bulk updates write each artifact independently, or use a transaction-like preview/apply workflow with rollback on failure?
- [ ] Which fields are safe to bulk edit initially, and which should be excluded because they can break planning semantics?
- [ ] How should imports map external IDs, statuses, users, labels, epics, and milestones into PlanFS fields?
- [ ] Should CSV import require a mapping file, an interactive mapping step, or fixed column names?
- [ ] Should Jira imports preserve original issue keys as metadata for future traceability?
- [ ] How should duplicate imported items be detected across repeated imports?
- [ ] Should imports create missing epics and milestones automatically, or fail until the user maps them explicitly?
