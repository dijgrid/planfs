---
id: TASK-029
title: Clean up repository documentation
status: done
priority: medium
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
dependsOn: []
tags:
  - docs
  - cleanup
  - release
createdAt: 2026-06-18T00:00:00Z
updatedAt: 2026-06-18T00:00:00Z
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
