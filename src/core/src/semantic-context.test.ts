import { buildSemanticPlanningContext } from './semantic-context';
import { Epic, Milestone, Repository, Task } from './types';

describe('semantic planning context', () => {
  it('projects traceable semantics, readiness, and resolved authoritative relationships', async () => {
    const dependency = task('TASK-001', 'Completed dependency', 'done');
    const subject = {
      ...task('TASK-002', 'Shared planning context', 'todo'),
      epic: 'EPIC-semantic',
      milestone: 'MILESTONE-v1',
      dependsOn: ['TASK-001', 'TASK-999'],
      priority: 'high' as const,
      body: [
        'Give agents and people the same planning intent.',
        '',
        '## Scope',
        '',
        '- Expose compact semantic content.',
        '',
        '## Acceptance Criteria',
        '',
        '- [x] Preserve completed criteria.',
        '- [ ] Resolve authoritative relationships.',
        '',
        '## Decisions',
        '',
        '- Keep Markdown human-owned.',
        '',
        '## Questions',
        '',
        '- Should text output include findings?',
        ''
      ].join('\n')
    };
    const epic: Epic = {
      id: 'EPIC-semantic', type: 'epic', title: 'Semantic planning', status: 'active',
      filePath: '.planfs/epics/EPIC-semantic.md', metadata: {}, body: ''
    };
    const milestone: Milestone = {
      id: 'MILESTONE-v1', type: 'milestone', title: 'v1', status: 'active',
      targetDate: '2026-12-15', filePath: '.planfs/milestones/MILESTONE-v1.md', metadata: {}, body: ''
    };
    const repository = repositoryWith([dependency, subject], [epic], [milestone]);

    const context = await buildSemanticPlanningContext(repository, 'TASK-002');

    expect(context).toMatchObject({
      contextVersion: '1.0.0',
      entity: { id: 'TASK-002', type: 'task', archived: false },
      intent: { text: 'Give agents and people the same planning intent.' },
      readiness: {
        status: 'missing-dependency',
        blockingTaskIds: [],
        missingDependencyIds: ['TASK-999']
      },
      relationships: {
        epic: { id: 'EPIC-semantic', entity: { title: 'Semantic planning' }, authoritative: true },
        milestone: { id: 'MILESTONE-v1', entity: { title: 'v1' }, authoritative: true }
      },
      advisory: { enabled: false, analysis: null }
    });
    expect(context.relationships.dependsOn).toEqual([
      expect.objectContaining({ id: 'TASK-001', entity: expect.objectContaining({ status: 'done' }) }),
      { id: 'TASK-999', entity: null, authoritative: true }
    ]);
    expect(context.sections.scope[0]).toMatchObject({
      heading: 'Scope',
      provenance: 'canonical',
      text: 'Expose compact semantic content.'
    });
    expect(context.acceptanceCriteria.map(criterion => criterion.checked)).toEqual([true, false]);
    expect(context.decisions[0].text).toBe('Keep Markdown human-owned.');
    expect(context.questions[0].text).toBe('Should text output include findings?');
  });

  it('keeps local analysis optional and preserves analyzer identity', async () => {
    const subject = {
      ...task('TASK-010', 'Advisory context', 'todo'),
      body: [
        'Inspect context.',
        '',
        '## Acceptance Criteria',
        '',
        '- [ ] This should complete after TASK-009.',
        ''
      ].join('\n')
    };

    const context = await buildSemanticPlanningContext(
      repositoryWith([subject]),
      subject.id,
      { analysis: true, language: 'en-US' }
    );

    expect(context.advisory).toMatchObject({
      enabled: true,
      analysis: {
        analyzer: { id: 'planfs-local-english-rules', version: '1.0.0' },
        language: 'en'
      }
    });
    expect(context.advisory.analysis?.signals).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'relationship-mention', provenance: 'nlp-inferred' })
    ]));
  });

  it('rejects an unknown context target explicitly', async () => {
    await expect(buildSemanticPlanningContext(repositoryWith([]), 'TASK-404'))
      .rejects.toThrow('Entity not found: TASK-404');
  });
});

function task(id: string, title: string, status: Task['status']): Task {
  return {
    id, type: 'task', title, status, filePath: `.planfs/tasks/${id}.md`, metadata: {}, body: ''
  };
}

function repositoryWith(
  tasks: Task[],
  epics: Epic[] = [],
  milestones: Milestone[] = []
): Repository {
  return {
    root: '',
    tasks: new Map(tasks.map(item => [item.id, item])),
    epics: new Map(epics.map(item => [item.id, item])),
    milestones: new Map(milestones.map(item => [item.id, item])),
    decisions: new Map()
  };
}
