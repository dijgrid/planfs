---
id: TASK-086
title: Improve handling for malformed PlanFS Markdown
status: todo
priority: high
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: ready
createdAt: 2026-07-07T03:04:48.309Z
updatedAt: 2026-07-07T03:41:00.585Z
---

Make PlanFS resilient when task or epic Markdown files are incomplete, malformed, or missing expected metadata.

Missing or incorrectly formatted fields currently tend to surface later as save problems without enough context for the user. PlanFS should load as much usable information as possible, explain what is wrong, and offer safe repair paths that keep files human-editable.

## Acceptance Criteria

- [ ] Loader and parser behavior is reviewed for malformed task and epic frontmatter
- [ ] Missing optional fields fall back to safe defaults where possible
- [ ] Missing required fields produce actionable diagnostics that include file path, field name, and repair guidance
- [ ] VS Code views can show recoverable malformed entities without crashing or blocking unrelated entities
- [ ] Save flows refuse destructive rewrites when required identity fields are ambiguous
- [ ] Tests cover missing fields, invalid enum values, malformed YAML, and partially recoverable entities
- [ ] Documentation explains what PlanFS can recover automatically and what requires manual repair

## Questions

- [x] Which fields are truly required to safely identify and save a task or epic? The task ID (and validation of it's format - perhaps this could be auto generated if missing?), the task title.  I dont think other fields and data are necessary except that there should be a body/description of the task/epic.  Ideally, this task would add a means by which PlanFS quickly and easily converts malformed markdown to proper markdown.
- [x] Should malformed entities appear in normal views, a repair view, or both? I think it would be nicest if PlanFS used the same view to both provide information and repair malformed information.  This might mean that the regular editor gets put into a "repair" mode however.
- [x] Should PlanFS offer quick fixes for common metadata problems? Yes, I think anything that we can do to make this process as easy as possible would be best since the user can simply change thigns if they aren't correct later.
- [x] How permissive should parsing be before validation reports an error? I think PlanFS should only force correctness on the minset of fields and information but show warnings in the UI for important missing information.
