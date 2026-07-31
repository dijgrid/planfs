---
id: TASK-093
title: Add optional milestone focus lens
status: done
priority: medium
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: ready
createdAt: 2026-07-07T05:08:12.000Z
updatedAt: 2026-07-31T03:02:11.097Z
---

Add an optional milestone focus lens for board and next-work views so release-oriented teams can focus on one delivery target without making milestones mandatory.

The default PlanFS workflow should remain process-agnostic. Milestone focus should be an explicit view/filter, not hidden board membership state.

## Scope

- Add an optional active-milestone selector to the board and Next Work surfaces.
- Treat milestone focus as an additional scope constraint composed with the active board preset, text query, and saved filter.
- When a saved filter and focus lens disagree, use their intersection and show a clear empty-state explanation rather than silently overriding either one.
- Store ad hoc focus in workspace-local UI preferences. Saved filters may continue to represent a shared milestone filter explicitly.
- Display the active milestone as a visible chip or selector with a one-step clear action.
- Pass milestone scope into existing core query and next-work APIs instead of duplicating filtering in the webview.

## Acceptance Criteria

- [x] Board can focus on a selected active milestone without losing normal saved-filter behavior
- [x] Next Work can scope recommendations to a selected milestone
- [x] Milestone focus composes by intersection with presets, search, and saved filters and explains conflicting empty results
- [x] Milestone focus is always visible in the UI when active and can be cleared in one action
- [x] Milestone focus is stored as workspace-local UI state unless represented by a saved filter
- [x] Archived or completed milestones are not offered for new ad hoc focus, while an existing saved filter remains inspectable
- [x] Next Work and board explanations identify milestone focus when it limits visibility
- [x] Tests cover board and next-work scoping, composition, persistence, clearing, empty intersections, and stale milestone preferences

## Decisions

- [x] Milestone focus is optional and never changes task membership.
- [x] The lens narrows visibility; it does not alter next-work ranking inside the selected milestone.
- [x] Ad hoc focus is local UI state, while shared milestone views continue to use saved filters.
- [x] Existing core milestone filters are the source of truth for membership.

## Non-Goals

- Requiring milestones for board or Next Work usage
- Automatically selecting a milestone based on dates or recent activity
- Writing focus state into task or milestone Markdown
- Adding hidden board membership separate from task metadata

## Notes

See `docs/MILESTONE_MODEL.md` for the milestone model recommendation.
