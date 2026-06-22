---
id: TASK-077
title: Compact fixed-width fields in the PlanFS editor
status: done
priority: medium
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
tags:
  - vscode
  - editor
  - ux
  - layout
dueDate: 2026-09-19
refinementState: ready
createdAt: 2026-06-22T06:19:08Z
updatedAt: 2026-06-22T06:22:33.224Z
---

Make the PlanFS structured editor more compact by inlining labels with fixed-width metadata controls where the label and input are both short and predictable.

The goal is to reduce vertical space in task, epic, and milestone forms without making the editor harder to scan. This should favor dense, work-focused metadata rows for fields like ID, status, priority, due date, and estimate while leaving longer free-text and relationship fields in the current stacked layout.

## Acceptance Criteria

- [ ] Fixed-width fields such as ID, status, priority, due date, target date, and estimate can render as compact label-plus-control rows
- [ ] Compact fields use stable widths so controls do not shift or resize awkwardly across entity types
- [ ] Long or variable-width fields such as title, assignee/owner, epic, milestone, tags, dependencies, links JSON, and Markdown sections remain easy to scan and edit
- [ ] The layout works for task, epic, and milestone editor forms
- [ ] The editor remains usable on narrow VS Code panels by falling back to stacked labels when needed
- [ ] Keyboard navigation, labels, and accessible names continue to work for compact fields
- [ ] Existing save, validation, archive, and open Markdown behaviors are unchanged
- [ ] Tests cover compact field rendering for at least task and non-task editor forms

## Design Notes

- Good candidates for inline treatment are fields with constrained value widths: ID, status, priority, due date, target date, and estimate.
- Less predictable fields should probably stay stacked because they benefit from full width and readable labels.
- A compact metadata band near the top of the editor may be clearer than trying to inline every individual label throughout the form.
- The layout should reduce vertical space, but not become a dense wall of controls; grouping and scan order still matter.
