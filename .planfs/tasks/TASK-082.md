---
id: TASK-082
title: Expand safe AI planning update commands
status: todo
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
refinementState: captured
createdAt: 2026-06-23T00:00:00Z
updatedAt: 2026-06-23T00:00:00Z
---

Expand AI-friendly planning updates beyond task metadata changes while keeping Markdown as the source of truth.

The AI epic questions indicate first-class commands should cover state transitions, task/epic/milestone creation, archive, and task assignment. These commands should generate or update Markdown directly, avoid cache files as a source of truth, and lose safely when files changed underneath an agent during a session.

## Acceptance Criteria

- [ ] AI-oriented update commands can create tasks, epics, and milestones using existing serializer behavior
- [ ] AI-oriented update commands can archive tasks and epics
- [ ] AI-oriented update commands can assign tasks
- [ ] Commands integrate with existing CLI groups where that is clearer than a standalone AI-only surface
- [ ] Commands can be run without mandatory dry-run mode, while still supporting previews for cautious workflows
- [ ] Commands detect stale input or changed files and refuse to overwrite newer human edits
- [ ] Tests cover successful updates and conflict refusal

## Questions

- [ ] What metadata, if any, should mark an AI-assisted planning update without adding noisy churn?
- [ ] Which command names best fit existing CLI conventions?
