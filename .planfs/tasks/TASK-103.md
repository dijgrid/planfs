---
id: TASK-103
title: Complete task Findings section integration
status: todo
createdAt: 2026-08-12T22:59:36.905Z
updatedAt: 2026-08-12T23:04:00Z
priority: high
assignee: justin
epic: EPIC-v1-3-reliability-and-workflow-parity
milestone: MILESTONE-v1-3
tags:
  - findings
  - markdown
  - vscode
  - tasks
dueDate: 2026-09-05
refinementState: ready
backlogOrder: 10
---

Finish the lightweight task-level Findings convention across PlanFS without introducing a separate entity type.

## Scope

- Recognize `## Findings` wherever task planning sections are rendered.
- Keep Findings read-only in structured views and editable in the canonical Markdown file.
- Ensure paragraphs, bullets, checklists, links, and code evidence remain readable without rewriting the body.
- Add a small starter section to task templates only when a selected repository template requests it; do not generate empty sections by default.

## Acceptance Criteria

- [ ] Backlog and structured task editors render Findings as a named planning section
- [ ] Insights or search results continue to include findings through full-body search
- [ ] Metadata saves preserve Findings content byte-for-byte
- [ ] Open Markdown remains the clear editing path
- [ ] Empty and missing Findings sections have concise, accurate UI copy
- [ ] Tests cover paragraph, bullet, checklist, nested heading, and body-preservation cases
- [ ] File-format and extension documentation describe the convention consistently

## Findings

- The Backlog recognizes Findings, but the main structured editor still classifies it as generic additional Markdown.
