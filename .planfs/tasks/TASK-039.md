---
id: TASK-039
title: Suggest developers from repository history in UI inputs
status: todo
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
createdAt: 2026-06-19T00:00:00Z
updatedAt: 2026-06-19T00:00:00Z
---

Collect developer identities from the Git repository and use them as suggestions in PlanFS UI inputs for task assignees, epic owners, and similar people fields.

## Acceptance Criteria

- [ ] Developer suggestions are derived from Git history, such as author and committer names or emails
- [ ] Suggestions appear in relevant VS Code dropdowns or comboboxes for assignee and owner fields
- [ ] People fields remain editable string inputs and do not become enums or hard-coded lists
- [ ] Users can still enter arbitrary names, handles, or emails that are not present in Git history
- [ ] Duplicate identities are normalized enough to avoid noisy repeated suggestions
- [ ] Repository scanning avoids blocking the UI and handles repositories with little or no history
- [ ] Tests cover suggestion collection, normalization, empty repositories, and arbitrary manual input

