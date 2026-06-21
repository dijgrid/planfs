---
id: TASK-024
title: Add transactional bulk update workflows
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
  - transactions
  - phase-5
dueDate: 2026-10-21
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-21T18:24:21Z
refinementState: needs-refinement
backlogOrder: 20
---

Support managing many existing PlanFS tasks at once through safe, previewable bulk updates.

Importing external work items from CSV, Jira, GitLab, GitHub, or other systems is intentionally split out into `EPIC-external-import-workflows` so this task can focus on in-repository bulk edits.

## Acceptance Criteria

- [ ] Multiple tasks can be selected and updated together
- [ ] Bulk status, assignee, priority, milestone, and estimate updates work
- [ ] Bulk updates are available through shared core APIs, CLI workflows, and VS Code UI
- [ ] Bulk updates support a transaction-like preview/apply workflow
- [ ] Failed validation prevents partial writes and leaves existing artifacts unchanged
- [ ] Conflicts are detected before writing files
- [ ] Tests cover successful bulk updates, preview output, validation failures, rollback/no-partial-write behavior, and VS Code refresh behavior

## Questions

- [x] Should bulk update workflows start in the CLI, VS Code, core API, or all three in the first slice? **I think all three to really prove this feature out.  I definitely want bulk updates in the CLI but it's much easier for me to test from vscode.**
- [x] Should bulk updates write each artifact independently, or use a transaction-like preview/apply workflow with rollback on failure? **Oh transactions would be much better IMO, because they allow for rollbacks.  Lets do transactions here.**
- [x] Which fields are safe to bulk edit initially, and which should be excluded because they can break planning semantics? **What are your thoughts?  The first that come to my mind is assignee, priority, status, milestone, and estimate.  I think fields that aren't so free-form and such.**
- [x] How should imports map external IDs, statuses, users, labels, epics, and milestones into PlanFS fields? **Lets separate import from this task and make this task focus only on bulk edits within PlanFS**
- [x] Should CSV import require a mapping file, an interactive mapping step, or fixed column names? **Move to new task**
- [x] Should Jira imports preserve original issue keys as metadata for future traceability? **Moved to `TASK-070`.**
- [x] How should duplicate imported items be detected across repeated imports? **Moved to `TASK-070`.**
- [x] Should imports create missing epics and milestones automatically, or fail until the user maps them explicitly? **Moved to `TASK-070`.**
