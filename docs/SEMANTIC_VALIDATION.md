# Semantic Content Validation

PlanFS validates semantic Markdown content as an explicit layer separate from YAML schema checks and repository integrity. Ordinary `planfs validate` behavior is unchanged unless a semantic option is selected.

## Conformance tiers

### Baseline

Baseline asks whether the Markdown body can be represented without semantic loss. Unknown sections, aliases, missing optional sections, and incomplete writing remain acceptable. Parser regions that cannot satisfy the preservation contract produce stable baseline diagnostics.

```sh
planfs validate --semantic baseline
```

### Automation-ready

Automation-ready applies the entity content profile:

- tasks require a non-empty preamble and at least one acceptance criterion;
- epics require a non-empty preamble and outcomes;
- milestones require a non-empty preamble, outcomes, and release criteria;
- decisions require context, decision, and consequences, satisfied by frontmatter or body sections;
- recognized sections are checked for expected content shapes;
- duplicates, aliases, ambiguity, empty required content, and ordinary criteria receive stable diagnostics.

```sh
planfs validate --semantic automation-ready
```

Tasks explicitly marked `captured`, `needs-refinement`, `deferred`, or `discarded` remain permissive: automation-ready conformance is reported as `not-evaluated`. Baseline diagnostics still apply.

### Lifecycle-sensitive policy

Lifecycle checks combine semantic content with authoritative frontmatter without changing either:

```sh
planfs validate --semantic automation-ready --lifecycle
```

- review and done tasks are checked for incomplete criteria;
- completed milestones are checked for incomplete release criteria;
- completed epics are checked for outcomes and open children derived from task frontmatter;
- accepted decisions are checked for context, decision, and consequences.

A review-task inconsistency is informational; a done-task inconsistency is a warning. Status and criterion check states are never synchronized automatically.

## Ordinary criterion policy

Ordinary list items remain extractable criteria with `checked: null`. Callers choose the diagnostic policy:

```sh
planfs validate --semantic automation-ready --criterion-check-state ignore
planfs validate --semantic automation-ready --criterion-check-state info
planfs validate --semantic automation-ready --criterion-check-state warning
planfs validate --semantic automation-ready --criterion-check-state error
```

The default for an explicitly selected automation-ready profile is `warning`. `error` makes the semantic result invalid; `--strict` makes warning-level repository or semantic diagnostics fail the command.

## Optional local analysis

The promoted local analyzer remains opt-in:

```sh
planfs validate --semantic automation-ready --nlp --language en
```

Analyzer signals stay under each entity result's `analysis` field. Analyzer diagnostics retain `conformance: "analysis"` and `provenance: "nlp-inferred"`. They do not affect deterministic structural conformance by default. Unsupported languages or analyzer failures return bounded advisory diagnostics without hiding structural results.

## Diagnostic contract

Every semantic validation diagnostic includes:

- stable `code` and `severity`;
- `entityId` and `filePath`;
- the narrowest available `range` and `sectionKey`;
- structural or analyzer `provenance`;
- `baseline`, `automation-ready`, `lifecycle`, or `analysis` conformance domain;
- actionable repair guidance and whether an exact repair is previewable; and
- optional structured `data`.

Consumers must key automation on codes and fields, not English messages. Validation is read-only; repair text is guidance, not permission to edit.

Initial profile-validation codes include:

| Code | Meaning |
| --- | --- |
| `content.preamble.missing` | required summary/preamble is absent |
| `content.section.missing` | required recognized section is absent |
| `content.section.required-empty` | required recognized section exists but is empty |
| `content.section.wrong-shape` | recognized content does not match its profile shape |
| `content.acceptance-criteria.unstructured` | criteria section contains substantive non-list prose |
| `content.criterion.missing` | no criterion was extracted |
| `content.criterion.missing-check-state` | criterion has `checked: null` |
| `content.frontmatter-body.conflict` | authoritative frontmatter differs from its body view |
| `content.lifecycle.incomplete-criteria` | lifecycle state and criterion state disagree |
| `content.lifecycle.required-content-missing` | completed/accepted entity lacks lifecycle content |
| `content.lifecycle.open-child-work` | completed epic has open frontmatter-derived children |

Structural parser codes such as `content.section.alias`, `content.section.duplicate`, `content.section.ambiguous`, `content.section.empty`, and `content.markdown.unclosed-fence` retain their existing meanings.

## JSON and exit behavior

Default JSON remains unchanged. When semantic validation is selected, the existing `result` field still contains frontmatter/repository diagnostics and a separate `semantic` field contains tier, conformance, counts, per-entity results, analysis, and semantic diagnostics.

Semantic warnings do not make `valid` false unless `--strict` is used. Semantic errors make the command fail. This keeps content-quality policy distinct from repository corruption while allowing CI to select stricter behavior explicitly.
