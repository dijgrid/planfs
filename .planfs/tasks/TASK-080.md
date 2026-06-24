---
id: TASK-080
title: Make the insights timeline easier to scan
status: done
priority: high
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
tags:
  - vscode
  - insights
  - timeline
  - ux
dueDate: 2026-09-21
refinementState: ready
createdAt: 2026-06-23T00:00:00Z
updatedAt: 2026-06-23T00:00:00Z
---

Reduce timeline card overlap and make the Timeline tab the first Insights view.

## Acceptance Criteria

- [x] Timeline is the first and default active Insights tab
- [x] Timeline cards use a more compact default presentation
- [x] Users can switch between compact and detailed card density
- [x] Cards with nearby dates stack into available lanes instead of directly overlapping
- [x] Timeline canvas height grows to fit stacked lanes
- [x] Insights tabs include short descriptive text explaining what each tab helps with
- [x] Tests cover the new Timeline-first tab order and density controls

## Follow-Up Ideas

- Add explicit zoom or scale controls such as week, month, quarter, half-year, and year.
- Consider grouped cluster summaries for very dense date ranges.
- Preserve the selected timeline density across sessions if users rely on a preferred mode.
