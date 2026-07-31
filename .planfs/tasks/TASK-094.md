---
id: TASK-094
title: Clarify epic and milestone delivery-date semantics
status: done
priority: low
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: ready
createdAt: 2026-07-07T05:08:12.000Z
updatedAt: 2026-07-31T03:16:23.053Z
---

Clarify documentation and UI language so milestones carry delivery timing while epics describe scope and narrative.

Existing epic `targetDate` behavior should remain compatible, but release-facing documentation and primary UI language should prefer milestone target dates for delivery commitments.

## Scope

- Update `docs/FILE_FORMAT.md`, getting-started guidance, milestone guidance, examples, and relevant extension help text.
- Describe milestone `targetDate` as the preferred delivery commitment for a release, sprint, launch, or checkpoint.
- Describe epic `targetDate` as an optional planning horizon or compatibility hint for scope-oriented planning.
- Audit structured editors, explorer context, insights, and creation prompts so labels communicate the distinction without removing existing fields.
- Preserve all current schemas, parsers, serializers, and existing artifact compatibility.

## Acceptance Criteria

- [x] File-format documentation explains milestone target dates as the preferred delivery timing model
- [x] Epic target dates are described as compatibility or lightweight planning hints
- [x] Getting-started and milestone documentation explain when to use an epic date, milestone date, both, or neither
- [x] UI uses unambiguous labels such as `Milestone target date` and `Epic planning date` where entity context is not already clear
- [x] Insights and editor copy do not present epic dates as competing release commitments when a milestone is available
- [x] No schema, required-field, or serialization behavior changes
- [x] Existing artifacts containing epic `targetDate` continue to load, edit, and validate unchanged
- [x] Tests or documentation checks cover updated labels and representative examples

## Decisions

- [x] Milestones own preferred delivery timing; epics own scope and narrative.
- [x] Epic `targetDate` remains supported as an optional planning hint for compatibility.
- [x] This is a documentation and language clarification, not a file-format migration.
- [x] Additional milestone date-window fields are deferred until a concrete UI need exists.

## Non-Goals

- Removing or deprecating epic `targetDate`
- Requiring every task or epic to belong to a milestone
- Adding `startDate`, `releaseDate`, or other milestone schema fields
- Migrating existing epic dates into milestones automatically

## Notes

See `docs/MILESTONE_MODEL.md` for the milestone model recommendation.
