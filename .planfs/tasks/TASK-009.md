---
id: TASK-009
title: Add Phase 1 test coverage
status: done
priority: high
assignee: justin
epic: EPIC-mvp-core
milestone: MILESTONE-v0-1
dependsOn:
  - TASK-003
  - TASK-008
tags:
  - testing
  - phase-1
createdAt: 2026-06-15T00:00:00Z
updatedAt: 2026-06-15T00:00:00Z
---

Cover core behavior and CLI command smoke paths.

## Acceptance Criteria

- [x] Parser tests cover valid and invalid frontmatter
- [x] Repository tests cover serialization and task ID generation
- [x] Validator tests cover references and cycles
- [x] CLI tests cover create, list, show, validate, and unsupported create paths
- [x] Workspace tests pass even where placeholder packages have no tests yet
