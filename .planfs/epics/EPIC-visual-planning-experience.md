---
id: EPIC-visual-planning-experience
title: Visual Planning Experience
status: active
owner: justin
description: Make dependency, timeline, and epic editor views more useful for day-to-day project planning
targetDate: 2026-12-01
createdAt: 2026-06-19T00:00:00Z
updatedAt: 2026-06-19T00:00:00Z
---

Improve the VS Code visual planning experience so developers can understand task flow, schedule direction, and epic-specific work without reading every Markdown file individually.

## Goals

- Render task dependencies as an understandable graph, including flow from epics into their tasks.
- Make timeline views express time spatially, with history to the left of now and future work to the right.
- Turn the epic structured editor into a useful planning surface with an epic-scoped task board.

## Child Tasks

- TASK-030: Define shared visual planning view model
- TASK-031: Redesign dependency graph layout around epic-to-task flow
- TASK-032: Add interactive dependency highlighting to the graph view
- TASK-033: Improve graph affordances, filtering, and empty states
- TASK-034: Replace timeline block list with a real time-axis visualization
- TASK-035: Add timeline navigation, grouping, and schedule context
- TASK-036: Build epic-scoped task query support for editors
- TASK-037: Add epic task board to the structured editor
- TASK-038: Add visual planning tests and documentation
- TASK-039: Suggest developers from repository history in UI inputs
