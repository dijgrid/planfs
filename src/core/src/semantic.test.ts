import { parseSemanticDocument } from './semantic';
import { EntityType } from './types';

describe('semantic Markdown parsing', () => {
  it('parses canonical task content with exact source ranges and normalized views', () => {
    const source = [
      'Implement semantic parsing without rewriting this body.',
      '',
      '## Acceptance Criteria',
      '',
      '- [x] Preserve **raw** Markdown.',
      '  - [ ] Keep nested ranges.',
      '- Ordinary follow-up.',
      '',
      '### Edge Cases',
      '',
      'Keep lower headings nested.',
      '',
      '## Findings',
      '',
      '- The loader currently trims leading whitespace.',
      '',
      '## Decisions',
      '',
      'Use one structural parser.',
      '',
      '## References',
      '',
      '- [Related epic](../epics/EPIC-semantic-documents.md)',
      '- TASK-110'
    ].join('\n');

    const document = parseSemanticDocument('task', source, { filePath: 'TASK-111.md' });

    expect(document.source).toEqual({ filePath: 'TASK-111.md', rawMarkdown: source });
    expect(document.preamble.text).toBe('Implement semantic parsing without rewriting this body.');
    expect(document.sections.map(section => section.key)).toEqual([
      'acceptanceCriteria',
      'findings',
      'decisions',
      'references'
    ]);
    expect(document.criteria.map(criterion => criterion.checked)).toEqual([true, false, null]);
    expect(document.criteria.map(criterion => criterion.text)).toEqual([
      'Preserve raw Markdown.',
      'Keep nested ranges.',
      'Ordinary follow-up.'
    ]);
    expect(document.criteria[1]).toMatchObject({
      listDepth: 1,
      parentCriterionId: 'criterion:0:0',
      sectionIndex: 0,
      provenance: 'canonical'
    });
    expect(document.sections[0]?.subsections).toHaveLength(1);
    expect(document.sections[0]?.subsections[0]?.heading).toBe('Edge Cases');
    expect(document.findings[0]?.text).toBe('The loader currently trims leading whitespace.');
    expect(document.decisions[0]?.text).toBe('Use one structural parser.');
    expect(document.references.map(reference => reference.kind)).toEqual([
      'link',
      'bare-entity-id'
    ]);
    expect(document.mentions.map(mention => [mention.id, mention.form])).toEqual([
      ['EPIC-semantic-documents', 'link-target'],
      ['TASK-110', 'prose']
    ]);
    expect(document.mentions.every(mention => mention.authoritative === false)).toBe(true);
    expect(document.conformance).toEqual({
      baseline: 'conformant',
      automationReady: 'not-evaluated',
      lifecycle: 'not-evaluated'
    });

    expect(source.slice(
      document.preamble.range.start.offset,
      document.preamble.range.end.offset
    )).toBe(document.preamble.markdown);
    for (const section of document.sections) {
      expect(source.slice(section.range.start.offset, section.range.end.offset)).toBe(section.markdown);
    }
    for (const criterion of document.criteria) {
      expect(source.slice(criterion.range.start.offset, criterion.range.end.offset)).toBe(criterion.markdown);
    }
  });

  it('classifies aliases, preserves duplicates and custom sections, and reports ambiguity', () => {
    const source = [
      'Description.',
      '',
      '## Success Criteria',
      '',
      '- First shape',
      '',
      '## Experiment Log',
      '',
      '| Run | Result |',
      '| --- | --- |',
      '| A | pass |',
      '',
      '## Acceptance Criteria',
      '',
      '- [ ] Different shape'
    ].join('\n');

    const document = parseSemanticDocument('task', source);

    expect(document.sections.map(section => ({
      key: section.key,
      provenance: section.provenance,
      heading: section.heading
    }))).toEqual([
      { key: 'acceptanceCriteria', provenance: 'alias', heading: 'Success Criteria' },
      { key: null, provenance: 'rule-inferred', heading: 'Experiment Log' },
      { key: 'acceptanceCriteria', provenance: 'canonical', heading: 'Acceptance Criteria' }
    ]);
    expect(document.knownSections.acceptanceCriteria).toHaveLength(2);
    expect(document.criteria.map(criterion => criterion.checked)).toEqual([null, false]);
    expect(document.diagnostics.map(diagnostic => diagnostic.code)).toEqual(expect.arrayContaining([
      'content.section.alias',
      'content.section.duplicate',
      'content.section.ambiguous'
    ]));
  });

  it('keeps fenced code, indented code, raw HTML, inline code, and paired HTML opaque', () => {
    const source = [
      'Preamble `TASK-900`.',
      '',
      '```markdown',
      '## Acceptance Criteria',
      '- [x] TASK-901',
      '```',
      '',
      '    ## Findings',
      '    - TASK-902',
      '',
      '<section>',
      '## Questions',
      'TASK-903',
      '</section>',
      '',
      '## Acceptance Criteria',
      '',
      '- [ ] Real criterion TASK-111',
      '',
      '<span>TASK-904</span>'
    ].join('\n');

    const document = parseSemanticDocument('task', source);

    expect(document.sections).toHaveLength(1);
    expect(document.sections[0]?.key).toBe('acceptanceCriteria');
    expect(document.criteria).toHaveLength(1);
    expect(document.criteria[0]?.text).toBe('Real criterion TASK-111');
    expect(document.mentions.map(mention => mention.id)).toEqual(['TASK-111']);
  });

  it('handles empty recognized sections and unclosed fences without dropping raw content', () => {
    const source = [
      'Description.',
      '',
      '## Findings',
      '',
      '## Acceptance Criteria',
      '',
      '- [ ] Real criterion',
      '',
      '~~~markdown',
      '## Questions',
      '- TASK-999'
    ].join('\n');

    const document = parseSemanticDocument('task', source);

    expect(document.source.rawMarkdown).toBe(source);
    expect(document.sections.map(section => section.key)).toEqual(['findings', 'acceptanceCriteria']);
    expect(document.criteria).toHaveLength(1);
    expect(document.mentions).toEqual([]);
    expect(document.diagnostics.map(diagnostic => diagnostic.code)).toEqual(expect.arrayContaining([
      'content.section.empty',
      'content.markdown.unclosed-fence'
    ]));
    expect(document.conformance.baseline).toBe('conformant');
  });

  it('recognizes Setext level-two boundaries and preserves lower-level heading hierarchy', () => {
    const source = [
      'Preamble.',
      '',
      'Acceptance Criteria',
      '-------------------',
      '',
      '- [ ] Criterion',
      '',
      '### Detail',
      '',
      '#### Nested Detail',
      '',
      'Text'
    ].join('\n');

    const document = parseSemanticDocument('task', source);

    expect(document.sections).toHaveLength(1);
    expect(document.sections[0]?.key).toBe('acceptanceCriteria');
    expect(document.sections[0]?.subsections[0]).toMatchObject({
      heading: 'Detail',
      headingLevel: 3
    });
    expect(document.sections[0]?.subsections[0]?.children[0]).toMatchObject({
      heading: 'Nested Detail',
      headingLevel: 4
    });
  });

  it.each<[EntityType, string, string, string]>([
    ['task', 'Success Criteria', 'acceptanceCriteria', 'alias'],
    ['epic', 'Goals', 'outcomes', 'alias'],
    ['milestone', 'Release Criteria', 'releaseCriteria', 'canonical'],
    ['decision', 'Resolution', 'decision', 'alias']
  ])('uses the %s content profile for %s', (entityType, heading, key, provenance) => {
    const document = parseSemanticDocument(entityType, `Summary.\n\n## ${heading}\n\nContent.`);
    expect(document.sections[0]).toMatchObject({ key, provenance });
  });

  it('extracts inline, reference-style, autolink, and entity references with exact locations', () => {
    const source = [
      'Description.',
      '',
      '## References',
      '',
      '- [Inline](https://example.test/TASK-111)',
      '- [Defined][design]',
      '- [Missing][unknown]',
      '- <https://example.test/EPIC-semantic>',
      '',
      '[design]: docs/DECISION-001.md'
    ].join('\n');

    const document = parseSemanticDocument('task', source);

    expect(document.references.map(reference => reference.target)).toEqual([
      'https://example.test/TASK-111',
      'docs/DECISION-001.md',
      'https://example.test/EPIC-semantic'
    ]);
    expect(document.references.every(reference => reference.provenance === 'canonical')).toBe(true);
    expect(document.mentions.map(mention => [mention.id, mention.form])).toEqual([
      ['TASK-111', 'link-target'],
      ['EPIC-semantic', 'link-target'],
      ['DECISION-001', 'link-target']
    ]);
    expect(document.diagnostics.some(diagnostic => (
      diagnostic.code === 'content.reference.unresolved-definition'
    ))).toBe(true);
    for (const mention of document.mentions) {
      expect(source.slice(mention.range.start.offset, mention.range.end.offset)).toBe(mention.id);
    }
  });

  it('is deterministic and never mutates the source string', () => {
    const source = 'Description.\r\n\r\n## Acceptance Criteria\r\n\r\n- [X] Exact range\r\n';
    const original = source.slice();

    const first = parseSemanticDocument('task', source);
    const second = parseSemanticDocument('task', source);

    expect(first).toEqual(second);
    expect(source).toBe(original);
    expect(first.criteria[0]?.markdown).toBe('- [X] Exact range');
    expect(first.criteria[0]?.range.start).toMatchObject({ line: 5, column: 1 });
    expect(first.source.rawMarkdown).toBe(source);
  });
});
