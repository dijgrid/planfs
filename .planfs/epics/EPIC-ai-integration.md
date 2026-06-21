---
id: EPIC-ai-integration
title: Improved AI Integration
status: active
owner: justin
description: Make AI agents faster and safer at reviewing board status and applying planning updates
targetDate: 2026-11-03
createdAt: 2026-06-21T00:00:00Z
updatedAt: 2026-06-21T00:00:00Z
---

Make PlanFS easier for AI coding agents to understand and update with fewer manual steps while preserving the core rule that planning artifacts remain clean, readable Markdown.

The first version should focus on reducing friction in common agent workflows: reviewing board status, identifying the next useful planning update, applying small metadata changes, and summarizing what changed without needing broad file scans or fragile ad hoc parsing.

## Child Tasks

- TASK-061: Add AI-ready board status summary
- TASK-062: Add safe AI-assisted planning update commands
- TASK-063: Add AI workflow validation and documentation

## Questions

- Should AI-oriented summaries be a CLI output mode, a generated cache file, a core API, or all three?
- Which planning updates should be supported by first-class commands instead of direct Markdown edits?
- How should PlanFS balance faster agent reads with the requirement that Markdown remains the source of truth?
- Should agent update commands always require preview output before applying changes?
- What metadata should identify an AI-assisted planning update without adding noisy repository churn?
- Should agent workflows integrate with the existing `next` command, board workbench, backlog refinement, or a dedicated AI command group?
- How should conflicts be handled when an agent updates plan files that changed during the same session?
