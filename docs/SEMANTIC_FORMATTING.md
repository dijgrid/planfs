# Semantic Markdown Formatting

PlanFS 1.4 provides an explicit, conservative formatter for recognized semantic Markdown. Formatting is never part of repository loading, inspection, or validation, and it never interprets prose as authoritative metadata.

## Workflows

Validation, checking, previewing, and applying are distinct operations:

- `planfs validate --semantic automation-ready` reports content-profile diagnostics and never writes.
- `planfs format TASK-001 --check` reports whether deterministic formatting edits are available, never writes, and exits non-zero when changes are needed.
- `planfs format TASK-001` previews exact edits, the complete proposed content in JSON output, and a source fingerprint; it never writes.
- `planfs format TASK-001 --apply --expected-fingerprint sha256:...` applies only the exact file snapshot previously previewed.

For a bounded batch, provide explicit IDs or select all active entities:

```bash
planfs format TASK-001 TASK-002 --format json
planfs format TASK-001 TASK-002 --apply \
  --expected-fingerprint TASK-001=sha256:... \
  --expected-fingerprint TASK-002=sha256:...
planfs format --all --check
```

Apply requires a fingerprint for every changed file. If any selected source changes after preview, PlanFS refuses the batch before writing. All proposed results are validated before the first bounded write.

Archived artifacts are immutable planning history and are never formatter targets, including through `--all`. A future archive workflow may offer an explicit option to format an active task or epic immediately before archiving it; once moved into `.planfs/archive/`, the artifact is left untouched.

## Formatting contract

The formatter uses the public PlanFS semantic model and exact source ranges. It currently performs only these proven edits:

- replace a uniquely recognized canonical or alias heading with `## ` plus its documented canonical heading;
- normalize GFM acceptance/release task markers to `- [ ] ` or `- [x] `;
- convert an ordinary bullet criterion to an unchecked `- [ ] ` criterion.

The formatter does not reorder sections, merge duplicate sections, fill empty sections, rewrite prose, resolve references, or generally reflow Markdown. Duplicate recognized section keys are reported and skipped. Ordered-list criteria whose numbering semantics cannot be preserved are reported and skipped.

Unknown sections, preambles, nested content, code fences, inline code, links, images, raw HTML, comments, whitespace outside exact edits, line endings, and frontmatter remain byte-for-byte unchanged. Frontmatter is never derived from prose; any future frontmatter repair must use the existing PlanFS serializer and an explicit metadata workflow.

## Safety and idempotence

Fingerprints cover the complete source file, including YAML and Markdown. Apply recomputes the plan, compares every token, validates all proposed selected results, rechecks sources immediately before writing, and then writes only changed files.

Because replacements are canonical and offset-based, a second run produces no edits. JSON output includes stable edit kinds, source ranges, before/after text, issues, exact proposed content, and the preview fingerprints needed for automation.
