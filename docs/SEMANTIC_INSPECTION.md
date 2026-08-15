# Semantic Entity Inspection

PlanFS 1.4 adds a read-only semantic inspection view over human-owned YAML and Markdown. Inspection never rewrites a ticket, changes acceptance-criterion state, or turns prose into authoritative planning metadata.

## CLI workflow

`planfs inspect` is the semantic inspection surface:

```bash
planfs inspect TASK-113
planfs inspect TASK-113 --format json
planfs inspect TASK-113 --view acceptance-criteria --format json
planfs inspect TASK-113 --view relationships
planfs inspect TASK-113 --view raw --no-nlp
```

Interactive inspection runs the bundled local English analyzer by default. Use `--no-nlp` for a structural-only result or `--language <tag>` to select a language. Unsupported languages return an informational advisory diagnostic and all structural content remains available.

This default is intentionally limited to inspection. Repository loading, structural parsing, and ordinary `planfs validate` remain deterministic without analysis. Validation only runs analysis when `--nlp` is explicitly selected.

Focused views are:

- `all`: authoritative metadata, the complete semantic document, advisory mentions and conclusions, and raw analyzer output.
- `acceptance-criteria`: ordered criteria with `checked: true`, `checked: false`, or `checked: null`.
- `findings`: extracted finding items with provenance and source ranges.
- `sections`: every ordered section, including duplicates, aliases, and unknown custom sections.
- `mentions`: non-authoritative entity-ID mentions from body content.
- `relationships`: authoritative frontmatter relationships beside advisory mentions and relationship signals.
- `raw`: the exact Markdown body supplied to semantic parsing.

## Stable JSON envelope

Every view uses the same top-level key order and names:

```json
{
  "inspectionVersion": "1.0.0",
  "view": "all",
  "entity": {
    "id": "TASK-113",
    "type": "task",
    "title": "Expose semantic entity inspection through core and CLI",
    "status": "in-progress",
    "filePath": "/repo/.planfs/tasks/TASK-113.md"
  },
  "data": {},
  "diagnostics": []
}
```

For `all`, `data.authoritative.metadata` contains normalized, deterministically ordered frontmatter and `data.authoritative.relationships` contains fixed relationship fields. `data.semantic` is the loss-aware PlanFS semantic document. `data.advisory.mentions` and `data.analysis.signals` never appear inside authoritative relationships. Parser-library AST nodes are not exposed.

Diagnostics remain usable when content is incomplete, duplicated, aliased, malformed, or loosely conformant. Each diagnostic includes its stable code, severity, file identity, narrowest available range, provenance, conformance domain, and repair guidance. Partial semantic content is returned alongside diagnostics.

## Actionable analysis

The complete local analyzer result remains in `data.analysis` for integrations that need analyzer identity, version, language, evidence, confidence, provenance, or raw signals. Normal text output instead shows deduplicated `data.advisory.conclusions`:

- a possible prose relationship is omitted when the same entity ID is already represented in authoritative frontmatter;
- repeated prose relationship signals for one target become one review suggestion;
- ambiguous modal or conditional wording within one criterion becomes one wording suggestion;
- informative signals without a safe action remain available only in detailed JSON.

Conclusions are advisory and preview-oriented. They do not apply repairs.

## Core API

```typescript
import {
  inspectSemanticEntity,
  selectSemanticInspectionView
} from 'planfs-core';

const inspection = await inspectSemanticEntity(task, {
  analysis: true,
  language: 'en'
});

const criteria = selectSemanticInspectionView(
  inspection,
  'acceptance-criteria'
);
```

Core analysis is explicit so services and automation choose their own performance and policy boundary. The CLI enables it for interactive inspection by default.

## Integration examples

Agent inspection:

```bash
planfs inspect TASK-113 --format json
```

CI content checks remain explicit and independent of inspection:

```bash
planfs validate --semantic automation-ready --format json
planfs validate --semantic automation-ready --nlp --language en --format json
```

Release-summary input can retrieve ordered findings without parsing headings:

```bash
planfs inspect MILESTONE-v1-4 --view findings --format json
```

Editor integrations can retrieve structured criteria and navigate by the returned source ranges:

```bash
planfs inspect TASK-113 --view acceptance-criteria --format json --no-nlp
```

Editors should consume `planfs-core` directly when embedded in PlanFS itself; the CLI examples define the same serialized contract for external integrations.

## VS Code presentation

The structured editor consumes the same core inspection result instead of reparsing headings. It presents authoritative frontmatter relationships separately from advisory body mentions, preserves checked, unchecked, and ordinary-list criteria, and renders findings, questions, known sections, custom sections, and diagnostics in source order with navigation back to Markdown.

Supported local English analysis runs automatically for the active ticket by default. It remains advisory and workspace-configurable: users can inspect evidence, preview a safe metadata suggestion without applying it, dismiss or restore individual suggestions, or disable local analysis while deterministic structural diagnostics remain visible. Refresh recomputes the derived inspection without replacing unsaved metadata drafts or mutating the planning file.
