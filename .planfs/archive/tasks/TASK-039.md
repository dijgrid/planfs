---
id: TASK-039
title: Suggest developers from repository history in UI inputs
status: done
archive:
  archivedAt: 2026-07-07T02:20:00.123Z
  originalPath: .planfs/tasks/TASK-039.md
priority: medium
assignee: justin
epic: EPIC-visual-planning-experience
milestone: MILESTONE-visual-planning
dependsOn:
  - TASK-030
tags:
  - vscode
  - git
  - editor
dueDate: 2026-06-19
refinementState: ready
backlogOrder: 100
createdAt: 2026-06-19T00:00:00Z
updatedAt: 2026-07-07T02:20:00.123Z
---

Collect developer identities from the Git repository and use them as suggestions in PlanFS UI inputs for task assignees, epic owners, and similar people fields.

## Acceptance Criteria

- [x] Developer suggestions are derived from Git history, such as author and committer names or emails
- [x] Suggestions appear in relevant VS Code dropdowns or comboboxes for assignee and owner fields
- [x] People fields remain editable string inputs and do not become enums or hard-coded lists
- [x] Users can still enter arbitrary names, handles, or emails that are not present in Git history
- [x] Duplicate identities are normalized enough to avoid noisy repeated suggestions
- [x] Repository scanning avoids blocking the UI and handles repositories with little or no history
- [x] Tests cover suggestion collection, normalization, empty repositories, and arbitrary manual input
