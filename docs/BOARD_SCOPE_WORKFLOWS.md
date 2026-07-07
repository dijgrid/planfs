# Board Scope Workflows

PlanFS board scope should keep everyday planning focused without creating hidden board-only state. The Markdown task files remain the source of truth; board views should interpret task metadata, saved filters, and local UI preferences rather than maintaining a separate membership list.

## Common Workflows

### Explicit Backlog Movement

Teams often remove work from the active board by moving it back to a backlog, icebox, or deferred lane.

For PlanFS, this should map to `refinementState` instead of a new board visibility field. A task moved off the default board should usually become `captured`, `needs-refinement`, `deferred`, or `discarded`, depending on intent.

Tradeoffs:

- Pro: state is visible in Markdown and shared across CLI, VS Code, and AI workflows.
- Pro: board cleanup feeds the existing backlog readiness and Next Work model.
- Con: users need clear labels so they understand they are changing planning readiness, not execution status.

### Filter-Driven Boards

Saved filters are a natural way to define alternate board scopes such as "Phase 5", "Current milestone", "My tasks", or "High priority bugs".

Tradeoffs:

- Pro: repository-shared filters are reviewable and versioned.
- Pro: teams can create multiple boards without changing task state.
- Con: filters alone do not solve the default board feeling crowded unless the default scope is intentionally narrower.

### WIP-Focused Defaults

Many boards show only work that is actionable now: ready todo items plus tasks already in progress or review.

For PlanFS, the default board should focus on open tasks that are `refinementState: ready` or already `in-progress`/`review`. Done items can remain collapsed or hidden by default, with an explicit way to expand them.

Tradeoffs:

- Pro: default board stays calm and operational.
- Pro: backlog capture/refinement can hold noisy early ideas without polluting the board.
- Con: users need obvious alternate views for "All open" and "Backlog" so work does not feel lost.

### Contextual Quick Actions

Right-click or compact card actions can make cleanup fast:

- Move to backlog: set `refinementState: needs-refinement`.
- Defer: set `refinementState: deferred`.
- Mark ready: set `refinementState: ready`.
- Discard: set `refinementState: discarded`.
- Focus milestone or epic: apply a board filter without modifying the task.

Tradeoffs:

- Pro: common grooming actions become one click.
- Pro: actions stay human-readable because they update existing metadata.
- Con: destructive-feeling actions such as discard should be reversible or clearly explained.

### Milestone And Epic Lenses

Milestones and epics are useful board lenses, but they should not be required board membership containers. A task can remain on the default board based on readiness, while milestone and epic filters provide planning context.

Tradeoffs:

- Pro: process-agnostic teams can ignore milestones.
- Pro: delivery-focused teams can use milestone filters for sprint or release views.
- Con: ranking and empty-state messaging need to make the active lens obvious.

## Recommendation

Use a combination model:

- Default board: actionable open work only, based on `refinementState` and execution status.
- Alternate views: explicit "All open", "Backlog", "Next Work", and saved filter scopes.
- Quick actions: update `refinementState` for board cleanup and backlog movement.
- Repository-shared state: saved filters and task metadata.
- Workspace-local state: selected board view, collapsed groups, density, panel width, and similar personal UI choices.

This keeps the board focused while preserving the Git-native rule: if work disappears from the default board, the reason is visible in task Markdown.
