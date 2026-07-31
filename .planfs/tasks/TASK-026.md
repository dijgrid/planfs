---
id: TASK-026
title: Add risk and requirement entity support
status: todo
priority: medium
assignee: justin
epic: EPIC-risk-requirement-support
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-004
tags:
  - entities
  - risks
  - requirements
  - phase-5
dueDate: 2026-11-03
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-07-30T22:45:41.207Z
refinementState: ready
backlogOrder: 40
---

Add first-class risk and requirement entities as complete, human-editable PlanFS workflows across schemas, core, CLI, and VS Code.

Risks and requirements will use their own domain-specific statuses. The initial model should favor a small, explicit vocabulary and task traceability over configurable workflows. New output remains camelCase and follows the same Markdown/frontmatter conventions as existing entities.

## Entity Model

- Risk required fields: `id`, `title`, `status`, `probability`, and `impact`. Initial statuses are `open`, `monitoring`, `mitigated`, and `closed`; probability and impact use `low`, `medium`, `high`, and `critical`.
- Risk optional fields: `owner`, `mitigation`, `reviewDate`, `relatedTasks`, `tags`, `links`, timestamps, and Markdown body.
- Requirement required fields: `id`, `title`, and `status`. Initial statuses are `proposed`, `approved`, `implemented`, `verified`, and `rejected`.
- Requirement optional fields: `owner`, `relatedTasks`, `tags`, `links`, timestamps, and Markdown body containing the detailed requirement and acceptance context.
- `relatedTasks` is the canonical first-version traceability relationship. Broader cross-entity relationships can be added later without changing this contract.

## Acceptance Criteria

- [ ] `.planfs/risks/` and `.planfs/requirements/` are initialized, discovered, loaded, serialized, and validated consistently with existing entities
- [ ] Shared schemas and TypeScript types implement the agreed required fields, optional fields, statuses, and named severity levels
- [ ] Validation checks status and severity vocabularies, required content, duplicate IDs, task references, and safe filename/ID behavior
- [ ] Core repository and reference APIs expose risks and requirements without duplicating loader or serializer behavior
- [ ] CLI can create, list, show, and validate risks and requirements
- [ ] VS Code explorer and structured editors can create, open, edit, and navigate risks and requirements
- [ ] Risk and requirement editors expose direct navigation to related implementation tasks
- [ ] Existing task, epic, milestone, and decision behavior remains backward compatible
- [ ] File-format, architecture, getting-started, and extension documentation cover both entity types with readable examples
- [ ] Tests cover parsing, serialization, validation, reference integrity, CLI lifecycle, VS Code lifecycle, and malformed-file recovery

## Decisions

- [x] Risks and requirements use the domain-specific statuses listed above rather than task statuses.
- [x] Probability and impact use named `low`, `medium`, `high`, and `critical` levels.
- [x] Initial traceability links risks and requirements directly to tasks through `relatedTasks`.
- [x] Owner and review date are optional for risks; residual-risk calculation and configurable matrices are deferred.
- [x] CLI and VS Code creation and editing are part of this task, not a later follow-up.

## Non-Goals

- Configurable risk matrices, scoring formulas, or custom status workflows
- Requirement hierarchies or generalized arbitrary cross-entity graphs
- Compliance reporting, approvals, or electronic signatures
- Risk and requirement archive workflows unless naturally supplied by existing generic lifecycle APIs
