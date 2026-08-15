# Semantic Performance Budget

TASK-116 establishes regression budgets for the mixed v1.4 compatibility corpus:

- parse and automation-ready validate 1,000 mixed documents in under 5,000 ms;
- serve 100 unchanged, locally analyzed editor inspections from the bounded cache in under 1,000 ms;
- record cache hits/misses and invalidate when body, metadata, language, analyzer, profile, or validation options change.

These deliberately leave headroom for shared CI runners while detecting accidental quadratic work or loss of incremental caching. The automated test is `src/core/src/semantic-compatibility.test.ts`.

On 2026-08-15, the repository workspace measured 1,000 parse/validation operations in 84.12 ms and 100 cached inspections in 3.49 ms, with 100 hits, one initial miss, and no eviction. These numbers are evidence from one machine, not a product guarantee; the checked thresholds are the release contract.

`SemanticInspectionCache` is opt-in and bounded (256 entries in the editor). One-shot CLI commands do not retain bodies. Cached results are defensive copies. The local analyzer has its own bounded LRU cache, so changed inputs are recomputed while unchanged bodies avoid both structural and advisory work.
