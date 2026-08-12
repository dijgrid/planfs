---
id: TASK-101
title: Complete decision lifecycle workflows
status: todo
createdAt: 2026-08-12T22:59:36.668Z
updatedAt: 2026-08-12T23:04:00Z
priority: high
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
tags:
  - decisions
  - cli
  - vscode
  - workflow
dueDate: 2026-09-18
refinementState: ready
backlogOrder: 70
---

Bring decisions to the same lifecycle completeness as the other existing PlanFS entity types.

## Scope

- Add core template and next-ID helpers for decisions.
- Support decision creation in the CLI and VS Code.
- Add structured viewing and editing for decision status, date, author, context, outcome, consequences, and supersession links.
- Make Explorer and Insights navigation open decisions reliably.
- Validate supersession references and prevent contradictory cycles.

## Acceptance Criteria

- [ ] CLI can create, list, show, update, and validate decisions
- [ ] VS Code can create and edit decisions without requiring manual frontmatter authoring
- [ ] Explorer decision items open the intended decision
- [ ] Structured editors preserve arbitrary Markdown body content and unknown metadata
- [ ] Supersedes and supersededBy references navigate in both directions and validate safely
- [ ] Decision output remains clean camelCase YAML plus human-readable Markdown
- [ ] Core, CLI, and VS Code lifecycle tests cover the complete workflow

## Findings

- Decisions are loaded and listed in Explorer, but the structured editor explicitly excludes them and creation supports only tasks, epics, and milestones.
