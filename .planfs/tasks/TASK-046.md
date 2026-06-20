---
id: TASK-046
title: Add board card quick actions
status: todo
priority: medium
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-011
  - TASK-045
tags:
  - vscode
  - board
  - actions
dueDate: 2026-08-28
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
---

Add focused card actions for common board workflows so users do not need to manually edit files for simple transitions.

## Acceptance Criteria

- [ ] Cards expose actions to open Markdown, open structured editor, copy task ID, start work, mark ready for review, and mark done
- [ ] Actions use the existing save path and preserve human-readable Markdown output
- [ ] Actions are hidden or disabled when they do not apply to the current task status
- [ ] Quick actions can be used with keyboard focus, not only mouse hover
- [ ] Failed writes show actionable VS Code error messages and refresh the board back to disk state
- [ ] Tests cover each supported action and invalid-state handling
