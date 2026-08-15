# Semantic Markdown Documents (Proposed v1.4)

Status: proposed for PlanFS 1.4 implementation and human review

Semantic contract version: `1.0.0`

Initial profile version: `1.0.0`

This document defines the proposed contract between human-authored Markdown bodies and PlanFS consumers. It is an implementation-neutral design for TASK-110, not a claim that the parser, validator, formatter, CLI, or editor behavior already exists.

## 1. Principles and boundaries

Markdown and YAML files remain the human-owned source of truth. PlanFS may interpret, validate, inspect, and explicitly format them, but a read or validation operation never changes a file. Formatting is a separate operation with a preview, an explicit apply step, and conservative preservation of unknown content.

The contract separates four concerns:

| Concern | Input and responsibility | Authority |
| --- | --- | --- |
| YAML frontmatter schema | Typed entity metadata such as `id`, `title`, `status`, `dependsOn`, `epic`, and `milestone` | Authoritative for metadata and planning relationships |
| Markdown content profile | Entity-specific conventions for a preamble and named sections | Authoritative as authored text; structural classification is a deterministic PlanFS interpretation |
| Semantic analysis | Optional signals derived from rules or local language-aware analyzers | Advisory only |
| Repository integrity | Cross-file checks such as reference existence, filename identity, uniqueness, and dependency cycles | Authoritative validation of frontmatter and repository state |

Frontmatter and body content may repeat a concept, especially `description`, decision `context`, `decision`, or `consequences`. The typed frontmatter value remains authoritative where the v1 schema defines one. The body view is preserved and reported independently; disagreement produces a diagnostic and is never silently reconciled.

Entity-ID mentions in prose or links are evidence that two documents may be related. They do not create a dependency, parent, milestone membership, supersession relationship, status change, or any other metadata. Only an explicit metadata update can do that.

Structural parsing is local, deterministic, and available with no NLP package. No LLM and no remote prose-analysis service is part of this design. A local NLP integration may be added only for signals shown useful by TASK-117 and TASK-118.

## 2. Public conceptual model

The names below establish the public concepts and serialized field meanings. TASK-111 may refine TypeScript ergonomics, but it must preserve these meanings and must not expose a parser-library-specific AST.

```ts
type EntityType = "task" | "epic" | "milestone" | "decision";
type SemanticContractVersion = "1.0.0";
type SemanticProfileVersion = "1.0.0";
type SemanticProvenance =
  | "canonical"
  | "alias"
  | "rule-inferred"
  | "nlp-inferred";

interface SourcePoint {
  /** Zero-based UTF-16 code-unit offset in SemanticSource.rawMarkdown. */
  offset: number;
  /** One-based line number. */
  line: number;
  /** One-based UTF-16 code-unit column. */
  column: number;
}

interface SourceRange {
  /** Inclusive start and exclusive end. */
  start: SourcePoint;
  end: SourcePoint;
}

interface SemanticSource {
  filePath: string;
  /** Exact Markdown body supplied to semantic parsing, including line endings. */
  rawMarkdown: string;
}

interface SemanticPreamble {
  markdown: string;
  text: string;
  range: SourceRange;
  empty: boolean;
}

type SectionKey = string;
type ContentShape =
  | "prose"
  | "list"
  | "task-list"
  | "references"
  | "mixed"
  | "empty";

interface SemanticSubsection {
  heading: string;
  headingLevel: 3 | 4 | 5 | 6;
  headingRange: SourceRange;
  range: SourceRange;
  markdown: string;
  text: string;
  children: SemanticSubsection[];
}

interface OrderedSection {
  /** Stable within one parse: source-order index, not a durable repository ID. */
  index: number;
  heading: string;
  normalizedHeading: string;
  headingLevel: 2;
  /** Present only when the heading matches the selected profile. */
  key: SectionKey | null;
  provenance: "canonical" | "alias" | "rule-inferred";
  headingRange: SourceRange;
  contentRange: SourceRange;
  range: SourceRange;
  /** Exact heading plus content. */
  markdown: string;
  /** Exact content after the heading. */
  contentMarkdown: string;
  text: string;
  contentShape: ContentShape;
  empty: boolean;
  subsections: SemanticSubsection[];
}

interface SemanticCriterion {
  id: string;
  checked: true | false | null;
  markdown: string;
  text: string;
  range: SourceRange;
  sectionIndex: number;
  listDepth: number;
  parentCriterionId: string | null;
  provenance: "canonical" | "alias" | "rule-inferred";
}

interface SemanticFinding {
  markdown: string;
  text: string;
  range: SourceRange;
  sectionIndex: number;
  provenance: "canonical" | "alias" | "rule-inferred";
}

interface SemanticQuestion {
  markdown: string;
  text: string;
  range: SourceRange;
  sectionIndex: number;
  provenance: "canonical" | "alias" | "rule-inferred";
}

interface SemanticDecisionStatement {
  markdown: string;
  text: string;
  range: SourceRange;
  sectionIndex: number;
  provenance: "canonical" | "alias" | "rule-inferred";
}

interface SemanticReference {
  kind: "link" | "autolink" | "bare-entity-id";
  label: string | null;
  target: string;
  range: SourceRange;
  sectionIndex: number | null;
  provenance: "canonical" | "alias" | "rule-inferred";
}

type MentionEntityType = "task" | "epic" | "milestone" | "decision";

interface EntityMention {
  id: string;
  entityType: MentionEntityType;
  form: "prose" | "link-label" | "link-target";
  range: SourceRange;
  sectionIndex: number | null;
  referenceTarget: string | null;
  resolved: boolean | null;
  authoritative: false;
  provenance: "rule-inferred" | "nlp-inferred";
}

interface KnownSectionView {
  /** All matching sections in source order; duplicates are never collapsed away. */
  [key: SectionKey]: OrderedSection[];
}

interface ConformanceSummary {
  baseline: "conformant" | "nonconformant";
  automationReady: "conformant" | "nonconformant" | "not-evaluated";
  lifecycle: "conformant" | "nonconformant" | "not-applicable" | "not-evaluated";
}

interface SemanticDocument {
  contractVersion: SemanticContractVersion;
  profile: { entityType: EntityType; version: SemanticProfileVersion };
  source: SemanticSource;
  preamble: SemanticPreamble;
  sections: OrderedSection[];
  knownSections: KnownSectionView;
  criteria: SemanticCriterion[];
  findings: SemanticFinding[];
  questions: SemanticQuestion[];
  decisions: SemanticDecisionStatement[];
  references: SemanticReference[];
  mentions: EntityMention[];
  diagnostics: SemanticDiagnostic[];
  conformance: ConformanceSummary;
  analyzerResults: AnalyzerResult[];
}
```

`id` on a criterion is deterministic for one source snapshot, for example `criterion:<sectionIndex>:<ordinal>`. It is not a durable identity after edits; consumers use `range` and content when preparing a previewed repair.

Plain `text` is a convenience projection for search and display. It does not replace `markdown`, must not be used to rewrite source, and may normalize Markdown escapes and inline formatting. Every rewrite-capable consumer uses the exact Markdown and source range.

## 3. Source preservation and positions

Semantic parsing accepts the raw Markdown body, not a reserialized AST. The returned `source.rawMarkdown` must be byte-for-byte equivalent after UTF-8 decoding to the supplied JavaScript string, including blank lines, trailing whitespace, and `LF` or `CRLF` line endings. Parsing must not call `trim`, normalize line endings, or synthesize a final newline.

All ranges are relative to `source.rawMarkdown`, use zero-based UTF-16 offsets, and have an inclusive start and exclusive end. Lines and columns are one-based and count UTF-16 code units so TypeScript, JSON clients, and VS Code can agree. For every range:

```ts
source.rawMarkdown.slice(range.start.offset, range.end.offset)
```

must equal the corresponding `markdown` value. Heading, content, complete section, criterion, finding, decision, reference, and mention ranges must be available. Empty regions have equal start and end offsets at the deterministic insertion point. If a malformed construct prevents an exact subrange, PlanFS preserves the enclosing raw region, omits the unsafe derived item, and emits a located diagnostic; it must not invent a range.

The public model exposes PlanFS concepts and conservative subsection summaries. Parser tokens, node types, positional objects, and plugins remain private implementation details.

## 4. Structural extraction

### 4.1 Preamble and section boundaries

- The preamble is everything before the first Markdown level-two (`##`) heading. With no level-two heading, the whole body is the preamble. The preamble object always exists, even when empty.
- A real level-two heading starts a top-level `OrderedSection`; its section ends immediately before the next real level-two heading or at end of input.
- Level-three through level-six headings remain inside their containing top-level section and appear in `subsections`. Before the first level-two heading, they remain preamble content.
- A level-one heading never creates a semantic section. It stays in the current region and produces an automation-ready `content.unexpected-heading-level` warning because entity title is frontmatter-owned.
- A heading-like line inside a fenced code block, indented code block, block quote, or raw HTML block is not a section boundary.
- Section order is always source order. Profiles recommend presentation order but tolerant reads never reorder or reject content solely for order.

### 4.2 Heading matching

Matching is deterministic:

1. Extract the heading's rendered plain text.
2. Trim leading and trailing Unicode whitespace.
3. Collapse each internal Unicode-whitespace run to one ASCII space.
4. Compare using Unicode default case folding against the selected profile's canonical name and aliases.

No punctuation is removed, reordered, or guessed. Markdown emphasis in a heading may disappear in rendered text, but punctuation remains significant. Fuzzy similarity, stemming, NLP classification, and repository-specific synonyms are not heading matching. Thus `## Acceptance Criteria:` and `## Acceptance / Success Criteria` are unknown unless a future version explicitly lists them.

A canonical match has `canonical` provenance; an exact documented alias has `alias` provenance. An unmatched heading has `key: null` and `rule-inferred` provenance only to indicate that PlanFS structurally inferred a generic section boundary, not its meaning.

### 4.3 Lists and acceptance criteria

- In a recognized `acceptanceCriteria` section, every Markdown list item is exposed as a criterion in document order, including nested items.
- A GFM task marker `[x]` or `[X]` yields `checked: true`; `[ ]` yields `checked: false`; an ordinary list item yields `checked: null`.
- The range and Markdown cover the complete list item, including its marker and nested blocks. `listDepth` is zero for top-level items. Nested items identify their nearest list-item parent.
- Ordinary items remain criteria rather than disappearing, but automation-ready validation emits `content.criterion.missing-check-state`.
- Paragraphs, tables, and code blocks in the section remain section content but are not criteria. Non-list substantive content emits `content.acceptance-criteria.unstructured` at automation-ready conformance.
- Task-list-looking text inside code, raw HTML, or inline code is never a criterion.

Findings and questions are list items or standalone prose blocks in recognized `findings` and `questions` sections. Decision statements are substantive blocks in a recognized `decisions` section, and for a decision entity also in the singular `decision` section. References are Markdown links, autolinks, and bare entity IDs anywhere outside opaque content; references inside a recognized `references` section inherit that section's canonical-or-alias provenance, while references elsewhere use `rule-inferred`. These normalized arrays retain section and range provenance; their source sections remain available in full.

### 4.4 Duplicates, empty and unknown sections

- Every section is preserved. A second canonical-or-alias match for the same key is a duplicate even if one match is canonical and one is an alias.
- `knownSections[key]` contains all matches in source order. Item convenience arrays concatenate items in section order and retain `sectionIndex`; no primary section is selected.
- Duplicates emit `content.section.duplicate`. If their normalized content conflicts, an additional `content.section.ambiguous` diagnostic explains that callers must not select a value implicitly.
- A section containing only whitespace or comments is empty, remains present with an insertion range, and emits `content.section.empty` when that section is expected to contain content.
- An unknown section remains a generic `OrderedSection` with its exact heading, Markdown, nested content, and ranges. Unknown sections are baseline-conformant and are never deleted by formatting.

### 4.5 Code, HTML, links and mentions

- Fenced and indented code blocks and inline code are opaque to section, criterion, link, and mention extraction. An unclosed fence consumes the remainder as code according to structural Markdown rules and emits `content.markdown.unclosed-fence` when detectable.
- Raw HTML blocks and inline HTML are preserved and opaque. PlanFS does not interpret headings, checkboxes, links, or IDs inside HTML in v1.4.
- Markdown inline links and autolinks outside opaque content produce references. Reference-style links resolve when their definition is available; unresolved definitions remain raw and emit a warning rather than producing a fabricated target.
- Entity mentions are recognized only at token boundaries using case-sensitive PlanFS ID shapes: `TASK-[0-9]{3,}`, `EPIC-<slug>`, `MILESTONE-<slug>`, and `DECISION-<slug>`. The exact candidate is preserved. Repository resolution may later set `resolved`; structural parsing alone uses `null`.
- The same textual occurrence produces one mention. A link may also produce one reference. Mentions in link labels use `link-label`; an ID in a local PlanFS link target uses `link-target` and retains that target.
- All structurally recognized mentions have `rule-inferred` provenance and `authoritative: false`, including verbs such as “blocks,” “depends on,” or “replaces.” Language analysis may report a possible relation separately, never as metadata.

### 4.6 Malformed input

The parser is tolerant. It returns the largest safe semantic document and preserves all raw input. Markdown recovery follows the selected structural parser's CommonMark/GFM rules, but public results follow this contract rather than exposing that parser's nodes. Parser recovery that changes semantic boundaries produces a diagnostic. An unsafe or unsupported construct is generic preserved content, not discarded content.

Malformed YAML is outside semantic-body parsing and remains the existing tolerant loader's responsibility. Frontmatter diagnostics and semantic diagnostics may be presented together, but keep their codes and authority domains separate.

## 5. Content profiles

All listed sections have cardinality `0..1` for conformance. Tolerant extraction accepts `0..n` and diagnoses duplicates. “Prose/list” means either form is acceptable. An empty preamble or missing optional section is baseline-conformant.

Aliases are exact after the normalization in section 4.2. The tables are the complete initial alias set; repositories cannot configure extra aliases in v1.4.

### 5.1 Task profile

The preamble is the description candidate.

| Key | Canonical heading | Supported aliases | Cardinality | Expected content |
| --- | --- | --- | --- | --- |
| `scope` | `Scope` | `In Scope` | `0..1` | prose/list |
| `acceptanceCriteria` | `Acceptance Criteria` | `Acceptance`; `Success Criteria` | `0..1` | task list; ordinary list tolerated |
| `nonGoals` | `Non-Goals` | `Out of Scope` | `0..1` | prose/list |
| `implementationNotes` | `Implementation Notes` | `Technical Notes` | `0..1` | mixed |
| `testingStrategy` | `Testing Strategy` | `Test Plan` | `0..1` | prose/list |
| `findings` | `Findings` | none | `0..1` | prose/list |
| `decisions` | `Decisions` | `Decision Log` | `0..1` | prose/list |
| `references` | `References` | `Links` | `0..1` | links/list |
| `questions` | `Questions` | `Open Questions` | `0..1` | prose/list |

Automation-ready tasks require a non-empty description candidate and at least one criterion. Canonical headings are recommended; an alias is conformant but emits an informational normalization diagnostic.

### 5.2 Epic profile

The preamble is the epic summary candidate.

| Key | Canonical heading | Supported aliases | Cardinality | Expected content |
| --- | --- | --- | --- | --- |
| `outcomes` | `Outcomes` | `Goals` | `0..1` | prose/list |
| `scope` | `Scope` | `In Scope` | `0..1` | prose/list |
| `nonGoals` | `Non-Goals` | `Out of Scope` | `0..1` | prose/list |
| `childTasks` | `Child Tasks` | `Tasks` | `0..1` | list/references |
| `findings` | `Findings` | none | `0..1` | prose/list |
| `decisions` | `Decisions` | `Decision Log` | `0..1` | prose/list |
| `references` | `References` | `Links` | `0..1` | links/list |
| `questions` | `Questions` | `Open Questions` | `0..1` | prose/list |

Automation-ready epics require a non-empty summary and outcomes. `Child Tasks` is documentary only: the authoritative child set is tasks whose frontmatter `epic` equals the epic ID.

### 5.3 Milestone profile

The preamble is the milestone summary candidate.

| Key | Canonical heading | Supported aliases | Cardinality | Expected content |
| --- | --- | --- | --- | --- |
| `outcomes` | `Outcomes` | `Goals` | `0..1` | prose/list |
| `scope` | `Scope` | `In Scope` | `0..1` | prose/list |
| `releaseCriteria` | `Release Criteria` | `Exit Criteria`; `Success Criteria` | `0..1` | task list; ordinary list tolerated |
| `childEpics` | `Child Epics` | `Epics` | `0..1` | list/references |
| `risks` | `Risks` | `Known Risks` | `0..1` | prose/list |
| `findings` | `Findings` | none | `0..1` | prose/list |
| `decisions` | `Decisions` | `Decision Log` | `0..1` | prose/list |
| `references` | `References` | `Links` | `0..1` | links/list |
| `questions` | `Questions` | `Open Questions` | `0..1` | prose/list |

Automation-ready milestones require a non-empty summary, outcomes, and at least one release criterion. Child-epic text is documentary; repository relationships remain frontmatter-derived.

### 5.4 Decision profile

The preamble is an optional decision summary candidate.

| Key | Canonical heading | Supported aliases | Cardinality | Expected content |
| --- | --- | --- | --- | --- |
| `context` | `Context` | `Background` | `0..1` | prose |
| `decision` | `Decision` | `Resolution` | `0..1` | prose |
| `consequences` | `Consequences` | `Implications` | `0..1` | prose/list |
| `alternatives` | `Alternatives` | `Options Considered` | `0..1` | prose/list |
| `findings` | `Findings` | none | `0..1` | prose/list |
| `references` | `References` | `Links` | `0..1` | links/list |
| `questions` | `Questions` | `Open Questions` | `0..1` | prose/list |

Automation-ready decisions require non-empty context, decision, and consequences, satisfied by authoritative frontmatter or the corresponding canonical/alias body section. When both exist, PlanFS exposes both and diagnoses disagreement; it never chooses body text over frontmatter.

## 6. Conformance tiers

Conformance is layered so capture remains easy and automation can ask for stronger guarantees.

### 6.1 Baseline

Baseline evaluates whether the Markdown can be represented without semantic loss:

- raw input, preamble, every level-two section, unknown content, and safe ranges are preserved;
- recognized headings are classified only through the selected profile;
- malformed constructs that prevent safe extraction produce diagnostics;
- unknown, missing, empty, alias, duplicate, or out-of-order known sections do not by themselves make a captured document baseline-invalid.

A baseline error means PlanFS cannot safely satisfy the preservation contract, not that the writing is incomplete.

### 6.2 Automation-ready

Automation-ready evaluates the entity-specific requirements above and additionally requires:

- no ambiguous duplicate recognized sections;
- required description/summary and sections are non-empty;
- criteria-shaped sections contain list items, and every required criterion has `checked !== null`;
- exact source ranges exist for every value the caller intends to edit;
- no error-severity semantic diagnostics.

Unknown sections and additional prose remain allowed. Section order is advisory. A task with `refinementState: captured`, `needs-refinement`, `deferred`, or `discarded` is not automatically invalid; automation-ready is either not evaluated or reported as an advisory readiness result unless a caller explicitly requests it. This preserves low-friction backlog capture.

### 6.3 Lifecycle-sensitive

Lifecycle rules use authoritative frontmatter state plus semantic content. They never change state:

- A task in `review` should have criteria and no `checked: false` or `null` criterion. A `done` task with incomplete criteria receives a stronger warning, not an automatic status change.
- A completed epic should have non-empty outcomes; open child work discovered from task frontmatter is a repository/lifecycle warning, never inferred from its `Child Tasks` prose.
- A completed milestone should have all release criteria checked; membership and delivery state still come from frontmatter.
- An accepted decision should have context, a decision statement, and consequences. A superseded decision's authoritative relationship comes only from `supersedes` or `supersededBy` frontmatter.

These are policy diagnostics in v1.4. Repositories or CI may opt into stricter gating, but default `planfs validate` should distinguish the tier and avoid turning advisory content quality into repository corruption.

## 7. Diagnostics

```ts
type SemanticSeverity = "info" | "warning" | "error";

interface DiagnosticRepair {
  summary: string;
  kind: "edit-markdown" | "edit-frontmatter" | "format" | "none";
  /** True only when a deterministic formatter can preview the exact patch. */
  previewable: boolean;
}

interface SemanticDiagnostic {
  /** Stable machine code; display text is not an API key. */
  code: string;
  severity: SemanticSeverity;
  message: string;
  range: SourceRange | null;
  sectionIndex: number | null;
  provenance: SemanticProvenance;
  conformance: "baseline" | "automation-ready" | "lifecycle" | "analysis";
  repair: DiagnosticRepair;
  data?: Record<string, string | number | boolean | null>;
}
```

Initial code families and meanings:

| Code | Default severity | Meaning |
| --- | --- | --- |
| `content.markdown.unclosed-fence` | warning | A fence consumed the remaining body |
| `content.markdown.unsupported-region` | error | Exact safe extraction is unavailable for a region |
| `content.unexpected-heading-level` | warning | A level-one heading appears in body structure |
| `content.section.alias` | info | A documented alias matched |
| `content.section.duplicate` | warning | More than one section matched one key |
| `content.section.ambiguous` | warning | Duplicate recognized content conflicts |
| `content.section.empty` | warning | A recognized section expected content but is empty |
| `content.section.missing` | warning | An automation-ready required section is absent |
| `content.acceptance-criteria.unstructured` | warning | Substantive non-list content appears where criteria are expected |
| `content.criterion.missing-check-state` | warning | An ordinary list item yielded `checked: null` |
| `content.reference.unresolved-definition` | warning | A reference-style link has no target definition |
| `content.frontmatter-body.conflict` | warning | Authoritative frontmatter and body views disagree |
| `content.lifecycle.incomplete-criteria` | warning | Lifecycle state and criterion state are inconsistent |
| `analysis.unsupported-language` | info | An analyzer cannot handle the requested language |
| `analysis.failed` | warning | Optional analysis failed without invalidating structural output |

Diagnostics are read-only observations. Repair guidance describes the narrow action; it is not an implicit edit. Formatter repairs must be explicit and previewable. Consumers gate on `code`, severity, and conformance tier, never on English message text.

## 8. Optional language-aware analyzers

Structural parsing completes before analyzers run and returns the same structural document whether analyzers are absent, disabled, unsupported, or fail.

```ts
interface AnalyzerIdentity {
  id: string;
  version: string;
}

interface AnalyzerRequest {
  document: SemanticDocument;
  /** BCP 47 tag supplied by the caller or a separately identified detector. */
  language: string;
}

interface AnalyzerEvidence {
  text: string;
  range: SourceRange;
}

interface AdvisorySignal {
  kind: string;
  message: string;
  language: string;
  analyzer: AnalyzerIdentity;
  provenance: "nlp-inferred";
  range: SourceRange;
  evidence: AnalyzerEvidence[];
  /** Optional calibrated value in [0, 1], meaningful only for this analyzer/version. */
  confidence: number | null;
  authoritative: false;
  data: Record<string, string | number | boolean | null>;
}

interface AnalyzerResult {
  analyzer: AnalyzerIdentity;
  language: string;
  signals: AdvisorySignal[];
  diagnostics: SemanticDiagnostic[];
}

interface SemanticAnalyzer {
  readonly identity: AnalyzerIdentity;
  readonly supportedLanguages: readonly string[];
  analyze(request: AnalyzerRequest): Promise<AnalyzerResult>;
}
```

Every NLP signal includes a BCP 47 language tag, analyzer ID and version, `nlp-inferred` provenance, an exact source range, quoted evidence ranges or a confidence value (preferably both), and `authoritative: false`. Confidence values are not comparable across analyzer versions unless that analyzer documents calibration. Signals may suggest unclear language, missing evidence, or a possible relationship, but they cannot alter metadata, structural section classification, diagnostics from deterministic parsing, or conformance by default.

Only local, non-LLM analyzers are eligible. TASK-117 selects candidate libraries; TASK-118 must demonstrate useful, bounded signals and establish language and confidence behavior before TASK-119 may integrate them. An analyzer is an optional adapter, not a dependency of the core structural contract.

## 9. Compatibility and versioning

- `contractVersion` versions serialized semantic shapes and field meanings. Removing a field, changing a field's type or authority, changing range units, or changing duplicate aggregation requires a contract major version.
- `profile.version` versions canonical keys, names, aliases, cardinality, and expected shapes. A requested profile version has an immutable alias table.
- Adding an alias can reclassify a formerly custom section, so it requires a new profile version and must not change results for callers pinned to an older version. Alias removal or remapping is breaking.
- Adding an optional section key is additive only in a new profile minor version. Making a section required, changing its content shape incompatibly, or changing its canonical meaning requires a profile major version.
- Diagnostic codes and their semantic meaning are stable within a contract major version. New codes are additive. Removing a code, reusing it, or raising its default severity in a way that changes default validity requires a major version; message and repair wording may improve compatibly.
- Serialized JSON always includes contract and profile versions. New optional fields are additive in minor versions. Consumers must ignore unknown fields and unknown diagnostic codes, preserve known raw fields, and must not infer authority from provenance alone.
- Arrays preserve source order. JSON object key order is not contractual. `null` is retained where it distinguishes unknown/not-applicable from absence, especially criterion `checked`, ranges on whole-file diagnostics, and confidence.
- Parser-library upgrades may not alter public behavior without the corresponding contract/profile version and regression fixtures.
- Repository `formatVersion` and semantic contract version are separate. Existing v1 repositories remain readable without rewriting Markdown; semantic inspection is a derived view.

## 10. Representative tickets

The examples omit frontmatter unless it matters. Ranges are abbreviated for readability; real JSON always includes full points.

### 10.1 Canonical task

```markdown
Add retry handling without changing the public API.

## Acceptance Criteria

- [x] Retry idempotent requests twice.
- [ ] Preserve the original error after the final attempt.

## References

- [Retry policy](docs/retries.md)
```

This yields a non-empty preamble, canonical sections, criteria with `checked: true` and `false`, and a link reference. It is structurally automation-ready; lifecycle conformance depends on authoritative task status.

### 10.2 Loosely conformant task

```markdown
Improve retry behavior.

## Success Criteria

- Retry safe calls.
- Preserve the final error.
```

`Success Criteria` has `alias` provenance. Both ordinary list items are preserved with `checked: null`; baseline conforms, while automation-ready reports the alias informational diagnostic and two missing-check-state warnings.

### 10.3 Custom task

```markdown
Investigate the cache.

## Experiment Log

| Run | Hit rate |
| --- | ---: |
| A | 91% |
```

`Experiment Log` is a generic section with `key: null`. The table and exact Markdown survive inspection and future formatting. No fuzzy match to `Findings` occurs.

### 10.4 Ambiguous relationship prose

```markdown
Complete this after TASK-117, which may inform the approach.

## Questions

- Does TASK-117 block delivery or only provide optional evidence?
```

Both occurrences are advisory mentions. Even the phrase “after TASK-117” does not create `dependsOn`. An optional NLP analyzer may emit a possible-relationship signal with evidence, but only a human-approved frontmatter edit can establish the dependency.

### 10.5 Duplicate recognized sections

```markdown
Ship the change.

## Acceptance Criteria

- [ ] Preserve old files.

## Success Criteria

- [ ] Rewrite all old files.
```

Both sections appear in `knownSections.acceptanceCriteria`; criteria concatenate in source order. PlanFS emits duplicate and ambiguous diagnostics and never selects the canonical heading over the alias or reconciles the conflict.

### 10.6 Malformed Markdown

````markdown
Investigate parser recovery.

```text
## Acceptance Criteria
- [x] This is an example, not a criterion.

## Findings

- This text is still inside the unclosed fence.
````

The whole remainder is preserved as fenced code. No sections, criteria, findings, links, or mentions are extracted from it. A located unclosed-fence diagnostic explains why.

### 10.7 NLP-enriched task

```markdown
Make sync fast and reliable for all users.

## Acceptance Criteria

- [ ] Sync completes quickly.
```

Structural output is valid without NLP. A proven local analyzer could add:

```json
{
  "analyzer": { "id": "planfs-ticket-quality-en", "version": "0.2.0" },
  "language": "en",
  "signals": [
    {
      "kind": "criterion.vague-qualifier",
      "message": "The criterion uses an unquantified speed qualifier.",
      "language": "en",
      "analyzer": { "id": "planfs-ticket-quality-en", "version": "0.2.0" },
      "provenance": "nlp-inferred",
      "range": { "start": { "offset": 83, "line": 5, "column": 7 }, "end": { "offset": 100, "line": 5, "column": 24 } },
      "evidence": [
        { "text": "completes quickly", "range": { "start": { "offset": 83, "line": 5, "column": 7 }, "end": { "offset": 100, "line": 5, "column": 24 } } }
      ],
      "confidence": 0.86,
      "authoritative": false,
      "data": { "qualifier": "quickly" }
    }
  ],
  "diagnostics": []
}
```

The exact offsets above are illustrative; fixtures must calculate them from the raw source. The signal is advisory, analyzer-scoped, language-tagged, and cannot fail repository integrity or rewrite the criterion.

## 11. Implementation gates and open design questions

TASK-111 and TASK-112 should convert this contract into fixtures before choosing or wrapping a Markdown parser. TASK-114 must demonstrate loss preservation and idempotence before offering apply mode. TASK-117 and TASK-118 control whether any NLP surface advances beyond the optional interface.

The following remain explicit review questions:

1. Should source JSON keep one-based line/column values as proposed, or align line/column to VS Code's zero-based convention while retaining zero-based offsets?
2. Should `resolved` mentions be filled by a repository-aware enrichment pass or kept out of structural serialized output entirely?
3. Should default `planfs validate` display automation-ready and lifecycle warnings, or require an explicit validation tier flag to avoid noise in existing repositories?
4. Which, if any, NLP signals meet the evidence, performance, licensing, and language-quality bar in TASK-117 and TASK-118?

These questions do not block the structural extraction contract. They must be resolved or deliberately deferred during human review before dependent public JSON and validation behavior are finalized.
