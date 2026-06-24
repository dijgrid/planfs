---
id: TASK-082
title: Expand safe AI planning update commands
status: done
priority: high
assignee: justin
epic: EPIC-ai-integration
milestone: MILESTONE-phase-5
tags:
  - ai
  - cli
  - automation
  - planning
dueDate: 2026-10-18
refinementState: ready
createdAt: 2026-06-23T00:00:00Z
updatedAt: 2026-06-24T03:59:59.181Z
---

Expand AI-friendly planning updates beyond task metadata changes while keeping Markdown as the source of truth.

This task should wire AI-friendly preview/apply behavior into existing CLI surfaces where possible instead of creating a parallel AI-only command family. Cover the next narrow slice of planning operations: task/epic/milestone creation, task assignment, and task/epic archive. These commands should generate or update Markdown directly, avoid cache files as a source of truth, and lose safely when files changed underneath an agent during a session.

## Acceptance Criteria

- [x] Existing CLI create workflows support AI-friendly preview/apply output for tasks, epics, and milestones using existing serializer behavior
- [x] Existing archive workflows support AI-friendly preview/apply output for tasks and epics
- [x] Task assignment remains available through the safe task update workflow
- [x] Commands prefer existing CLI groups where that is clearer than a standalone AI-only surface
- [x] Commands can be run without mandatory dry-run mode, while still supporting previews for cautious workflows
- [x] Commands detect stale input or changed files and refuse to overwrite newer human edits
- [x] Tests cover successful updates and conflict refusal

## Questions

- [x] What metadata, if any, should mark an AI-assisted planning update without adding noisy churn? **Do not add default AI-specific metadata. Add a short Markdown note only when explicitly requested.**
- [x] Which command names best fit existing CLI conventions? **Prefer wiring existing CLI commands into AI-friendly preview/apply workflows rather than adding a parallel AI-only command family.**
