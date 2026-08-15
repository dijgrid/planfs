# Semantic NLP Evaluation (TASK-117)

Status: complete spike; production recommendation ready for TASK-118

Date: 2026-08-14

## Decision

PlanFS should keep the `SemanticAnalyzer` adapter boundary defined by TASK-110, but it should not add winkNLP, compromise, retext, spaCy, or another NLP runtime dependency in v1.4.

TASK-118 should prototype PlanFS-owned, English-language token rules over eligible prose extracted by the semantic Markdown parser. These rules are local, deterministic, advisory, and versioned as an analyzer. They must not become part of structural parsing or repository integrity. A third-party analyzer can be added behind the same boundary in a later version if a larger corpus proves that it materially improves a promoted signal.

The reason is empirical: on the checked-in 40-example PlanFS corpus, the no-dependency baseline had the best micro F1 and the best precision. None of the POS-backed candidates improved the difficult observable-action signal enough to justify additional packaging and runtime cost.

## Reproduce the evaluation

The checked-in spike is under `spikes/semantic-nlp/`:

```sh
npm install --prefix spikes/semantic-nlp
npm run benchmark --prefix spikes/semantic-nlp
npm audit --prefix spikes/semantic-nlp
```

Inputs and outputs:

- `fixtures.json` contains 40 labeled examples, including PlanFS wording and synthetic canonical, conditional, vague, compound, negated, dated, and relationship cases.
- `benchmark.mjs` contains the adapters, rules, thresholds, scoring, compatibility probes, and timing loop.
- `results.json` contains per-example predictions, per-signal confusion counts, false-positive and false-negative fixture IDs, timing, and direct installed package sizes.
- `package-lock.json` pins the evaluated versions. The spike dependencies are isolated and are not PlanFS runtime dependencies.

The recorded run used Node v24.16.0 on macOS arm64. Each warmed candidate processed 10,000 fixture documents. Timing is a comparative local measurement, not a cross-platform guarantee. Cold start includes dynamic import and analyzer initialization in one benchmark process; filesystem caching may benefit later imports.

## Promotion thresholds

A signal is eligible for production only when all of these are true:

- precision is at least 0.90 and recall is at least 0.80 on the labeled corpus;
- false positives cannot plausibly be mistaken for authoritative metadata or silently alter repository behavior;
- cold start is at most 100 ms on the reference run;
- warmed throughput is at least 1,000 short documents per second;
- direct installed analyzer/model size is at most 5 MB;
- the implementation is local, has a compatible license, has no known audit findings in the tested lockfile, and packages reproducibly for CLI and VS Code;
- every result has a source range, evidence, language, analyzer identity/version, `nlp-inferred` provenance, and `authoritative: false`.

Meeting numeric thresholds is necessary but not sufficient. Signals are promoted independently; an analyzer's aggregate score cannot conceal a dangerous signal.

## Candidate results

| Candidate | Version | Cold start | Warm throughput | Direct package/model bytes | Micro precision / recall / F1 |
| --- | --- | ---: | ---: | ---: | ---: |
| PlanFS token rules | prototype-1 | 0.007 ms | 1,692,966 docs/s | 0 | 0.984 / 0.923 / 0.952 |
| winkNLP + English lite web model | 2.4.0 + 1.8.1 | 78.155 ms | 64,095 docs/s | 4,480,646 | 0.903 / 0.862 / 0.882 |
| compromise | 14.16.0 | 268.210 ms | 2,904 docs/s | 2,733,133 | 0.899 / 0.954 / 0.925 |
| retext + English + POS | 9.0.0 + 5.0.0 + 5.0.0 | 89.016 ms | 103,666 docs/s | 180,912 | 0.898 / 0.815 / 0.855 |

The package-size column counts the named direct package directories, not the complete transitive install or a minified extension bundle. The lockfile installed 33 packages for the combined experiment. `npm audit` reported zero known vulnerabilities at evaluation time; this is a point-in-time result, not a continuing security guarantee.

All evaluated JavaScript candidates imported as ESM and loaded through `require()` in the Node probe. Their projects document browser use, but PlanFS still needs its own bundler/package smoke test before adopting any candidate. The baseline uses ordinary JavaScript/TypeScript and introduces no module-format boundary.

### winkNLP

winkNLP offers tokenization, sentences, lemmas, POS tags, entities, and token-pattern APIs with a separately loaded language model. The evaluated compact web model stays under the spike's 5 MB direct-size ceiling and initialization stayed under 100 ms. Its action precision/recall was 0.778/0.700, however, with six false positives and nine false negatives. The model cost did not improve the signal PlanFS most needed from POS tagging.

License and posture: the evaluated packages declare MIT licenses; the project is TypeScript-friendly and the selected compact model avoids a runtime download. It remains a reasonable future adapter candidate if a larger corpus demonstrates value.

### compromise

compromise has a compact, approachable rule and tag API and good browser ergonomics. It produced the highest action recall among the third-party candidates (0.933) but only 0.800 precision, including false actions for descriptive relationship sentences and examples. Its recorded cold start exceeded the 100 ms threshold. It also missed one compound criterion.

License and posture: the evaluated package declares MIT, loaded in both module probes, and has no separate model download. It is a useful future pattern-oriented adapter, but not justified as a built-in dependency by this corpus.

### retext

retext fits unified-style syntax-tree processing and its POS plugin was the smallest evaluated direct package set. It did not improve classification: action precision/recall was 0.760/0.633, and it missed one compound criterion. It would be architecturally attractive only if PlanFS adopted unified across its Markdown pipeline; TASK-111 instead deliberately keeps the parser implementation private.

License and posture: the evaluated packages declare MIT and are maintained in the unified ecosystem. They loaded in both module probes. Adding a second public or internal tree pipeline solely for POS analysis would duplicate work without measured benefit.

### spaCy reference

spaCy's rule-based Matcher and EntityRuler are capable external-runtime references for larger pipelines. They require a Python runtime and model/package lifecycle outside PlanFS's TypeScript CLI and VS Code extension. The spike therefore documents spaCy but does not package or benchmark it as a v1.4 candidate. A future service or adapter could evaluate it without changing the semantic document contract.

### No-NLP baseline

The baseline uses bounded token and phrase rules. It is not linguistic understanding: it has no statistical model, dependency parse, or semantic role labeling. That limitation is useful here because the evidence and failure modes stay explicit. It met all aggregate runtime thresholds and all tested lexical signals were exact on this small corpus. Its action heuristic still produced one false positive and five false negatives, showing why action detection is not promoted.

## Signal decisions

| Signal | Best relevant evidence | Decision | Rationale for TASK-118 |
| --- | --- | --- | --- |
| Modality (`must`, `should`, `may`) | Rule P/R 1.000/1.000 | Promote to prototype | Emit the exact modal token as medium-confidence lexical evidence; do not interpret obligation as metadata. |
| Negation (`not`, `never`, `no`, `without`) | Rule P/R 1.000/1.000 | Promote to prototype | Emit the exact token. Scope is not inferred, and the signal remains advisory. |
| Conditional clause introducer | Rule P/R 1.000/1.000 | Promote to prototype | Recognize a bounded list such as `if`, `when`, and `unless`; report the introducer, not a reconstructed condition graph. |
| Vague wording | Rule P/R 1.000/1.000 | Experimental | The corpus is too small and context can make words such as `stable` measurable. Prototype with low confidence and require a larger corpus before stable promotion. |
| Date or duration expression | Rule P/R 1.000/1.000 | Promote to prototype | Recognize explicit ISO dates, numeric durations/rates, and a small documented relative-date set; do not change due dates. |
| Possible relationship phrase + entity ID | Rule P/R 1.000/1.000 | Promote to prototype | Emit a suggestion only when both an exact PlanFS ID and a bounded relationship phrase occur. Never alter `dependsOn`, `epic`, `milestone`, or repository graphs. |
| Observable action | Baseline P/R 0.962/0.833; best third-party P/R 0.800/0.933 | Defer | The baseline depends on a hand-maintained verb list and misses passive/descriptive forms; POS candidates introduce misleading false positives. |
| Actor or object | Not independently labeled; candidate APIs do not provide reliable semantic roles | Reject for v1.4 | POS tags are not actor/action/object understanding. Do not imply semantic-role accuracy. |
| Compound criterion | Rule P/R 1.000/1.000 on only three positive cases | Experimental | The sample is too small; conjunctions between nouns and verbs are easily confused. Keep out of stable TASK-119 behavior unless TASK-118 expands evidence. |
| Free-form custom entity recognition | Exact PlanFS ID recognition is deterministic; arbitrary entities were not validated | Defer | Continue exact entity-ID extraction from TASK-111. Do not add statistical NER to v1.4. |
| Sentence boundaries, tokens, lemmas, POS | Candidate capability demonstrated, but no direct PlanFS outcome improved | Reject as user-facing signals | These may remain adapter internals; they are not useful serialized results by themselves. |

`Promote to prototype` means TASK-118 must still verify syntax exclusion, source positions, cache behavior, and Markdown-level fixtures before TASK-119 may expose the signal. It is not automatic production approval.

## Packaging, runtime, and maintenance implications

- CLI: every evaluated JavaScript candidate ran under the reference Node runtime. The PlanFS baseline has no loading failure mode and no model path to resolve.
- VS Code extension host: winkNLP would add approximately 4.48 MB of direct analyzer/model files before bundling; compromise approximately 2.73 MB; retext approximately 0.18 MB plus transitive dependencies. A baseline analyzer can ship inside core with no asset copy or runtime download.
- Browser: all candidates claim browser-capable use, but the benchmark is a Node process. Browser compatibility is informational until an actual web-extension bundle is tested.
- Module formats: both dynamic `import()` and CommonJS `require()` probes succeeded for the pinned candidate sets. The lockfile, not ambient latest versions, defines this result.
- Caching: candidate timings are already far above interactive needs for short tickets. TASK-118 must nevertheless test a bounded content-and-version cache because repository views repeatedly analyze unchanged bodies.
- Licensing: all pinned JavaScript packages declare MIT. Their license files must be preserved if a future adapter bundles them.
- Maintenance: adopting a library creates an ongoing upgrade and model-compatibility obligation. The spike records exact versions and avoids treating current package activity as a permanent guarantee.
- Security/privacy: the experiment makes no network analysis calls, and the selected approach has no remote service or runtime model download. Audit results are recorded for the exact experimental lockfile.

## TASK-118 handoff

TASK-118 should:

1. consume `SemanticDocument.criteria` and their exact Markdown/source ranges, not reparse the whole Markdown body;
2. remove fenced code, inline code, raw HTML, Markdown destinations, and syntax before applying prose rules;
3. prototype modality, negation, condition, explicit date/duration, and relationship-phrase signals;
4. keep vague wording and compound criteria experimental and expand their positive and adversarial fixtures;
5. defer action, actor, object, and unrestricted NER signals;
6. return only `nlp-inferred`, `authoritative: false` signals with English language, analyzer ID/version, exact source ranges, and matched lexical evidence;
7. compare possible relationships with frontmatter outside the analyzer and emit suggestions only;
8. prove disabled analysis leaves the semantic document and repository state unchanged;
9. measure cold start, warmed throughput, and bounded cache hits/misses; and
10. hand TASK-119 only signals that pass the Markdown-level evidence thresholds.

## Sources

- [winkNLP documentation](https://winkjs.org/wink-nlp/) and [language model guidance](https://winkjs.org/wink-nlp/language-models.html)
- [compromise repository and documentation](https://github.com/spencermountain/compromise)
- [retext package documentation](https://unifiedjs.com/explore/package/retext/) and [unified browser guidance](https://unifiedjs.com/learn/guide/)
- [spaCy rule-based matching documentation](https://spacy.io/usage/rule-based-matching/)
