---
id: TASK-070
title: Define external import mapping and migration workflow
status: todo
priority: low
assignee: justin
epic: EPIC-external-import-workflows
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-002
  - TASK-003
tags:
  - import
  - migration
  - jira
  - gitlab
  - github
  - csv
dueDate: 2026-11-03
refinementState: needs-refinement
backlogOrder: 21
createdAt: 2026-06-21T18:24:21Z
updatedAt: 2026-06-24T01:50:12.807Z
---

Define the first external import workflow for bringing work items from CSV exports, Jira, GitLab, GitHub Issues, and other trackers into PlanFS.

This task should focus on mapping and migration design before implementing provider-specific importers. The output should make clear how external identifiers, statuses, users, labels, epics, milestones, and repeated imports map into PlanFS entities and metadata.

## Acceptance Criteria

- [ ] Import workflow distinguishes provider-specific import adapters from shared mapping and validation behavior
- [ ] CSV import strategy is defined, including whether fixed columns, a mapping file, or an interactive mapping step is required
- [ ] Jira, GitLab, and GitHub imports have an initial migration path and provider boundary
- [ ] External IDs or issue keys have a traceability model that does not pollute normal PlanFS task fields
- [ ] Duplicate detection strategy is defined for repeated imports and partially imported datasets
- [ ] Missing epics, milestones, users, and labels have explicit map/create/fail behavior
- [ ] Conflicts can be previewed before writing PlanFS files
- [ ] Documentation explains how this differs from in-repository bulk update workflows

## Questions

- [ ] Should CSV import require a mapping file, an interactive mapping step, or fixed column names?
- [ ] Should Jira imports preserve original issue keys as metadata for future traceability?
- [ ] How should duplicate imported items be detected across repeated imports?
- [ ] Should imports create missing epics and milestones automatically, or fail until the user maps them explicitly?
- [ ] Should external provider metadata live under `links`, a new metadata object, or provider-specific fields?
- [ ] Which importer should be implemented first: CSV, Jira, GitLab, or GitHub Issues?
- [ ] Should import previews produce patch files, JSON plans, or human-readable summaries?
