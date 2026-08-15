# Local Advisory Semantic Analysis

PlanFS v1.4 provides an optional local analyzer over semantic task criteria. Structural Markdown parsing, repository loading, and ordinary validation never require it. The low-level core helper and validation integration are disabled by default; the interactive semantic inspection command runs it by default and provides `--no-nlp`.

## Enablement

Core callers opt in explicitly:

```ts
const document = parseSemanticDocument(entity.type, entity.body, {
  filePath: entity.filePath
});
const result = await runSemanticAnalysis(document, {
  enabled: true,
  language: 'en'
});
```

CLI callers use:

```sh
planfs show TASK-119 --nlp
planfs show TASK-119 --nlp --language en --format json
planfs inspect TASK-119
planfs inspect TASK-119 --no-nlp
```

Without `--nlp`, `show --format json` retains its existing entity JSON shape. With analysis enabled, the top-level stable shape is:

```json
{
  "entity": { "id": "TASK-119" },
  "analysis": {
    "analyzer": { "id": "planfs-local-english-rules", "version": "1.0.0" },
    "language": "en",
    "signals": [],
    "diagnostics": []
  }
}
```

## Stable signals

Only behavior promoted by TASK-118 is stable:

| `kind` | Evidence | Confidence |
| --- | --- | ---: |
| `modality` | exact `must`, `should`, or `may` token | 0.98 |
| `negation` | exact `not`, `never`, `no`, or `without` token | 0.98 |
| `condition` | bounded introducer such as `if`, `when`, `unless`, `after`, or `before` | 0.95 |
| `date-duration` | ISO date, numeric duration/rate, or documented relative-date token | 0.95 |
| `relationship-mention` | nearby exact PlanFS ID and bounded relationship phrase in one prose clause | 0.90 |

Every signal includes `language`, analyzer identity/version, `provenance: "nlp-inferred"`, an exact source range, evidence text and range, numeric confidence, `authoritative: false`, and rule-specific data. Confidence records rule specificity; it is not a probability that a planning conclusion is true.

Observable-action, actor/object, vague-wording, compound-criterion, and unrestricted entity signals are not part of the stable implementation.

## Authority and privacy

Analysis is read-only and advisory. A relationship mention never changes `dependsOn`, `epic`, `milestone`, status, check state, or repository graph calculations. The analyzer returns no write instruction. The VS Code editor may separately offer an explicit Apply control only when a task signal maps unambiguously to `dependsOn`, `epic`, or `milestone` and the referenced entity exists with the expected type. Its explanation widget shows the source evidence and exact metadata change; confirmation, repository validation, and an `updatedAt` concurrency check occur before the authoritative edit. Dirty drafts, stale files, unsupported mappings, ambiguous signals, and invalid targets cannot be applied.

Analysis runs in the PlanFS process. It contains no network client, remote API, LLM, model file, runtime download, or prose logging. An analyzer failure diagnostic intentionally omits the underlying error message so an adapter cannot accidentally place ticket prose in output.

## Eligible prose

The analyzer consumes criteria already identified by the semantic Markdown parser. It masks fenced code, inline code, raw HTML, HTML comments, autolinks, URL text, link destinations, list/task markers, Markdown punctuation, and nested child criteria before matching. Visible link labels remain eligible. Masking preserves UTF-16 offsets so evidence ranges always address the original raw body.

## Language and failure behavior

The built-in analyzer supports English and normalizes tags such as `en-US` to `en`. An unsupported language returns no signals and one `analysis.language.unsupported` informational diagnostic. A local analyzer exception returns no signals and one `analysis.analyzer.unavailable` warning. Neither case changes or hides the structural semantic document or entity.

Interactive CLI inspection and VS Code ticket inspection enable the supported local English rules by default because they provide immediate, bounded feedback. `inspect --no-nlp`, the editor's workspace-scoped Disable control, or leaving analysis disabled in the core API turns it off completely. Validation and CI never enable it implicitly: callers must pass `validate --nlp` and may select a language with `--language`. Automatic language detection and non-English analyzers are not implemented in v1.4; unsupported selections fall back to structural output plus the informational diagnostic. Multilingual work is deferred to `EPIC-multilingual-semantic-analysis`.

## Cache and packaging

`LocalRuleSemanticAnalyzer` has a 256-entry LRU cache by default. The key includes raw body content, normalized language, analyzer ID/version, entity profile type/version, and therefore invalidates after source, language, analyzer, or profile changes. Callers may set a non-negative `cacheSize`, inspect `cacheStats`, or clear the cache. Returned results are defensive copies.

The editor additionally uses a bounded `SemanticInspectionCache` so an unchanged visible ticket is not structurally reparsed or revalidated on refresh. Metadata, body, profile/validation options, language, and analyzer identity participate in its key; changed input produces a miss. Suppressed suggestions are stored separately per workspace using a stable entity/code/target key. Suppression is reversible, does not change Markdown, and never adds an inferred relationship.

The analyzer is compiled into `planfs-core`; there is no model or analyzer asset to copy. Package dry runs include `dist/semantic-analyzer.js` and its declarations. `planfs-cli` and the VS Code extension resolve the same `planfs-core` workspace/package dependency.
