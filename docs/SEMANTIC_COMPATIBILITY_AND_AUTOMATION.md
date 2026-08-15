# Semantic Compatibility and Automation

PlanFS 1.4 semantic inspection is an additive read capability for repository format v1. Existing repositories do not need a rewrite. Markdown/YAML remains the source of truth, tolerant reads preserve unrecognized content, and formatting stays opt-in.

## Compatibility policy

Repositories using canonical headings, documented aliases, custom sections, imported tables or HTML, duplicate sections, empty sections, or malformed fences remain readable. Diagnostics describe ambiguity or conformance without repairing it. Formatting is useful when a team deliberately wants canonical headings and checklist markers; it is not an upgrade prerequisite.

The public versions are independent:

| Surface | v1.4 version | Compatible additions | Breaking change examples |
| --- | --- | --- | --- |
| Repository source | `formatVersion: 1` | optional metadata and derived reads | new required syntax or changed authority |
| Semantic document/profile | `1.0.0` | new optional fields; new explicit aliases | removed alias; changed field meaning/type |
| Inspection JSON | `1.0.0` | optional fields/views | removed/renamed fields or changed authority |
| Formatter plan | `1.0.0` | new safe edit kinds consumers may ignore | changed edit/fingerprint meaning |
| Diagnostics | stable codes within 1.x | new codes | reusing a code for different meaning |

Severity may become stricter only through an explicitly selected conformance policy or a documented version transition. Automation keys on codes and structured fields, not message text. Serialized objects may gain fields in compatible releases; consumers must ignore fields they do not understand.

The compatibility corpus under `src/core/src/fixtures/semantic-v1-4/` covers canonical task and decision documents, legacy aliases, custom/imported content, duplicate/ambiguous content, empty sections, and malformed Markdown. It is additive test data; PlanFS does not rewrite project artifacts into fixtures. The repository's pre-v1.4 task corpus is also exercised by the release validation commands below.

## Automation recipes

Retrieve acceptance criteria without heading regular expressions:

```sh
planfs inspect TASK-116 --view acceptance-criteria --no-nlp --format json
```

`data.criteria[].checked` is `true`, `false`, or `null`; each entry includes raw Markdown, text, provenance, hierarchy, and an exact source range.

Distinguish authoritative relationships from advisory prose mentions:

```sh
planfs inspect TASK-116 --view relationships --format json
```

Read `data.authoritativeRelationships` for dependency/parent logic. `data.advisoryMentions` and `data.relationshipSignals` are review evidence only.

Enforce deterministic content policy in CI:

```sh
planfs validate --semantic automation-ready --criterion-check-state error --format json
planfs validate --semantic automation-ready --lifecycle --strict --format json
```

Optional advisory analysis is a separate choice:

```sh
planfs validate --semantic automation-ready --nlp --language en --format json
```

Preview normalization without writing:

```sh
planfs format TASK-116 --format json
planfs format --all --check --format json
```

An apply requires every previewed whole-file fingerprint. Archived artifacts are excluded even with `--all` and cannot be explicitly formatted. If a future archive flow offers formatting, it must preview and apply while the item is still active, before the archive move.

## Interactive behavior

VS Code runs supported English advisory rules automatically for the viewed ticket. The workspace-scoped toggle disables them completely; deterministic structural inspection remains available. Dismissal keys are scoped to repository, entity, diagnostic code, and signal identity. Restore removes those keys. Neither operation touches the planning file.

Safely mapped task relationship suggestions can show Apply. An adjacent explanation gives the reason, evidence, exact field/value change, and states that user confirmation—not the analyzer—authorizes the write. PlanFS re-reads the file after confirmation, checks the editor's `updatedAt` token, recomputes the suggestion, runs normal repository validation, and preserves the Markdown body. Ambiguous wording and unsupported relationships have explanation-only review controls.

The CLI uses `--language`; v1.4 supports English only and normalizes English regional tags. Unsupported languages and local analyzer failures return structural results plus bounded advisory diagnostics. There is no language detector, remote service, runtime model download, or LLM.
