---
id: EPIC-backlog-management
title: Backlog Management Workflow
status: completed
owner: justin
description: Add backlog intake, refinement, ordering, and hygiene workflows for
  PlanFS tasks
targetDate: 2026-10-16
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-07-07T02:19:31Z
---

Make PlanFS useful before work is ready to start by supporting backlog intake, refinement, ordering, and cleanup.

The backlog workflow should help users capture rough work, refine it into actionable tasks, keep priorities and ordering understandable, and regularly identify stale or low-value items. It complements Next Work: backlog management decides what deserves to become ready work, while Next Work recommends what to pick up now.

## Child Tasks

- TASK-050: Define backlog task states and refinement metadata
- TASK-051: Add backlog query and ordering APIs
- TASK-052: Add backlog CLI workflows
- TASK-053: Add backlog management view in VS Code
- TASK-054: Add backlog hygiene and stale-item review
- TASK-055: Add backlog documentation and examples
- TASK-066: Redesign backlog view around browse-and-edit workflow
- TASK-071: Preserve backlog filters after saving edits
- TASK-076: Add backlog quick view to the PlanFS explorer

## Open Questions

- [x] Should the task metadata field be named `refinementState`, `backlogState`, or something else? Current recommendation: `refinementState`. **Yes, use `refinementState`.**
- [x] Should tasks without refinement metadata be treated as `ready`, or as outside the backlog workflow unless explicitly included?  **Lets just treat them as `ready` but please move existing tasking in this repository to backlog refinement**
- [x] Are the supported refinement states final as `captured`, `needs-refinement`, `ready`, `deferred`, and `discarded`? **Yes these sound fine**
- [x] Should optional backlog ordering use one simple numeric field such as `backlogOrder`, or should ordering be scoped by epic, milestone, or another context? **Lets scope them within epics if they have it otherwise use a global `backlogOrder`**
- [x] Which fields are required for an item to be considered ready? Current recommendation: body and priority always, with epic and milestone required only when configured by caller options.  **Lets go with the recommendations here**
- [x] What default age should make a backlog item stale? Current recommendation: 60 days without updates, excluding `done`, `discarded`, and recently deferred items. **Agreed on 60 days**
- [x] Is this CLI shape acceptable: `planfs backlog list`, `planfs backlog capture`, `planfs backlog set-state`, and `planfs backlog review`? **Yup!**
- [x] Should the VS Code backlog experience be a new mode in the existing board webview, or a separate command/view? **I'd prefer that the backlog is an entirely new command/view**
- [x] Should example backlog metadata be added to this repository's real `.planfs` tasks, or should docs use separate sample snippets only? **Yes!**
