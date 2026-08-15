import {
  validateSemanticDocument,
  validateSemanticEntity,
  validateSemanticRepository
} from './semantic-validator';
import { parseSemanticDocument } from './semantic';
import { Decision, Entity, Epic, Milestone, Repository, Task } from './types';

describe('semantic content validation', () => {
  it('keeps baseline validation permissive and separate from automation readiness', () => {
    const entity = task('TASK-001', 'Investigate the cache.\n\n## Experiment Log\n\nCustom content.');
    const document = parseSemanticDocument('task', entity.body, { filePath: entity.filePath });

    const result = validateSemanticDocument(entity, document, { tier: 'baseline' });

    expect(result.valid).toBe(true);
    expect(result.conformance).toEqual({
      baseline: 'conformant',
      automationReady: 'not-evaluated',
      lifecycle: 'not-evaluated'
    });
    expect(result.diagnostics).toEqual([]);
    expect(document.sections[0]?.key).toBeNull();
  });

  it('evaluates automation-ready requirements with stable located diagnostics', () => {
    const entity = task('TASK-002', [
      '## Acceptance Criteria',
      '',
      'This paragraph is not a criterion.'
    ].join('\n'));

    const result = validateSemanticDocument(
      entity,
      parseSemanticDocument('task', entity.body, { filePath: entity.filePath }),
      { tier: 'automation-ready' }
    );

    expect(result.conformance.automationReady).toBe('nonconformant');
    expect(result.diagnostics.map(diagnostic => diagnostic.code)).toEqual(expect.arrayContaining([
      'content.preamble.missing',
      'content.acceptance-criteria.unstructured',
      'content.criterion.missing'
    ]));
    for (const diagnostic of result.diagnostics) {
      expect(diagnostic).toMatchObject({
        entityId: 'TASK-002',
        filePath: '/repo/.planfs/tasks/TASK-002.md'
      });
      expect(diagnostic.range).not.toBeNull();
      expect(diagnostic.repair.summary.length).toBeGreaterThan(0);
    }
  });

  it('preserves duplicates and reports aliases, ambiguity, empty content, and wrong shapes', () => {
    const entity = task('TASK-003', [
      'Description.',
      '',
      '## Success Criteria',
      '',
      '- [ ] Preserve files.',
      '',
      '## Acceptance Criteria',
      '',
      '- [ ] Rewrite files.',
      '',
      '## References',
      '',
      'This should be a list.'
    ].join('\n'));
    const document = parseSemanticDocument('task', entity.body);

    const result = validateSemanticDocument(entity, document, { tier: 'automation-ready' });

    expect(document.knownSections.acceptanceCriteria).toHaveLength(2);
    expect(result.diagnostics.map(diagnostic => diagnostic.code)).toEqual(expect.arrayContaining([
      'content.section.alias',
      'content.section.duplicate',
      'content.section.ambiguous',
      'content.section.wrong-shape'
    ]));
    expect(result.diagnostics.find(diagnostic => diagnostic.code === 'content.section.wrong-shape')).toMatchObject({
      sectionKey: 'references',
      data: { actualShape: 'prose', expectedShape: 'list-or-references' }
    });
  });

  it('makes ordinary criteria policy configurable without losing extraction', () => {
    const entity = task('TASK-004', [
      'Description.',
      '',
      '## Acceptance Criteria',
      '',
      '- Ordinary criterion.'
    ].join('\n'));
    const document = parseSemanticDocument('task', entity.body);

    const ignored = validateSemanticDocument(entity, document, {
      tier: 'automation-ready',
      criterionCheckState: 'ignore'
    });
    const strict = validateSemanticDocument(entity, document, {
      tier: 'automation-ready',
      criterionCheckState: 'error'
    });

    expect(document.criteria).toHaveLength(1);
    expect(document.criteria[0]?.checked).toBeNull();
    expect(ignored.diagnostics.map(diagnostic => diagnostic.code)).not.toContain(
      'content.criterion.missing-check-state'
    );
    expect(strict.diagnostics.find(diagnostic => (
      diagnostic.code === 'content.criterion.missing-check-state'
    ))?.severity).toBe('error');
    expect(strict.valid).toBe(false);
  });

  it('keeps captured tasks permissive when automation-ready validation is selected', () => {
    const entity = task('TASK-005', '', { refinementState: 'captured' });
    const result = validateSemanticDocument(
      entity,
      parseSemanticDocument('task', entity.body),
      { tier: 'automation-ready' }
    );

    expect(result.conformance.automationReady).toBe('not-evaluated');
    expect(result.diagnostics.filter(diagnostic => diagnostic.conformance === 'automation-ready')).toEqual([]);
  });

  it('applies lifecycle policy without changing authoritative status or criteria', () => {
    const body = [
      'Description.',
      '',
      '## Acceptance Criteria',
      '',
      '- [ ] Finish the work.'
    ].join('\n');
    const review = task('TASK-006', body, { status: 'review' });
    const done = task('TASK-007', body, { status: 'done' });
    const doneDocument = parseSemanticDocument('task', done.body);
    const before = JSON.stringify({ metadata: done.metadata, status: done.status, criteria: doneDocument.criteria });

    const reviewResult = validateSemanticDocument(review, parseSemanticDocument('task', review.body), {
      tier: 'automation-ready', lifecycle: true
    });
    const doneResult = validateSemanticDocument(done, doneDocument, {
      tier: 'automation-ready', lifecycle: true
    });

    expect(reviewResult.diagnostics.find(diagnostic => diagnostic.code === 'content.lifecycle.incomplete-criteria')?.severity).toBe('info');
    expect(doneResult.diagnostics.find(diagnostic => diagnostic.code === 'content.lifecycle.incomplete-criteria')?.severity).toBe('warning');
    expect(doneResult.conformance.lifecycle).toBe('nonconformant');
    expect(JSON.stringify({ metadata: done.metadata, status: done.status, criteria: doneDocument.criteria })).toBe(before);
  });

  it('validates entity-specific lifecycle content and frontmatter/body conflicts', () => {
    const epic = epicEntity('EPIC-one', 'Summary.\n\n## Outcomes\n', { status: 'completed' });
    const milestone = milestoneEntity('MILESTONE-one', [
      'Summary.', '', '## Outcomes', '', '- Outcome.', '', '## Release Criteria', '', '- [ ] Release.'
    ].join('\n'), { status: 'completed' });
    const decision = decisionEntity('DECISION-one', [
      '## Context', '', 'Body context.', '', '## Decision', '', 'Choose A.', '', '## Consequences', '', 'Result.'
    ].join('\n'), { status: 'accepted', context: 'Different authoritative context.' });

    const epicResult = validateSemanticDocument(epic, parseSemanticDocument('epic', epic.body), {
      tier: 'automation-ready', lifecycle: true
    });
    const milestoneResult = validateSemanticDocument(milestone, parseSemanticDocument('milestone', milestone.body), {
      tier: 'automation-ready', lifecycle: true
    });
    const decisionResult = validateSemanticDocument(decision, parseSemanticDocument('decision', decision.body), {
      tier: 'automation-ready', lifecycle: true
    });

    expect(epicResult.diagnostics.map(diagnostic => diagnostic.code)).toContain('content.lifecycle.required-content-missing');
    expect(milestoneResult.diagnostics.map(diagnostic => diagnostic.code)).toContain('content.lifecycle.incomplete-criteria');
    expect(decisionResult.diagnostics.map(diagnostic => diagnostic.code)).toContain('content.frontmatter-body.conflict');
    expect(decision.context).toBe('Different authoritative context.');
  });

  it('keeps optional analyzer results distinguishable and disabled by default', async () => {
    const entity = task('TASK-008', [
      'Description.', '', '## Acceptance Criteria', '', '- [ ] Complete this after TASK-119.'
    ].join('\n'));

    const disabled = await validateSemanticEntity(entity, { tier: 'automation-ready' });
    const enabled = await validateSemanticEntity(entity, {
      tier: 'automation-ready', analysis: true, language: 'en'
    });
    const unsupported = await validateSemanticEntity(entity, {
      tier: 'automation-ready', analysis: true, language: 'fr'
    });

    expect(disabled.analysis).toBeNull();
    expect(enabled.analysis?.signals.find(signal => signal.kind === 'relationship-mention')).toMatchObject({
      provenance: 'nlp-inferred',
      authoritative: false,
      language: 'en'
    });
    expect(unsupported.diagnostics.find(diagnostic => diagnostic.code === 'analysis.language.unsupported')).toMatchObject({
      conformance: 'analysis',
      provenance: 'nlp-inferred',
      entityId: 'TASK-008'
    });
  });

  it('reports open children from authoritative frontmatter for completed epics', async () => {
    const epic = epicEntity('EPIC-parent', 'Summary.\n\n## Outcomes\n\n- Delivered.', { status: 'completed' });
    const child = task('TASK-009', 'Captured child.', { epic: epic.id, status: 'todo' });
    const repository: Repository = {
      root: '/repo',
      tasks: new Map([[child.id, child]]),
      epics: new Map([[epic.id, epic]]),
      milestones: new Map(),
      decisions: new Map()
    };

    const result = await validateSemanticRepository(repository, {
      tier: 'automation-ready', lifecycle: true
    });

    expect(result.diagnostics.find(diagnostic => diagnostic.code === 'content.lifecycle.open-child-work')).toMatchObject({
      entityId: 'EPIC-parent',
      data: { openChildTaskIds: 'TASK-009' }
    });
    expect(epic.status).toBe('completed');
    expect(child.epic).toBe('EPIC-parent');
  });
});

function task(id: string, body: string, overrides: Partial<Task> = {}): Task {
  return entity({
    id,
    type: 'task',
    filePath: `/repo/.planfs/tasks/${id}.md`,
    metadata: {},
    body,
    title: id,
    status: 'todo',
    ...overrides
  }) as Task;
}

function epicEntity(id: string, body: string, overrides: Partial<Epic> = {}): Epic {
  return entity({
    id,
    type: 'epic',
    filePath: `/repo/.planfs/epics/${id}.md`,
    metadata: {},
    body,
    title: id,
    status: 'active',
    ...overrides
  }) as Epic;
}

function milestoneEntity(id: string, body: string, overrides: Partial<Milestone> = {}): Milestone {
  return entity({
    id,
    type: 'milestone',
    filePath: `/repo/.planfs/milestones/${id}.md`,
    metadata: {},
    body,
    title: id,
    status: 'active',
    targetDate: '2026-12-15',
    ...overrides
  }) as Milestone;
}

function decisionEntity(id: string, body: string, overrides: Partial<Decision> = {}): Decision {
  return entity({
    id,
    type: 'decision',
    filePath: `/repo/.planfs/decisions/${id}.md`,
    metadata: {},
    body,
    title: id,
    status: 'proposed',
    ...overrides
  }) as Decision;
}

function entity<T extends Entity>(value: T): T {
  value.metadata = {
    id: value.id,
    title: value.title,
    status: value.status,
    ...(value.type === 'task' && value.refinementState ? { refinementState: value.refinementState } : {})
  };
  return value;
}
