# Milestone Model

Milestones should remain first-class PlanFS entities, but their role should be narrowed and made clearer: a milestone is an optional delivery marker, not a required work category.

## Current Usage

Milestones currently appear across the product:

- File format and schema define milestone entities with `id`, `title`, `status`, and `targetDate`.
- CLI can create, list, show, validate, and filter by milestones.
- Core repository APIs load milestones and validate task milestone references.
- Backlog, search, AI summary, bulk updates, and next-work flows can filter or update task `milestone`.
- Board view can group by milestone and bulk-set milestone.
- Structured editor exposes task milestone metadata and milestone entity editing.
- Insights derives milestone timeline and completion summaries from tasks that reference each milestone.

This is enough for a release. The problem is mostly semantic and UX: milestones are present, but they do not yet feel like delivery containers.

## Recommendation

Keep milestones as optional delivery containers represented by milestone files plus task references.

Use task metadata as the canonical association:

```yaml
milestone: MILESTONE-v1
```

Do not move canonical membership into the milestone file. A central list of task IDs inside each milestone would create unnecessary merge conflicts when multiple branches assign work to the same delivery target. The milestone editor can still present a container-like experience by deriving included tasks from task metadata and offering actions that update those task files.

Milestones should own delivery timing and derived health:

- `targetDate` remains required for milestones.
- Future optional date-window fields can be considered, such as `startDate` or `releaseDate`, but they should not block the next release.
- Completion, overdue, readiness, and scope health should be derived from associated tasks.
- Milestones should not own detailed task ordering. Ordering belongs in backlog/task planning workflows.

Epics should describe scope and narrative. Milestones should describe delivery timing. Existing epic `targetDate` support can remain for compatibility, but primary planning UI should avoid making epic dates compete with milestone dates.

## Process Agnosticism

Milestones should support sprint/release workflows without forcing them.

Good uses:

- Release or launch target
- Sprint or iteration
- External commitment date
- Internal checkpoint
- Planning horizon

Non-goals:

- Requiring every task to have a milestone
- Treating milestones as the only way work reaches the board
- Replacing epics as scope descriptions
- Adding hidden milestone membership state outside Markdown

## Follow-Up Direction

The next meaningful milestone improvements should be UI and documentation first:

- Make the milestone editor show associated tasks, completion, overdue work, and release readiness.
- Add an optional milestone focus lens to board and next-work views.
- Clarify file-format docs so epic dates are treated as compatibility hints while milestone dates are the preferred delivery timing model.

Schema changes such as date windows can wait until the UI exposes a clear need.
