---
id: MILESTONE-v1-4
title: v1.4.0
status: active
targetDate: 2026-12-15
description: Make PlanFS planning documents semantically inspectable, verifiable,
  and safely normalizable for people and automation.
owner: justin
createdAt: 2026-08-15T00:02:13.176Z
updatedAt: 2026-08-15T00:02:13.176Z
---

Ship semantic planning documents as the primary capability of PlanFS 1.4.0. The release will retain Markdown and YAML as human-owned, Git-friendly source while giving core, CLI, and VS Code consumers a deterministic way to retrieve descriptions, acceptance criteria, findings, non-goals, decisions, references, and authoritative relationships.

The December 15 target is provisional. The release should favor tolerant reading and actionable diagnostics over mandatory rewrites, and any normalization must remain explicit, previewable, and safe for unknown Markdown content.

## Outcomes

- PlanFS exposes a typed semantic representation of recognized Markdown content without discarding the original body.
- Automated callers can retrieve acceptance criteria and other known sections through stable JSON instead of maintaining heading regular expressions.
- PlanFS ships optional non-LLM NLP analysis for the ticket-quality and relationship signals proven useful by the milestone spikes.
- Content-profile validation distinguishes parseability, structural conformance, planning readiness, and repository integrity.
- A formatter can preview and apply deterministic repairs without silently changing meaning or destroying custom sections.
- VS Code surfaces semantic content and diagnostics by consuming the same core APIs as the CLI.

## Release Criteria

- All child tasks in `EPIC-semantic-planning-documents` are complete.
- Existing valid PlanFS repositories remain readable without a required rewrite.
- Semantic extraction and formatting have mixed-style, malformed-input, round-trip, and idempotence coverage.
- CLI JSON contracts and content diagnostic codes are documented for automation consumers.
- Promoted NLP signals run locally, remain advisory, identify their analyzer and language, and never mutate authoritative planning metadata.
- `npm run lint`, `npm run build --workspaces`, `npm test --workspaces`, and `planfs validate` pass.

## Child Epic

- EPIC-semantic-planning-documents: Semantic Planning Documents
