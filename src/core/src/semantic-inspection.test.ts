import {
  inspectSemanticEntity,
  selectSemanticInspectionView
} from './semantic-inspection';
import { Task } from './types';

describe('semantic entity inspection', () => {
  it('separates authoritative metadata and relationships from loss-aware semantic content', async () => {
    const entity = task([
      'Implement inspection without changing the ticket.',
      '',
      '## Acceptance Criteria',
      '',
      '- [x] Preserve checked criteria.',
      '- [ ] Preserve unchecked criteria.',
      '- Preserve ordinary criteria.',
      '',
      '## Experiment Notes',
      '',
      'Custom content mentions TASK-999.'
    ].join('\n'), {
      milestone: 'MILESTONE-v1-4',
      epic: 'EPIC-semantic',
      dependsOn: ['TASK-112']
    });
    const before = JSON.stringify(entity);

    const inspection = await inspectSemanticEntity(entity);

    expect(inspection.inspectionVersion).toBe('1.0.0');
    expect(inspection.entity).toEqual({
      id: 'TASK-113',
      type: 'task',
      title: 'Inspect semantic entity',
      status: 'in-progress',
      filePath: '/repo/.planfs/tasks/TASK-113.md'
    });
    expect(inspection.authoritative.relationships).toEqual({
      dependsOn: ['TASK-112'],
      epic: 'EPIC-semantic',
      milestone: 'MILESTONE-v1-4',
      supersedes: null,
      supersededBy: null
    });
    expect(Object.keys(inspection.authoritative.metadata)).toEqual([
      'dependsOn', 'epic', 'id', 'milestone', 'status', 'title'
    ]);
    expect(inspection.semantic.criteria.map(criterion => criterion.checked)).toEqual([
      true, false, null
    ]);
    expect(inspection.semantic.sections[1]).toMatchObject({
      heading: 'Experiment Notes',
      key: null,
      provenance: 'rule-inferred'
    });
    expect(inspection.advisory.mentions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'TASK-999', authoritative: false })
    ]));
    expect(inspection.analysis).toBeNull();
    expect(JSON.stringify(entity)).toBe(before);
  });

  it('retains raw analysis while producing deduplicated actionable conclusions', async () => {
    const entity = task([
      'Inspect analysis.',
      '',
      '## Acceptance Criteria',
      '',
      '- [ ] This should work after TASK-112.',
      '- [ ] This may work when TASK-999 is complete.',
      '- [ ] Complete after TASK-999.',
      '- [ ] Must retain explicit wording.'
    ].join('\n'), { dependsOn: ['TASK-112'] });

    const inspection = await inspectSemanticEntity(entity, {
      analysis: true,
      language: 'en-US'
    });

    expect(inspection.analysis).toMatchObject({
      analyzer: { id: 'planfs-local-english-rules', version: '1.0.0' },
      language: 'en'
    });
    expect(inspection.analysis?.signals.length).toBeGreaterThan(inspection.advisory.conclusions.length);
    expect(inspection.advisory.conclusions.filter(conclusion => (
      conclusion.code === 'analysis.relationship.metadata-missing'
    ))).toEqual([
      expect.objectContaining({ data: { targetId: 'TASK-999' }, authoritative: false })
    ]);
    expect(inspection.advisory.conclusions.some(conclusion => (
      conclusion.data.targetId === 'TASK-112'
    ))).toBe(false);
    expect(inspection.advisory.conclusions.filter(conclusion => (
      conclusion.code === 'analysis.criterion.wording-ambiguous'
    ))).toHaveLength(2);
  });

  it('returns partial content and diagnostics for loosely conformant Markdown', async () => {
    const entity = task([
      '## Success Criteria',
      '',
      '- Ordinary criterion.',
      '',
      '## Success Criteria',
      '',
      'Paragraph instead of a list.'
    ].join('\n'));

    const inspection = await inspectSemanticEntity(entity, {
      criterionCheckState: 'warning'
    });

    expect(inspection.semantic.criteria).toEqual([
      expect.objectContaining({ checked: null, text: 'Ordinary criterion.' })
    ]);
    expect(inspection.semantic.knownSections.acceptanceCriteria).toHaveLength(2);
    expect(inspection.diagnostics.map(diagnostic => diagnostic.code)).toEqual(expect.arrayContaining([
      'content.preamble.missing',
      'content.section.alias',
      'content.section.duplicate',
      'content.section.ambiguous',
      'content.criterion.missing-check-state'
    ]));
  });

  it('selects deterministic focused views with a stable envelope', async () => {
    const inspection = await inspectSemanticEntity(task([
      'Summary.',
      '',
      '## Acceptance Criteria',
      '',
      '- [ ] Inspect output.',
      '',
      '## Findings',
      '',
      '- One finding.'
    ].join('\n')));

    const criteria = selectSemanticInspectionView(inspection, 'acceptance-criteria');
    const relationships = selectSemanticInspectionView(inspection, 'relationships');
    const raw = selectSemanticInspectionView(inspection, 'raw');

    expect(Object.keys(criteria)).toEqual([
      'inspectionVersion', 'view', 'entity', 'data', 'diagnostics'
    ]);
    expect(criteria.data).toEqual({ criteria: inspection.semantic.criteria });
    expect(relationships.data).toEqual({
      authoritativeRelationships: inspection.authoritative.relationships,
      advisoryMentions: inspection.advisory.mentions,
      relationshipSignals: []
    });
    expect(raw.data).toEqual({ rawMarkdown: inspection.semantic.source.rawMarkdown });
    expect(JSON.stringify(selectSemanticInspectionView(inspection, 'sections'))).toBe(
      JSON.stringify(selectSemanticInspectionView(inspection, 'sections'))
    );
  });
});

function task(body: string, overrides: Partial<Task> = {}): Task {
  const metadata = {
    title: 'Inspect semantic entity',
    id: 'TASK-113',
    status: 'in-progress',
    ...(overrides.dependsOn ? { dependsOn: overrides.dependsOn } : {}),
    ...(overrides.epic ? { epic: overrides.epic } : {}),
    ...(overrides.milestone ? { milestone: overrides.milestone } : {})
  };
  return {
    id: 'TASK-113',
    type: 'task',
    title: 'Inspect semantic entity',
    status: 'in-progress',
    filePath: '/repo/.planfs/tasks/TASK-113.md',
    metadata,
    body,
    ...overrides
  };
}
