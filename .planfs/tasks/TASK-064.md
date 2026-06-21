---
id: TASK-064
title: Add next-work quick view to the PlanFS explorer
status: todo
priority: high
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-005
  - TASK-040
  - TASK-043
tags:
  - vscode
  - explorer
  - next-work
  - ux
dueDate: 2026-09-06
createdAt: 2026-06-21T00:00:00Z
updatedAt: 2026-06-21T00:00:00Z
refinementState: ready
backlogOrder: 85
---

Add a compact Next Work quick view to the PlanFS Explorer so users can see the best next task without opening the full board.

The view should be glanceable and action-oriented: one primary recommendation, a short explanation, and direct actions to open the task or jump into the fuller Next Work board when more context is needed.

## Acceptance Criteria

- [ ] PlanFS Explorer shows a compact Next Work section when at least one actionable task exists
- [ ] The section highlights the top recommended task with title, priority, status, due date or target context, and a concise ranking reason
- [ ] The quick view can open the task artifact directly
- [ ] The quick view can open the full Next Work board for deeper triage
- [ ] Empty, blocked-only, and no-repository states are handled without noisy placeholder text
- [ ] The quick view refreshes when planning files change or task metadata is updated
- [ ] The UI remains visually lightweight and does not duplicate the full board columns or detailed ranking list
- [ ] Tests or extension coverage verify recommendation selection, refresh behavior, and command wiring

## Questions

- [ ] Should the Explorer show only the single best task, or also one small secondary candidate?  **I think showing the top three would be ideal plus a quick link to open the full next work board**
- [ ] Should the quick view be pinned at the top of the Explorer or grouped near tasks? **I think at the top, to make it prominent but also not use too much screen space (as the previous question suggests)**
- [ ] Should users be able to hide this section if they prefer the Explorer to remain purely navigational? **No**
- [ ] Should the primary action be "Open Task", "Start Work", or "Open in Next Work"? **Open Task**
