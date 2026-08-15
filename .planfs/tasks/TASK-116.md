---
id: TASK-116
title: Harden compatibility and document semantic automation workflows
status: todo
priority: medium
assignee: justin
epic: EPIC-semantic-planning-documents
milestone: MILESTONE-v1-4
dependsOn:
  - TASK-113
  - TASK-114
  - TASK-115
tags:
  - documentation
  - compatibility
  - automation
  - release
dueDate: 2026-12-15
refinementState: ready
backlogOrder: 70
createdAt: 2026-08-15T00:02:14.143Z
updatedAt: 2026-08-15T00:02:14.143Z
---

Harden semantic document behavior against real repository variation and publish the compatibility and automation guidance needed to ship PlanFS 1.4.0 confidently.

## Scope

- Update the file-format specification with content profiles, canonical sections, aliases, structural and NLP provenance, validation levels, and formatter guarantees.
- Decide and document whether semantic reads are an additive v1 capability and which future changes would require a format or API version transition.
- Build a representative fixture corpus from canonical, legacy, loosely structured, custom, imported, and malformed Markdown without rewriting project artifacts into throwaway fixtures.
- Test large-repository performance and avoid reparsing unchanged bodies unnecessarily.
- Document CLI JSON contracts and examples for agents, CI checks, release reports, acceptance-criteria inspection, and editor integrations.
- Document NLP enablement, supported language and analyzer limitations, local model packaging, caching, provenance, advisory semantics, and deterministic fallback behavior.
- Run the full release verification suite and validate the repository's own planning artifacts under the intended baseline and automation-ready profiles.

## Acceptance Criteria

- [ ] `docs/FILE_FORMAT.md` accurately describes semantic interpretation and does not claim unsupported behavior
- [ ] Canonical section names, explicit aliases, profile rules, provenance, and diagnostic stability are documented
- [ ] Compatibility guidance explains which repositories need no rewrite and when explicit formatting is useful
- [ ] A mixed-style fixture corpus covers legacy, canonical, custom, imported, ambiguous, and malformed documents
- [ ] Parser and validation performance are measured on a large synthetic or fixture repository with an agreed regression threshold
- [ ] Automation examples retrieve acceptance criteria, distinguish dependencies from mentions, enforce a selected profile, and preview formatting
- [ ] NLP documentation identifies promoted signals, known limitations, enablement controls, local-processing guarantees, and behavior when analysis is unavailable
- [ ] The pre-v1.4 canonical task corpus remains semantically readable, with intentional updates documented as the corpus grows
- [ ] Release notes identify semantic inspection as additive and formatting as opt-in
- [ ] Lint, workspace builds, workspace tests, CLI validation, and relevant CLI smoke checks pass
- [ ] Milestone and epic outcomes are reviewed against actual verified behavior before completion

## Non-Goals

- Publishing optimistic compatibility claims without fixture and command evidence
- Reformatting all existing `.planfs` artifacts solely to demonstrate the formatter
- Expanding into natural-language requirement inference or arbitrary document classification
