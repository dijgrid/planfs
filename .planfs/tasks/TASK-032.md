---
id: TASK-032
title: Add interactive dependency highlighting to the graph view
status: todo
priority: high
assignee: justin
epic: EPIC-visual-planning-experience
milestone: MILESTONE-visual-planning
dependsOn:
  - TASK-031
tags:
  - graph
  - vscode
  - interaction
createdAt: 2026-06-19T00:00:00Z
updatedAt: 2026-06-19T00:00:00Z
---

Add graph interactions that make dependency relationships easy to inspect without losing the surrounding project context.

## Acceptance Criteria

- [ ] Clicking a task highlights its direct prerequisites and downstream dependents
- [ ] A selected task shows enough details to identify status, priority, assignee, epic, and relevant dates
- [ ] Indirect dependency paths can be distinguished from direct dependencies
- [ ] Selection can be cleared without reloading the view
- [ ] Keyboard focus and screen-reader labels support the same inspection workflow

