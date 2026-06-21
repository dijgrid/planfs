---
id: TASK-065
title: Replace Markdown body editing with structured sections in PlanFS editors
status: todo
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
createdAt: 2026-06-21T00:00:00Z
updatedAt: 2026-06-21T00:00:00Z
refinementState: ready
backlogOrder: 86
---

Remove the raw Markdown body input from PlanFS structured editors and make the full Markdown document the canonical place for body editing.

The structured editor should focus on metadata and common planning sections that benefit from form-like rendering. Users who want to read or edit the full body should open the artifact as Markdown, where formatting, prose, links, and checklist editing work naturally.

## Acceptance Criteria

- [ ] Task structured editor no longer shows a raw Markdown body textarea
- [ ] Epic and milestone structured editors follow the same body-editing pattern where applicable
- [ ] Editors keep a clear Open Markdown action for reading or editing the full artifact body
- [ ] Common sections such as Acceptance Criteria and Questions are parsed from the Markdown body and rendered in the structured editor when present
- [ ] Rendered checklist sections preserve checked and unchecked state clearly
- [ ] The first implementation avoids lossy editing of arbitrary Markdown content
- [ ] Saving metadata changes preserves the existing Markdown body exactly except for intentional structured-section edits
- [ ] Tests cover body preservation, section extraction, checklist rendering, and Open Markdown command wiring
- [ ] Documentation or release notes explain that rich body editing belongs in the Markdown file, while structured editors focus on metadata and common planning sections

## Questions

- [ ] Should Acceptance Criteria and Questions be read-only in the structured editor at first, or editable as checklist sections?
- [ ] Which heading names should be recognized as common sections beyond `Acceptance Criteria` and `Questions`?
- [ ] Should section parsing be shared by core APIs so CLI, VS Code, and future AI workflows can reuse it?
- [ ] How should malformed or unusually nested Markdown sections be displayed without risking body corruption?
