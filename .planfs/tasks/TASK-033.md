---
id: TASK-033
title: Improve graph affordances, filtering, and empty states
status: done
priority: medium
assignee: justin
epic: EPIC-visual-planning-experience
milestone: MILESTONE-visual-planning
dependsOn:
  - TASK-032
tags:
  - graph
  - vscode
  - usability
createdAt: 2026-06-19T00:00:00Z
updatedAt: 2026-06-19T20:08:35Z
---

Polish the dependency graph so it remains useful across repositories with many tasks, few dependencies, or incomplete planning metadata.

## Acceptance Criteria

- [x] Filters support epic, milestone, status, assignee, and dependency health
- [x] Legend explains node colors, edge direction, and warning states
- [x] Empty and sparse graphs provide useful next actions instead of blank views
- [x] Dependency warnings link back to the affected task files or structured editor
- [x] Graph rendering handles common repository sizes without noticeable lag
