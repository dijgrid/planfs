# Advisory Semantic Analysis Prototype (TASK-118)

Status: complete spike; selected signals ready for TASK-119

Date: 2026-08-14

## Decision

TASK-119 may productionize five English-language, PlanFS-owned advisory signals:

1. exact modality tokens;
2. exact negation tokens;
3. bounded condition introducers;
4. explicit date or duration expressions; and
5. an exact PlanFS entity ID occurring with a bounded relationship phrase.

The implementation should use the existing optional `SemanticAnalyzer` interface and identify itself as a local token-rule analyzer. Although deterministic rules produce the evidence, analyzer output uses the contract's `nlp-inferred` provenance because it is advisory prose analysis, not canonical Markdown structure.

No third-party NLP dependency is selected. Observable actions remain deferred; vague wording and compound-criterion signals remain experimental; actor/object inference and unrestricted entity recognition remain rejected for v1.4.

## Prototype and reproduction

The experimental implementation is intentionally isolated under `spikes/semantic-nlp/` and is not exported by `planfs-core`:

```sh
npm run build --workspace planfs-core
npm run prototype --prefix spikes/semantic-nlp
```

`prototype.mjs` consumes `SemanticDocument.criteria` produced by TASK-111. It does not rediscover document sections or list items from the complete raw Markdown body. Within each extracted criterion range, it masks non-prose syntax while preserving character offsets, then applies the candidate token rules. Nested criterion ranges are masked from their parent so signals are not double counted.

`prototype-results.json` records the exact run, individual predictions and signal objects, false-positive and false-negative fixture IDs, source-range checks, mutation checks, cache behavior, and performance. The 47 Markdown-level fixtures comprise the 40 TASK-117 labeled sentences plus adversarial inline-code, fenced-code, URL, link, HTML, and nested-list cases.

## Eligibility and source positions

The prototype analyzes only criterion prose. Before matching it replaces the following regions with equal-length spaces:

- fenced code blocks;
- inline code spans;
- HTML comments, tags, and paired raw-HTML regions;
- autolinks, bare URL text, and Markdown link destinations;
- list/task markers and Markdown punctuation; and
- nested child criteria while analyzing a parent criterion.

Human-visible Markdown link labels remain eligible prose; their destinations do not. Equal-length masking preserves the original UTF-16 offsets. Each emitted signal's evidence range was checked against `document.source.rawMarkdown.slice(start, end)`, with zero failures in the recorded run.

This masking logic is a prototype implementation detail, not a stable parser or analyzer API. TASK-119 should put a tested private eligible-prose projection in core and must not expose a parser-library AST.

## Result shape and authority

Every result includes:

- `language: "en"`;
- analyzer ID `planfs-english-token-rules-experimental` and version `0.1.0`;
- `provenance: "nlp-inferred"`;
- an exact `SourceRange` and evidence text/range;
- a numeric confidence calibrated by rule family;
- `authoritative: false`; and
- signal-specific data such as criterion ID, evidence basis, and relationship target ID.

Analysis never mutates the `SemanticDocument`, frontmatter, or a repository graph. The recorded run had zero mutation failures. Parsing the same source with analysis omitted produced the same semantic document. Unsupported language `fr` produced one bounded `analysis.language.unsupported` informational diagnostic and no signals.

Relationship signals are compared with a separate frontmatter snapshot only after analysis. The probe classified `TASK-117` as already authoritative and `TASK-118` as a prose-only suggestion; the `dependsOn` array remained byte-for-byte unchanged. A comparison result is guidance for a previewable human action, never an update instruction.

## Performance and cache results

Recorded on Node v24.16.0, macOS arm64:

| Measurement | Result | TASK-117 threshold |
| --- | ---: | ---: |
| Analyzer cold start | 4.068 ms | at most 100 ms |
| Uncached parse + analysis | 18,855 docs/s | at least 1,000 docs/s |
| Cached analysis | 140,491 docs/s | at least 1,000 docs/s |
| Direct analyzer package/model size | 0 bytes | at most 5 MB |
| Exclusion failures | 0 | 0 |
| Source-range failures | 0 | 0 |
| Authoritative mutation failures | 0 | 0 |

The prototype cache key contains raw body content, language, analyzer ID, and analyzer version. A bounded eight-entry probe recorded one hit and two misses: the second identical request hit, and a one-character edit missed. The production cache should also include relevant rule configuration, use a documented default capacity, expose no mutable cached objects, and evict least-recently-used entries.

The prototype makes no network calls and adds no production package or model. Its interactive-editor impact is therefore limited to local core execution; TASK-119 still needs CLI and VS Code packaging smoke checks.

## Signal evaluation

| Signal | Precision | Recall | False positives | False negatives | Decision |
| --- | ---: | ---: | --- | --- | --- |
| Modality | 1.000 | 1.000 | none | none | Promote |
| Negation | 1.000 | 1.000 | none | none | Promote |
| Condition | 1.000 | 1.000 | none | none | Promote |
| Date/duration | 1.000 | 1.000 | none | none | Promote |
| Relationship mention | 1.000 | 1.000 | none | none | Promote |
| Observable action | 0.968 | 0.857 | `relative-date` | `context-mention`, `absolute-date`, `measured-fast`, `observable-passive`, `optional-context` | Defer |
| Vague wording | 1.000 | 1.000 | none | none | Experimental |
| Compound criterion | 1.000 | 1.000 | none | none | Experimental |
| Actor/object | not measured | not measured | semantic roles unavailable | semantic roles unavailable | Reject |

The perfect scores are on small bounded lexical sets and must not be read as general natural-language accuracy. That is why vague and compound signals remain experimental despite their fixture scores.

### Promoted confidence and evidence

| Signal | Confidence | Evidence meaning |
| --- | ---: | --- |
| Modality | 0.98 | exact match of `must`, `should`, or `may` |
| Negation | 0.98 | exact match of `not`, `never`, `no`, or `without` |
| Condition | 0.95 | exact bounded introducer such as `if`, `when`, `unless`, `after`, or `before` |
| Date/duration | 0.95 | exact ISO date, numeric duration/rate, or documented relative-date token |
| Relationship mention | 0.90 | exact PlanFS entity ID and a bounded relationship phrase in eligible criterion prose |

Confidence expresses rule specificity, not probability that an inferred planning conclusion is true. In particular, a 0.90 relationship signal does not mean there is a 90% probability of a dependency.

## False cases and exclusions

- Action false positive: `The report is due tomorrow.` matched `report` as a verb although it is a noun.
- Action false negatives include passive voice (`Warnings are shown...`) and descriptive verbs outside the bounded lexicon.
- Inline code containing `must not depend on TASK-999` produced no modality, negation, or relationship result.
- The same tokens in a Markdown link destination, autolink, fenced code block, or paired raw HTML produced no result.
- Eligible link-label prose still participated in a relationship signal.
- A nested criterion produced its own signals but did not duplicate them in its parent.

## TASK-119 production boundary

TASK-119 receives only the five promoted signals. Its stable implementation must:

- expose explicit opt-in through core and CLI;
- keep ordinary parsing, loading, and validation unchanged when omitted or unsupported;
- keep eligible-prose projection private and source-position preserving;
- ship locally with no model, remote call, runtime download, or experimental spike dependency;
- use a bounded content/language/analyzer-version/configuration cache;
- return defensive copies so callers cannot mutate cached state;
- emit a bounded advisory diagnostic for unsupported languages or load failures;
- serialize only stable promoted signal codes and fields; and
- test disabled fallback, exclusions, exact evidence ranges, cache invalidation, packaging, privacy, and authoritative-data isolation.

TASK-112 may later translate stable advisory results into validator diagnostics. TASK-115 may render them. Neither should infer or apply metadata changes.
