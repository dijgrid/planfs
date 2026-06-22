---
id: TASK-065
title: Replace Markdown body editing with structured sections in PlanFS editors
status: done
archive:
  archivedAt: 2026-06-22T06:08:51.853Z
  originalPath: .planfs/tasks/TASK-065.md
priority: high
assignee: justin
epic: EPIC-board-workbench
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-012
  - TASK-056
tags:
  - vscode
  - editor
  - markdown
  - ux
dueDate: 2026-09-07
refinementState: ready
backlogOrder: 86
createdAt: 2026-06-21T00:00:00Z
updatedAt: 2026-06-22T06:08:51.853Z
---

Remove the raw Markdown body input from PlanFS structured editors and make the full Markdown document the canonical place for body editing.

The structured editor should focus on metadata and common planning sections that benefit from form-like rendering. Users who want to read or edit the full body should open the artifact as Markdown, where formatting, prose, links, and checklist editing work naturally.

## Acceptance Criteria

- [x] Task structured editor no longer shows a raw Markdown body textarea
- [x] Epic and milestone structured editors follow the same body-editing pattern where applicable
- [x] Editors keep a clear Open Markdown action for reading or editing the full artifact body
- [x] Common sections such as Acceptance Criteria and Questions are parsed from the Markdown body and rendered in the structured editor when present
- [x] Rendered checklist sections preserve checked and unchecked state clearly
- [x] The first implementation avoids lossy editing of arbitrary Markdown content
- [x] Saving metadata changes preserves the existing Markdown body exactly except for intentional structured-section edits
- [x] Tests cover body preservation, section extraction, checklist rendering, and Open Markdown command wiring
- [x] Documentation or release notes explain that rich body editing belongs in the Markdown file, while structured editors focus on metadata and common planning sections

## Questions

- [x] Should Acceptance Criteria and Questions be read-only in the structured editor at first, or editable as checklist sections? **Read-only at first; full body editing stays in Markdown to avoid lossy edits.**
- [x] Which heading names should be recognized as common sections beyond `Acceptance Criteria` and `Questions`? **Only `Acceptance Criteria` and `Questions` for this slice.**
- [x] Should section parsing be shared by core APIs so CLI, VS Code, and future AI workflows can reuse it? **Keep the first parser in the VS Code package; promote it later if non-UI workflows need it.**
- [x] How should malformed or unusually nested Markdown sections be displayed without risking body corruption? **Render recognized checklist items and paragraphs read-only; never rewrite the body from parsed sections.**
