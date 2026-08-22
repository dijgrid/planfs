# PlanFS for Visual Studio Code

Plan and manage work beside the code it describes. PlanFS gives VS Code a Git-native backlog, task board, next-work view, roadmap insights, and structured planning editors—all backed by readable Markdown files in your repository.

Your plan stays under `.planfs/`, so it can branch, diff, review, and merge with the rest of the project.

## Features

### See the whole plan in VS Code

- **PlanFS Explorer** — Browse current work, backlog items, epics, milestones, decisions, and archived planning items from the activity bar.
- **Backlog** — Capture rough work, review readiness, filter and group tasks, and refine items before they reach the active board.
- **Status Board** — Move work between Todo, In Progress, Review, and Done; create tasks in context; group into swimlanes; and update selected cards together.
- **Next Work** — Focus on work that is ready now, already active, awaiting review, blocked, or intentionally later, with clear ranking explanations.
- **Insights** — Explore dependencies, roadmap timing, milestone progress, branch planning context, and planning reports.

### Edit planning files without giving up Markdown

- **Structured editors** — Edit common task, epic, and milestone metadata with validation and assisted PlanFS references.
- **Semantic task context** — Review acceptance-criteria progress, findings, questions, custom sections, and source-located diagnostics directly in the structured editor.
- **Local advisory suggestions** — PlanFS analyzes supported ticket wording locally when you view it, explains evidence, and offers preview-only relationship guidance without silently changing metadata. Analysis can be disabled per workspace.
- **Direct Markdown access** — Open the source file whenever you want full control over its narrative content.
- **Safe creation and archiving** — Create tasks, epics, and milestones or archive completed planning items from VS Code.

### Keep planning views useful as work changes

- **Saved filters** — Share named filters from `.planfs/filters/*.json` and apply them in the explorer and board.
- **Board scopes and search** — Switch between actionable work, all open work, and backlog views without losing search or filter context.
- **Automatic refresh** — Keep the explorer, backlog, board, archive, and insights synchronized when PlanFS files change on disk.
- **Human-readable output** — Every extension action writes ordinary Markdown and YAML frontmatter that remains easy to inspect and edit.

VS Code also shows the extension's registered commands and views under **Feature Contributions**. That tab is generated from the extension manifest; this README provides the workflow-oriented overview.

## Get Started

1. Install **PlanFS** from the VS Code Marketplace.
2. Open a folder that already contains `.planfs/`, or run **PlanFS: Initialize Repository** from the Command Palette.
3. Select the PlanFS icon in the activity bar.
4. Open **Backlog**, **Board**, or **Insights** from the PlanFS explorer or Command Palette.

PlanFS will create and update planning files inside the current workspace. Commit those files when you want planning changes to travel with the repository.

## Optional CLI for Automation and AI Tools

The VS Code extension works on its own. Install the optional PlanFS CLI when you also want terminal automation, CI validation, scripting, or AI coding agents to work with the plan safely.

```sh
npm install --global planfs-cli
planfs --version
```

From a PlanFS repository, initialize concise guidance for AI coding agents:

```sh
planfs ai initialize
```

The CLI gives agents and automation structured planning summaries, previewable task updates, stale-write protection, and validation while preserving the same readable Markdown files used by the extension. See the [AI workflow guide](https://github.com/dijgrid/planfs/blob/main/docs/AI_WORKFLOWS.md) for examples.

## Main Commands

- `PlanFS: Initialize Repository`
- `PlanFS: Open Backlog`
- `PlanFS: Open Board`
- `PlanFS: Open Next Work Board`
- `PlanFS: Open Insights`
- `PlanFS: Create Task`
- `PlanFS: Create Epic`
- `PlanFS: Create Milestone`
- `PlanFS: Open Structured Editor`
- `PlanFS: Apply Saved Filter`
- `PlanFS: Open Archive`
- `PlanFS: Refresh Views`

## How PlanFS Stores Work

A PlanFS task is a Markdown file with YAML frontmatter:

```markdown
---
id: TASK-123
title: Improve onboarding
status: in-progress
priority: high
milestone: MILESTONE-v1
---

Explain the work here.

## Acceptance Criteria

- [ ] A new user can complete setup
```

The extension uses these files as its source of truth. It does not require a hosted PlanFS service or copy the plan into an opaque local database.

The structured editor derives its semantic view from the same `planfs-core` API used by the CLI. Checked, unchecked, and ordinary list criteria remain distinct and include accessible completion progress; findings and questions retain source navigation; unknown sections stay visible. Empty semantic groups and relationships that do not apply to the current entity are omitted. Secondary sections, mentions, and diagnostics use native disclosure controls, and long section previews are clamped until expanded. Prose mentions are advisory and are shown separately from authoritative frontmatter relationships. Suggestions can be dismissed or restored, and any metadata guidance is preview-only.

## Documentation and Support

- [Getting started](https://github.com/dijgrid/planfs/blob/main/docs/GETTING_STARTED.md)
- [PlanFS file format](https://github.com/dijgrid/planfs/blob/main/docs/FILE_FORMAT.md)
- [VS Code extension development and local installation](https://github.com/dijgrid/planfs/blob/main/docs/VSCODE_EXTENSION.md)
- [Report an issue](https://github.com/dijgrid/planfs/issues)
- [Source repository](https://github.com/dijgrid/planfs)

## License

MIT
