---
id: TASK-023
title: Add custom fields and templates
status: todo
priority: low
assignee: justin
epic: EPIC-customization-templates
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-004
  - TASK-012
  - TASK-105
tags:
  - schema
  - templates
  - phase-5
dueDate: 2026-10-14
refinementState: ready
backlogOrder: 10
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-08-12T23:00:40Z
---

Let repositories extend PlanFS for their own planning domains without weakening validation or making generated Markdown opaque.

Custom-field definitions will be Git-tracked repository configuration under `.planfs/config/`, scoped by entity type. Values will live under a namespaced `custom` object in entity frontmatter so PlanFS can distinguish extensions from misspelled core fields. Repository-local templates will live under `.planfs/templates/` and remain ordinary, reviewable files.

## Scope

- Define and document a YAML custom-field configuration format scoped to tasks, epics, milestones, decisions, risks, or requirements as those entity types exist.
- Support initial field types `string`, `number`, `boolean`, `date`, `enum`, and `string-list`, including labels, descriptions, required flags, defaults, and enum choices where applicable.
- Parse, preserve, serialize, and validate values under entity `custom` metadata.
- Add repository templates containing an entity type, metadata defaults, and Markdown body content.
- Add core APIs plus CLI and VS Code flows to list templates and create an entity from a selected template.
- Render configured custom fields automatically in structured editors using controls appropriate to their types.

## Acceptance Criteria

- [ ] Repository configuration can declare entity-scoped custom fields without changing PlanFS source code
- [ ] Parser and serializer round-trip the namespaced `custom` object without reordering or losing human-authored content unnecessarily
- [ ] Validation enforces configured types, required values, enum choices, and valid defaults
- [ ] Unregistered values under `custom` are preserved and reported as warnings rather than destructively removed
- [ ] Templates provide metadata defaults and Markdown body content for a declared entity type
- [ ] CLI and VS Code creation flows can select and apply repository templates
- [ ] Structured editors render configured custom fields for supported types and preserve unknown values
- [ ] Template and custom-field files are shared through normal Git history with no runtime registry or generated cache committed to `.planfs`
- [ ] File-format and usage documentation include configuration, template, validation, and migration examples
- [ ] Focused tests cover every field type, invalid configuration, round trips, template application, unknown fields, and editor rendering

## Decisions

- [x] Definitions are repository-local, Git-tracked YAML under `.planfs/config/` and scoped by entity type.
- [x] Custom values use a `custom` frontmatter object rather than becoming arbitrary top-level fields.
- [x] The first release supports string, number, boolean, date, enum, and string-list fields.
- [x] Templates live under `.planfs/templates/` and contain defaults plus Markdown body content only; validation rules remain in custom-field configuration.
- [x] Creating an entity from a template copies values. There is no live relationship or migration when the template later changes.
- [x] Git history provides template version history; PlanFS will not add a separate version registry.

## Non-Goals

- Executable template logic, expressions, or remote template registries
- Automatic migration of existing entities when definitions or templates change
- Custom status workflows or replacement of core required fields
- Provider-specific users or repository values embedded in globally shared templates
