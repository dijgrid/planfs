---
id: EPIC-external-import-workflows
title: External Import Workflows
status: active
owner: justin
description: Import planning work from external trackers and exports
targetDate: 2026-11-03
createdAt: 2026-06-21T18:24:21Z
updatedAt: 2026-06-21T18:24:21Z
---

Support importing planning work from external systems such as CSV exports, Jira, GitLab, GitHub Issues, and other trackers while preserving traceability and keeping PlanFS Markdown clean.

This epic is intentionally separate from in-repository bulk update workflows because importing external work requires mapping, duplicate detection, identity preservation, conflict handling, and provider-specific semantics.

## Child Tasks

- TASK-070: Define external import mapping and migration workflow
