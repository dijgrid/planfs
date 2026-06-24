---
id: TASK-079
title: Improve epic structured editor planning sections
status: done
priority: medium
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
tags:
  - vscode
  - editor
  - markdown
  - epics
dueDate: 2026-09-20
refinementState: ready
createdAt: 2026-06-23T00:00:00Z
updatedAt: 2026-06-23T00:00:00Z
---

Show questions and acceptance criteria clearly in the epic structured editor so users can review planning quality without opening raw Markdown.

## Acceptance Criteria

- [x] Epic body parsing recognizes Acceptance Criteria sections
- [x] Epic body parsing recognizes Questions sections
- [x] Checklist state is shown read-only in the structured editor
- [x] The epic editor labels these sections as epic planning notes
- [x] Users can still open the Markdown file for full body editing
- [x] Tests cover epic Acceptance Criteria and Questions rendering

## Notes

- Editing remains Markdown-first for now; this task is about readable display inside the editor.
