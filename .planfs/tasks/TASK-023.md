---
id: TASK-023
title: Add custom fields and templates
status: todo
priority: medium
assignee: justin
epic: EPIC-customization-templates
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-004
  - TASK-012
tags:
  - schema
  - templates
  - phase-5
dueDate: 2026-10-14
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-20T00:00:00Z
refinementState: needs-refinement
backlogOrder: 10
---

Let repositories extend PlanFS for their own planning domains.

## Acceptance Criteria

- [ ] Repositories can define custom fields
- [ ] Custom field types are validated
- [ ] Entity templates can be saved and reused
- [ ] Template changes can be versioned
- [ ] Shared templates work across a team

## Questions

- [ ] Where should repository-level custom field definitions live: `.planfs/config`, schema files, frontmatter conventions, or another location?
- [ ] Which custom field types should be supported in the first version?
- [ ] Should custom fields be allowed on all entity types, or scoped per entity type?
- [ ] Should unknown custom fields be accepted with warnings, rejected by validation, or preserved without validation?
- [ ] How should template versioning work when existing artifacts were created from an older template?
- [ ] Should templates define only default metadata/body text, or also validation rules and required fields?
- [ ] How should shared templates handle repository-specific users, milestones, statuses, and tags?
- [ ] Should the VS Code structured editors render custom fields automatically, or only expose them through a generic metadata editor at first?
