---
id: TASK-022
title: Add team discussion and notification features
status: todo
priority: medium
assignee: justin
epic: EPIC-phase-4-collaboration
milestone: MILESTONE-phase-4
dependsOn:
  - TASK-012
tags:
  - collaboration
  - phase-4
dueDate: 2026-10-03
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
refinementState: needs-refinement
backlogOrder: 40
---

Add lightweight collaboration around planning artifacts.

## Acceptance Criteria

- [ ] Task comments have a clear storage model
- [ ] Mentions can identify team members
- [ ] Discussions support resolution state
- [ ] Notifications cover assignment, mentions, and unblocked work
- [ ] Notification rules are configurable

## Questions

- [ ] Should discussions live inline in task Markdown, in separate discussion files, or in an external provider integration?
- [ ] Should comments be Git-native and committed with planning changes, or treated as local/team runtime data outside the main artifact history?
- [ ] How should team members be identified for mentions: Git author emails, GitHub usernames, VS Code account identity, or repository configuration?
- [ ] Should notification delivery be limited to local VS Code indicators first, or include external channels such as email, Slack, GitHub, or pull request comments?
- [ ] What should count as "unblocked work" for notifications, and how often should that state be recalculated?
- [ ] Should resolved discussions remain visible in normal task views, collapse by default, or move into a separate history section?
- [ ] How should notification preferences be stored so they do not create noisy repository churn?
