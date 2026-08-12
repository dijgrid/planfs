---
id: EPIC-bulk-import-workflows
title: Bulk Update Workflows
status: completed
owner: justin
description: Support safe multi-item edits within PlanFS
targetDate: 2026-10-21
createdAt: 2026-06-20T00:00:00Z
updatedAt: 2026-08-12T23:03:37.879Z
archive:
  archivedAt: 2026-08-12T23:03:37.879Z
  originalPath: .planfs/epics/EPIC-bulk-import-workflows.md
---

Support managing many existing PlanFS planning artifacts at once without surprising users or damaging hand-editable files.

This epic should make bulk updates previewable, conflict-aware, transactional where possible, and reusable across CLI, core APIs, and VS Code workflows.

External imports from CSV, Jira, GitLab, GitHub, and other systems are tracked separately in `EPIC-external-import-workflows`.

## Child Tasks

- TASK-024: Add transactional bulk update workflows
