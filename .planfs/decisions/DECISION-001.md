---
id: DECISION-001
title: Use Git as the database
status: accepted
date: 2026-06-14
author: justin
---

Store all project planning artifacts directly in the Git repository rather than in an external database or service.

## Context

PlanFS needs a source of truth for project planning data. Options considered:
1. External SaaS (Jira, Linear, GitHub Issues)
2. Centralized database
3. Git repository with files

## Decision

Use Git repository as the database, storing planning artifacts as Markdown files in `.planfs/` directory.

## Rationale

- **Version control built-in:** Planning changes can be tracked, reviewed, and reverted like code
- **No dependencies:** No external service required; works offline
- **Merge/branch support:** Teams can plan on feature branches
- **Human-readable:** Files are editable by humans without special tools
- **Auditable:** Git history provides complete audit trail
- **Portable:** Artifacts travel with the code repository

## Consequences

**Positive:**
- Simple, decentralized architecture
- Easy to automate and script
- Git integrations work naturally
- Can be used for any Git repository (GitHub, GitLab, self-hosted)

**Negative:**
- Merge conflicts possible (mitigated by clear conventions)
- Query performance not as fast as database (acceptable for typical team sizes)
- Requires clear file organization conventions
- Team discipline needed for consistency

## Implementation

- Store entities as Markdown files with YAML frontmatter
- Use `.planfs/` directory structure
- Enforce ID uniqueness and reference integrity through validation
- Provide tooling to check for conflicts and issues
