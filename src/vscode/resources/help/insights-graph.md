---
context: insights.graph
title: Dependency Graph
summary: Use the dependency graph to trace prerequisite flow, spot missing dependency IDs, and inspect work that affects downstream tasks.
---

# Dependency Graph

The dependency graph shows task relationships from `dependsOn` metadata. Arrows flow from prerequisite work to dependent work, which helps identify blockers and downstream impact before changing priorities.

Use the filters to narrow the graph by epic, milestone, assignee, status, or dependency health. Missing dependency references are shown as warnings because they can make readiness and next-work recommendations unreliable.
