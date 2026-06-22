---
id: TASK-076
title: Add backlog quick view to the PlanFS explorer
status: todo
priority: medium
assignee: justin
epic: EPIC-backlog-management
milestone: MILESTONE-phase-5
tags:
  - vscode
  - explorer
  - backlog
  - ux
dueDate: 2026-09-18
refinementState: needs-refinement
createdAt: 2026-06-22T06:10:56Z
updatedAt: 2026-06-22T06:10:56Z
---

Add a compact Backlog quick view to the PlanFS Explorer so users can see backlog items without opening the full backlog webview.

The explorer view should complement the dedicated backlog command. It should provide a lightweight entry point for scanning backlog work and jumping into the full backlog or task editor when refinement needs more space.

## Acceptance Criteria

- [ ] PlanFS Explorer shows a Backlog section when active backlog items exist
- [ ] The section includes tasks with backlog refinement states such as `captured`, `needs-refinement`, `deferred`, and `ready`
- [ ] Items show task ID, title, refinement state, priority, and due date or epic/milestone context when available
- [ ] Items clearly indicate tasks that need backlog review using the same readiness logic as the backlog view
- [ ] Backlog items can open the task Markdown file or structured editor directly from the Explorer
- [ ] The section offers a clear path to open the full backlog webview
- [ ] Empty and no-backlog states avoid noisy placeholder items
- [ ] The section refreshes when task metadata, refinement state, or backlog readiness changes
- [ ] Tests cover rendering, filtering, readiness indicators, command wiring, and refresh behavior

## Questions

- [ ] Should the Explorer show only non-ready backlog items by default, or include ready backlog items as well?
- [ ] Should the section be ordered by backlog order, readiness blockers, due date, or the same ordering as `listBacklogTasks`?
- [ ] Should archived and discarded backlog items stay hidden from this quick view?
