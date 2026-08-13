# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-08-12

### Added
- Plan format versioning with previewable migrations and compatibility checks.
- CLI workflows for general entity updates, saved filters, Git-native history, and plan-health diagnostics.
- Complete decision lifecycle, task Findings, archive disposition, and unfinished-work protection workflows.
- Real VS Code extension-host smoke coverage for release verification.

### Changed
- Structured editors now protect drafts from refresh loss and detect conflicting writes.
- VS Code views now preserve state across coalesced repository refreshes and behave consistently in multi-root workspaces.
- Validation supports strict warning modes and clearer plan-health diagnostics.

## [1.2.0] - 2026-07-30

### Added
- Milestone structured editors now show derived completion and delivery-health rollups and allow tasks to be assigned or removed without duplicating membership in milestone files.
- Board and Next Work views now support a workspace-local active milestone focus that composes with scope, search, and saved filters.
- AI planning helpers now support portable generated commands, optimistic concurrency for task updates, selective summary sections, minified JSON, and concise text summaries.

### Changed
- Refocused the VS Code Marketplace README on extension workflows, clarified that the Marketplace extension does not install the CLI, and removed the extension's Preview designation for the next stable release.
- Clarified milestone target dates as delivery commitments and epic target dates as optional planning horizons across documentation and VS Code planning surfaces.
- VS Code backlog view now supports a browse-and-edit workflow with a selected-item editor, ordered card list, grouping/filter controls, and Markdown section rendering.
- VS Code structured editors no longer expose a raw Markdown body textarea; full body editing stays in Markdown files while common sections render in the editor.

## [0.8.0] - 2026-06-21

### Added
- Backlog refinement metadata, ordering, CLI workflows, hygiene review, and a dedicated VS Code backlog view distinct from Next Work recommendations.
- Board planning workbench improvements including details drawer, view switching, quick actions, swimlane grouping, contextual task creation, bulk updates, and collapsed terminal states.
- Next Work ranking APIs, CLI command, and VS Code board mode for ready, active, review, blocked, and later work.
- Visual planning improvements for dependency graphs, timeline navigation, epic-scoped task boards, and developer suggestions in UI inputs.
- Pull request planning summaries, branch-aware planning views, and CI validation workflows.
- Repository initialization commands for CLI and VS Code.
- CLI support for creating epics and milestones.
- VS Code Marketplace packaging metadata, icons, and release workflow documentation.
- Core file parsing library (planfs-core)
- VS Code extension with Explorer view
- CLI validation tool
- Entity schemas (Task, Epic, Milestone, Decision)
- File format specification
- Getting Started guide
- Architecture documentation
- Implementation roadmap

### Planned
- Kanban board view
- Dependency graph visualization
- Timeline/roadmap view
- Git integration (commit linking)
- GitHub/GitLab/Azure DevOps integration
- CI/CD validation workflows

## [0.1.0] - 2026-06-14

### Added
- Initial project setup
- Documentation structure
- Repository scaffolding

---

## Development Phases

### Phase 1: MVP
- Core functionality: File parsing and validation
- Basic VS Code extension
- CLI tool for querying and validation

### Phase 2: Enhanced Features
- Kanban board view
- Form-based editors
- Advanced filtering

### Phase 3: Visualization
- Dependency graphs
- Timeline views
- Reporting

### Phase 4: Collaboration
- PR/MR integration
- CI/CD validation
- Branch-aware planning

### Phase 5: Advanced Features
- Custom fields and templates
- Bulk operations
- Performance optimizations
- Risk and requirement management

---

## Version History

Keep this file up to date as releases are prepared.
