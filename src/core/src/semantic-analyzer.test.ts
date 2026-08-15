import {
  LocalRuleSemanticAnalyzer,
  LOCAL_RULE_ANALYZER_IDENTITY,
  runSemanticAnalysis
} from './semantic-analyzer';
import { SemanticAnalyzer } from './semantic-types';
import { parseSemanticDocument } from './semantic';

describe('local semantic analysis', () => {
  it('returns only promoted advisory signals with exact evidence ranges', async () => {
    const source = [
      '## Acceptance Criteria',
      '',
      '- [ ] The parser must not send prose over the network.',
      '- [ ] When the cache expires after 5 minutes, refresh it.',
      '- [ ] Complete this after [TASK-118](../tasks/TASK-118.md). See TASK-999 for context.'
    ].join('\n');
    const document = parseSemanticDocument('task', source, { filePath: 'TASK-119.md' });
    const before = JSON.stringify(document);
    const analyzer = new LocalRuleSemanticAnalyzer();

    const result = await analyzer.analyze({ document, language: 'en-US' });

    expect(result.analyzer).toEqual(LOCAL_RULE_ANALYZER_IDENTITY);
    expect(result.language).toBe('en');
    expect(new Set(result.signals.map(signal => signal.kind))).toEqual(new Set([
      'modality',
      'negation',
      'condition',
      'date-duration',
      'relationship-mention'
    ]));
    expect(result.signals.every(signal => (
      signal.provenance === 'nlp-inferred'
      && signal.authoritative === false
      && signal.analyzer.id === LOCAL_RULE_ANALYZER_IDENTITY.id
      && signal.confidence !== null
    ))).toBe(true);
    for (const signal of result.signals) {
      for (const evidence of signal.evidence) {
        expect(source.slice(evidence.range.start.offset, evidence.range.end.offset)).toBe(evidence.text);
      }
    }
    expect(result.signals.find(signal => signal.kind === 'relationship-mention')?.data).toMatchObject({
      targetId: 'TASK-118',
      relationshipPhrase: 'after'
    });
    expect(result.signals.filter(signal => signal.kind === 'relationship-mention')).toHaveLength(1);
    expect(JSON.stringify(document)).toBe(before);
    expect(document.analyzerResults).toEqual([]);
  });

  it('excludes Markdown syntax, code, HTML, URLs, and nested duplicates', async () => {
    const source = [
      '## Acceptance Criteria',
      '',
      '- [ ] Render `must not depend on TASK-999` literally.',
      '- [ ] See [the guide](https://example.test/should/not/TASK-998).',
      '- [ ] <span>must not depend on TASK-997</span> Preserve output.',
      '- [ ] Preserve this example:',
      '',
      '  ```text',
      '  must not depend on TASK-996',
      '  ```',
      '- [ ] Preserve parent.',
      '  - [ ] Must not send tokens.'
    ].join('\n');
    const document = parseSemanticDocument('task', source);
    const result = await new LocalRuleSemanticAnalyzer().analyze({ document, language: 'en' });

    expect(result.signals.filter(signal => signal.kind === 'relationship-mention')).toEqual([]);
    expect(result.signals.filter(signal => signal.kind === 'modality')).toHaveLength(1);
    expect(result.signals.filter(signal => signal.kind === 'negation')).toHaveLength(1);
    expect(result.signals.some(signal => signal.evidence.some(evidence => (
      /TASK-99[6-9]|should/.test(evidence.text)
    )))).toBe(false);
    expect(result.signals.find(signal => signal.kind === 'modality')?.data.criterionId).toBe('criterion:0:5');
  });

  it('uses a bounded defensive LRU cache and invalidates after content changes', async () => {
    const analyzer = new LocalRuleSemanticAnalyzer({ cacheSize: 1 });
    const first = parseSemanticDocument('task', '## Acceptance Criteria\n\n- [ ] Must preserve output.');
    const second = parseSemanticDocument('task', '## Acceptance Criteria\n\n- [ ] Should preserve output.');

    const initial = await analyzer.analyze({ document: first, language: 'en' });
    initial.signals[0]!.message = 'caller mutation';
    const cached = await analyzer.analyze({ document: first, language: 'en' });
    expect(cached.signals[0]?.message).not.toBe('caller mutation');
    expect(analyzer.cacheStats).toMatchObject({ size: 1, capacity: 1, hits: 1, misses: 1 });

    await analyzer.analyze({ document: second, language: 'en' });
    expect(analyzer.cacheStats).toMatchObject({ size: 1, hits: 1, misses: 2, evictions: 1 });

    await analyzer.analyze({ document: first, language: 'en' });
    expect(analyzer.cacheStats).toMatchObject({ misses: 3, evictions: 2 });
  });

  it('is explicitly optional and bounds unsupported-language and analyzer failures', async () => {
    const document = parseSemanticDocument('task', '## Acceptance Criteria\n\n- [ ] Must preserve output.');
    const before = JSON.stringify(document);

    await expect(runSemanticAnalysis(document)).resolves.toBeNull();

    const unsupported = await runSemanticAnalysis(document, { enabled: true, language: 'fr' });
    expect(unsupported).toMatchObject({
      signals: [],
      diagnostics: [{ code: 'analysis.language.unsupported', severity: 'info' }]
    });

    const failingAnalyzer: SemanticAnalyzer = {
      identity: { id: 'test-failure', version: '1.0.0' },
      supportedLanguages: ['en'],
      async analyze() {
        throw new Error('local model missing');
      }
    };
    const failure = await runSemanticAnalysis(document, {
      enabled: true,
      analyzer: failingAnalyzer,
      language: 'en'
    });
    expect(failure).toMatchObject({
      signals: [],
      diagnostics: [{
        code: 'analysis.analyzer.unavailable',
        severity: 'warning',
        provenance: 'nlp-inferred'
      }]
    });
    expect(failure?.diagnostics[0]).toMatchObject({
      message: 'Advisory analyzer test-failure could not run locally.',
      data: { errorName: 'Error' }
    });
    expect(JSON.stringify(document)).toBe(before);
  });

  it('does not infer authoritative relationships or lifecycle state', async () => {
    const source = [
      '## Acceptance Criteria',
      '',
      '- [x] This belongs under EPIC-new and blocks TASK-200.',
      '- [ ] Status should be done.'
    ].join('\n');
    const document = parseSemanticDocument('task', source);
    const metadata = {
      status: 'todo',
      dependsOn: ['TASK-100'],
      epic: 'EPIC-current'
    };
    const metadataBefore = JSON.stringify(metadata);

    const result = await new LocalRuleSemanticAnalyzer().analyze({ document, language: 'en' });

    expect(result.signals.map(signal => signal.kind)).not.toContain('status');
    expect(result.signals.map(signal => signal.kind)).not.toContain('completion');
    expect(result.signals.filter(signal => signal.kind === 'relationship-mention')).toHaveLength(2);
    expect(JSON.stringify(metadata)).toBe(metadataBefore);
    expect(document.criteria.map(criterion => criterion.checked)).toEqual([true, false]);
  });
});
