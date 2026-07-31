---
id: TASK-097
title: Polish AI planning command safety and efficiency
status: done
priority: high
assignee: justin
createdAt: 2026-07-31T03:26:03.922Z
updatedAt: 2026-07-31T03:31:14.550Z
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: ready
---

Polish the existing agent-facing CLI contract without adding model providers or a parallel AI subsystem.

## Acceptance Criteria

- [x] `ai initialize` emits portable `planfs` commands by default and supports an explicit command override
- [x] `ai update-task` dry-run output exposes the current `updatedAt` value and apply can reject stale previews
- [x] `ai summary --format text` returns a concise human-readable summary
- [x] `ai summary --only` can select open, ready, blocked, review, stale, or recent work
- [x] `ai summary --compact` emits minified JSON without changing default JSON output
- [x] Documentation and generated awareness guidance match the implemented CLI
- [x] Tests cover portability, stale-write refusal, selective output, compact JSON, and text output
