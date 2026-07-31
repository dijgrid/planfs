---
id: TASK-025
title: Optimize large repository performance
status: todo
priority: low
assignee: justin
epic: EPIC-large-repository-scale
milestone: MILESTONE-phase-5
dependsOn:
  - TASK-013
tags:
  - performance
  - scale
  - phase-5
dueDate: 2026-10-28
refinementState: ready
backlogOrder: 30
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-07-30T22:45:41.082Z
---

Keep CLI and VS Code workflows responsive in repositories containing up to 10,000 active tasks plus related planning entities.

Begin by adding reproducible benchmarks and profiling the existing load, validation, search, board, backlog, next-work, and graph paths. Optimize measured bottlenecks in `planfs-core` first so CLI and VS Code share the improvements. Runtime indexes and caches must remain derived state and must never become Git-tracked planning artifacts.

## Performance Targets

- A documented 10,000-task reference fixture is the primary scale target.
- Cold repository load and full validation should complete in under five seconds on the documented reference machine.
- After initial load, common filtering, search, ranking, and visible-list updates should complete in under 200 milliseconds.
- VS Code must remain responsive during load and render only the visible portion of large lists.
- Benchmarks should report smaller 100-task and 1,000-task tiers to expose regressions before the maximum tier.

## Acceptance Criteria

- [ ] A deterministic fixture generator produces realistic 100-, 1,000-, and 10,000-task repositories with dependencies, bodies, tags, epics, and milestones
- [ ] Benchmarks measure discovery, parsing, repository load, validation, search, next-work ranking, graph derivation, and primary VS Code list preparation
- [ ] Baseline measurements are recorded before optimization and compared with final results
- [ ] Core caches parsed entities in memory and invalidates entries when file identity, modification time, size, or observed content changes
- [ ] Common query paths have derived indexes for status, refinement state, assignee, epic, milestone, priority, and tag
- [ ] VS Code refreshes changed entities incrementally where safe and yields during expensive work so the extension host remains responsive
- [ ] Board, backlog, and explorer views virtualize or page large result sets and prioritize visible work
- [ ] CLI and VS Code meet the documented five-second cold and 200-millisecond interactive targets on the reference environment, or documented evidence explains any accepted exception
- [ ] Automated tests cover cache invalidation, external file edits, indexed-query equivalence, and incremental refresh correctness
- [ ] Developer diagnostics can emit opt-in timing information without collecting or transmitting telemetry

## Decisions

- [x] The primary scale target is 10,000 tasks, with 100- and 1,000-task comparison tiers.
- [x] CLI and VS Code are equal targets; shared behavior belongs in core.
- [x] No cache or index is stored under `.planfs`. Any future persisted editor cache must use runtime/workspace storage and remain disposable.
- [x] External Markdown edits must invalidate cached parses automatically.
- [x] Performance diagnostics are opt-in and local; usage telemetry is out of scope.

## Non-Goals

- Changing PlanFS Markdown into a database-backed source of truth
- Committing generated indexes or cache files
- Provider telemetry or collection of repository contents
- Optimizing beyond 10,000 tasks before measurements demonstrate a need
