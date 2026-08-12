---
id: TASK-029
title: Clean up repository documentation
status: done
priority: medium
assignee: justin
epic: EPIC-project-setup-release-readiness
milestone: MILESTONE-phase-5
dependsOn: []
tags:
  - docs
  - cleanup
  - release
dueDate: 2026-06-18
createdAt: 2026-06-18T00:00:00Z
updatedAt: 2026-08-12T23:02:49.626Z
refinementState: ready
backlogOrder: 70
archive:
  archivedAt: 2026-08-12T23:02:49.626Z
  originalPath: .planfs/tasks/TASK-029.md
---

Review and tighten the repository documentation so it is easier to maintain and more useful for contributors, users, and release work.

## Acceptance Criteria

- [x] Review and rewrite `docs/ARCHITECTURE.md` with a clearer structure, cleaner formatting, and current project details.
- [x] Add a release document that outlines the release process, required checks, versioning steps, VS Code extension packaging, and publish commands.
- [x] Remove stale documentation, including `docs/IMPLEMENTATION_PLAN.md`, after confirming any useful current content has been migrated or captured elsewhere.
- [x] Update cross-links from README and docs so they do not point at removed files.
- [x] Run repository validation after the documentation cleanup.

## Implementation Notes

- Keep documentation grounded in actual commands and current behavior.
- Prefer concise docs over generated completion/status reports.
- The release document should cover both local VSIX packaging and Marketplace publishing.
- Rewrote architecture around the current monorepo package boundaries and PlanFS file flow.
- Added `docs/RELEASE.md` as the canonical release process.
- Removed `docs/IMPLEMENTATION_PLAN.md`; roadmap state now lives in `.planfs`.
