---
id: TASK-089
title: Show all Markdown content in structured editors
status: todo
priority: high
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: ready
createdAt: 2026-07-07T03:51:23.762Z
updatedAt: 2026-07-07T04:19:05.046Z
---

Ensure task and epic structured editors display all meaningful information present in the underlying Markdown file.

The editor currently focuses on known schema fields and common planning sections, but important body content such as issue descriptions, free-form notes, or unrecognized Markdown sections can be absent from the UI. The structured view should make schema-backed fields easy to edit while still giving users a faithful read-only or safely editable fallback for Markdown content that does not map to a known field.

## Acceptance Criteria

- [ ] Task editor shows the Markdown body or issue description content in the UI
- [ ] Epic editor shows the Markdown body or description content in the UI
- [ ] Known schema fields remain structured and editable through existing controls
- [ ] Markdown sections or frontmatter data that do not map to known schema fields have a clear fallback display
- [ ] Fallback display preserves enough formatting and context for users to understand the original file
- [ ] Users have a clear path from fallback content to opening the raw Markdown when direct editing is safer there
- [ ] Save flows do not drop, reorder, or overwrite unmodeled Markdown content
- [ ] Tests cover task and epic files with ordinary bodies, extra sections, unknown metadata, and sparse schema fields

## Questions

- [x] Should fallback Markdown content be read-only in the structured editor, editable as raw Markdown, or editable section-by-section?
  - Answer: start read-only with a prominent "Open Markdown" path. Add targeted editing only for known safe sections later. This avoids lossy round-tripping while still making hidden information visible.
- [x] Should unknown frontmatter fields be shown separately from unknown body sections?
  - Answer: yes. Unknown frontmatter should appear in an "Additional metadata" area, while unmapped Markdown body sections should appear in an "Additional Markdown" area. That keeps structured data and prose distinct.
- [x] Should this share repair/fallback UI with malformed Markdown handling in `TASK-086`?
  - Answer: yes, share the same fallback display components and warning patterns, but keep the flows distinct. `TASK-086` is about recoverability and repair; this task is about completeness and faithful display for valid files.
- [x] How much Markdown rendering is enough before users should be sent to the raw file?
  - Answer: render common Markdown blocks well enough for reading: headings, paragraphs, links, lists, checklists, code blocks, blockquotes, and tables if already supported locally. Complex editing, unusual syntax, or ambiguous sections should send users to the raw Markdown file.
