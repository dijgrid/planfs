---
id: TASK-034
title: Replace timeline block list with a real time-axis visualization
status: done
priority: high
assignee: justin
epic: EPIC-visual-planning-experience
milestone: MILESTONE-visual-planning
dependsOn:
  - TASK-030
tags:
  - timeline
  - vscode
  - visualization
createdAt: 2026-06-19T00:00:00Z
updatedAt: 2026-06-19T20:08:35Z
---

Redesign the timeline view so time is represented spatially instead of as a list of date-bearing items.

## Acceptance Criteria

- [x] Timeline has a clear now marker anchored in the viewport
- [x] Historical completed work appears to the left of now and future planned work appears to the right
- [x] Tasks, epics, and milestones are placed according to due dates, target dates, and completion dates when available
- [x] Items without dates remain discoverable without distorting the time axis
- [x] The view communicates overdue, upcoming, and completed work at a glance
