---
id: TASK-019
title: Add pull request integrations
status: done
priority: high
assignee: justin
epic: EPIC-phase-4-collaboration
milestone: MILESTONE-phase-4
dependsOn:
  - TASK-014
tags:
  - github
  - gitlab
  - azure-devops
  - phase-4
dueDate: 2026-06-15
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-15T00:00:00Z
---

Link code review workflows to planning artifacts.

## Acceptance Criteria

- [x] Branch names are scanned for task IDs
- [x] PR templates mention related tasks
- [x] PR status appears in task views
- [x] GitHub, GitLab, and Azure DevOps are supported behind clear provider boundaries

## Implementation Notes

- Added `planfs pr summary` to generate Markdown or JSON planning context for pull requests.
- Added `.github/pull_request_template.md` with PlanFS related-task prompts.
- Task detail views show linked PR references detected from task links.
- Provider boundaries are explicit for GitHub, GitLab, and Azure DevOps; hosted API adapters can build on those boundaries later.
