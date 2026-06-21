# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- VS Code backlog view now supports a browse-and-edit workflow with a selected-item editor, ordered card list, grouping/filter controls, and Markdown section rendering.
- VS Code structured editors no longer expose a raw Markdown body textarea; full body editing stays in Markdown files while common sections render in the editor.

## [0.7.0] - 2026-06-20

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
