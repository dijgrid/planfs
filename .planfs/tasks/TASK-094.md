---
id: TASK-094
title: Clarify epic and milestone delivery-date semantics
status: todo
priority: low
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: needs-refinement
createdAt: 2026-07-07T05:08:12.000Z
updatedAt: 2026-07-07T05:08:12.000Z
---

Clarify documentation and UI language so milestones carry delivery timing while epics describe scope and narrative.

Existing epic `targetDate` behavior should remain compatible, but release-facing documentation and primary UI language should prefer milestone target dates for delivery commitments.

## Acceptance Criteria

- [ ] File-format documentation explains milestone target dates as the preferred delivery timing model
- [ ] Epic target dates are described as compatibility or lightweight planning hints
- [ ] UI labels avoid making epic target dates compete with milestone target dates
- [ ] Any schema changes are deferred unless a migration plan is included
- [ ] Tests or documentation checks cover updated examples where practical

## Notes

See `docs/MILESTONE_MODEL.md` for the milestone model recommendation.
