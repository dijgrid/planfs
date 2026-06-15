# Implementation Plan

The implementation roadmap is tracked in PlanFS itself. The `.planfs/` directory is the source of truth for phases, milestones, tasks, dependencies, and status.

This document is a human-readable index for the roadmap, not a parallel planning system.

## Roadmap Structure

| Phase | Epic | Milestone | Focus |
|-------|------|-----------|-------|
| Phase 1 | `EPIC-mvp-core` | `MILESTONE-v0-1` | Core parser, validation, VS Code explorer, CLI, docs, examples |
| Phase 2 | `EPIC-phase-2-enhanced` | `MILESTONE-phase-2` | Kanban board, structured editors, search, saved filters, Git helpers |
| Phase 3 | `EPIC-phase-3-visualization` | `MILESTONE-phase-3` | Dependency graph, roadmap timeline, reporting, exports |
| Phase 4 | `EPIC-phase-4-collaboration` | `MILESTONE-phase-4` | Pull request integrations, CI validation, branch-aware planning, team workflows |
| Phase 5 | `EPIC-phase-5-advanced` | `MILESTONE-phase-5` | Custom fields, templates, bulk operations, performance, risks, requirements |

## Phase 1 Status

Phase 1 is represented by `EPIC-mvp-core` and `MILESTONE-v0-1`.

Completed Phase 1 task records:

- `TASK-001` - Initialize PlanFS project repository
- `TASK-002` - Build core parser and repository API
- `TASK-003` - Implement repository validation pipeline
- `TASK-004` - Define schema package
- `TASK-005` - Build VS Code explorer basics
- `TASK-006` - Implement task creation workflows
- `TASK-007` - Build CLI query commands
- `TASK-008` - Add CLI task creation
- `TASK-009` - Add Phase 1 test coverage
- `TASK-010` - Publish MVP documentation and examples

## Working With The Plan

Use the CLI to inspect the roadmap:

```sh
node src/cli/dist/cli.js validate
node src/cli/dist/cli.js list tasks
node src/cli/dist/cli.js list epics
node src/cli/dist/cli.js show TASK-011
```

When adding roadmap items:

1. Add a Markdown file under `.planfs/tasks/`, `.planfs/epics/`, or `.planfs/milestones/`.
2. Use camelCase metadata fields such as `dependsOn`, `targetDate`, `createdAt`, and `updatedAt`.
3. Reference existing epic and milestone IDs.
4. Run validation before handing off changes.

```sh
npm run build --workspaces
node src/cli/dist/cli.js validate
```

## Planning Principles

- Keep the Markdown body useful for humans.
- Track detailed implementation checklists inside task bodies.
- Prefer a task per workstream instead of a task per tiny checkbox.
- Update task status as work changes; do not maintain a second status list in this file.
- Add decisions under `.planfs/decisions/` when roadmap direction changes materially.
