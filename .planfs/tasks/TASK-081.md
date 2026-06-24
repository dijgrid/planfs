---
id: TASK-081
title: Design contextual help for PlanFS views
status: done
priority: medium
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
tags:
  - vscode
  - help
  - ux
  - documentation
dueDate: 2026-09-24
refinementState: ready
createdAt: 2026-06-23T00:00:00Z
updatedAt: 2026-06-24T02:07:00.000Z
---

Design a lightweight contextual help system for PlanFS webviews so users can ask for guidance without permanently consuming panel space.

The requirement here is to provide a help system for users which utilizes widgets or other small UI elements to alert user's to the availablilty of help without directly occupying screen space unless the user requests it.  Part of this task is to plan out a proper backend help managemenet system which is populated with help text associated with contexts which are used to pull up the help document.

## Acceptance Criteria

- [x] Define a reusable help icon and placement pattern for VS Code webviews
- [x] Define whether help opens as an inline panel, side panel, modal, or dedicated help view
- [x] Add initial help topics for Insights Timeline, Dependency Graph, Reports, Branch, Backlog, and structured editor sections
- [x] Help text explains what each view helps users decide or do, not just what controls exist
- [x] Help affordances are keyboard accessible and screen-reader friendly
- [x] Help content stays grounded in implemented behavior

## Notes

- Implemented Markdown-backed help topics under `src/vscode/resources/help`.
- Added a reusable contextual help panel and icon pattern for the Backlog, Insights, and structured editor webviews.
- Help opens on demand as a non-modal side panel and links back to the source Markdown topic.

## Questions

- [x] Should help content live in code, Markdown docs, or a small structured registry? **The help content should be stored in markdown so it's easy to consume and edit. Furthermore, it would be ideal to store the "context" of the help within the markdown document as well.  This context data will be used to pull up help documentation given a help widget on a particular UI panel, view, etc.**
- [x] Should help topics link to local docs when deeper explanation is useful? **Yes, it would be great to support both abbreviated help text which can be shown quickly in the UI *and* link to a full up markdown document for in-depth information.  This probably means that help text markdown documents need context data, abbreviate help/description, and full help text**
- [x] Should help usage be available in both VS Code webviews and CLI output later? **This should be available in both locations**.
