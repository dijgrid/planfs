---
id: TASK-088
title: Review milestone concept and task association model
status: done
priority: low
assignee: justin
epic: EPIC-phase-5-advanced
milestone: MILESTONE-phase-5
refinementState: ready
createdAt: 2026-07-07T03:04:55.399Z
updatedAt: 2026-07-07T05:09:05.423Z
---

Review whether milestones are carrying their weight in PlanFS and how they should relate to tasks, epics, timelines, and planning views.

Milestones currently exist as planning entities, but they do not strongly shape tasking beyond a metadata association. This task should decide whether milestones need stronger semantics, different UI affordances, or a simpler role.

## Acceptance Criteria

- [x] Current milestone usage in CLI, core APIs, validation, timeline, board, and editor surfaces is reviewed
- [x] Gaps between milestones and task planning workflows are documented
- [x] Recommendation explains whether milestones should become stronger delivery containers, remain lightweight labels, or be deemphasized
- [x] Options include how tasks should associate with milestones directly or through epics
- [x] Follow-up tasks are created for any chosen schema, UI, validation, or documentation changes

## Questions

- [x] What is the meaning and value of a milestone?  
  - Answer: a milestone should represent a time-bound delivery marker: release, launch, sprint, checkpoint, or other commitment boundary. It should answer "what are we aiming to ship or review by this date?" rather than "what category of work is this?"
- [x] Should every planned task belong to a milestone, or should milestones be optional release markers?
  - I actually wonder if milestones should be included in task data at all or if it makes more sense for milestones to indicate the tasks that they include.
  - Answer: keep milestones optional. For the canonical association, task metadata is still the lower-conflict source of truth because multiple branches can assign different tasks to the same milestone without editing one central milestone file. The milestone editor should make this feel container-like by showing and managing included tasks from those references.
- [x] Should milestones own task ordering, due-date rollups, completion health, or release readiness?
  - I feel like milestone entity data should include the dates associated with the milestone.  In fact, isn't that the purpose of a milestone?  
  - Answer: milestones should own delivery dates and derived health, not detailed task ordering. They should show target date, optional start/window dates if needed, completion rollups, overdue/upcoming signals, and release-readiness summaries derived from associated tasks.
- [x] Should epic target dates and milestone target dates be unified, linked, or kept independent?
  - Ya, I actually don't think that epics should include target dates at all; they should be a description of work and the tasks associated with the epic, completely seperated from "when does this work get done".
  - Answer: agree directionally. Epics should describe scope and narrative, while milestones carry delivery timing. If epic target dates remain for compatibility, they should be treated as legacy or lightweight planning hints and not compete with milestone dates in primary UI.
- [x] Should board and Next Work views use milestones more strongly when grouping or ranking work?
  - Here, I'm not really sure what the best choice is.  Milestones make me want to lean into some sort of sprint concept where-in you have an active milestone and thus the next work is associated with that milestone.  But this is heavy handed and I want PlanFS to be very agnositic to these kinds of processes.  I need you thoughts here.
  - Answer: use milestones as an optional focus lens, not a required process. Board and Next Work should support "focus current milestone" or "group by milestone" modes, and ranking can lightly boost nearer milestone work when a milestone filter is active. Default behavior should remain process-agnostic.
