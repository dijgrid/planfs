import {
  getBacklogReadiness,
  getTaskRefinementState,
  listBacklogTasks,
  reviewBacklog
} from './backlog';
import { Repository, Task } from './types';

describe('backlog helpers', () => {
  it('treats missing refinement metadata as ready', () => {
    expect(getTaskRefinementState(task('TASK-001', {}))).toBe('ready');
  });

  it('orders tasks within epic scope before priority and dates', () => {
    const repository = repo([
      task('TASK-003', { title: 'Later global', priority: 'critical', backlogOrder: 20 }),
      task('TASK-002', { title: 'Second epic', epic: 'EPIC-a', backlogOrder: 20 }),
      task('TASK-001', { title: 'First epic', epic: 'EPIC-a', backlogOrder: 10 }),
      task('TASK-004', { title: 'First global', priority: 'low', backlogOrder: 10 })
    ]);

    expect(listBacklogTasks(repository).map(item => item.id)).toEqual([
      'TASK-001',
      'TASK-002',
      'TASK-004',
      'TASK-003'
    ]);
  });

  it('filters backlog tasks by refinement state and query', () => {
    const repository = repo([
      task('TASK-001', { title: 'Rough idea', refinementState: 'captured' }),
      task('TASK-002', { title: 'Ready work', refinementState: 'ready' })
    ]);

    expect(listBacklogTasks(repository, {
      refinementState: 'captured',
      query: 'rough'
    }).map(item => item.id)).toEqual(['TASK-001']);
  });

  it('identifies incomplete and stale backlog review items', () => {
    const repository = repo([
      task('TASK-001', {
        title: 'Old captured item',
        refinementState: 'captured',
        updatedAt: '2026-01-01T00:00:00Z'
      }),
      task('TASK-002', {
        title: 'Complete ready item',
        refinementState: 'ready',
        priority: 'high',
        body: 'Ready body.',
        updatedAt: '2026-06-19T00:00:00Z'
      })
    ]);

    const reviewItems = reviewBacklog(repository, {
      now: new Date('2026-06-20T00:00:00Z')
    });

    expect(reviewItems).toHaveLength(1);
    expect(reviewItems[0]).toMatchObject({
      stale: true,
      incomplete: true,
      recommendations: expect.arrayContaining(['refine', 'prioritize'])
    });
  });

  it('can require epic and milestone context for ready checks', () => {
    const repository = repo([
      task('TASK-001', {
        body: 'Ready enough.',
        priority: 'medium'
      })
    ]);

    expect(getBacklogReadiness(
      repository.tasks.get('TASK-001')!,
      repository,
      { requireEpic: true, requireMilestone: true }
    )).toMatchObject({
      ready: false,
      missing: ['epic', 'milestone']
    });
  });
});

function repo(tasks: Task[]): Repository {
  return {
    root: '',
    tasks: new Map(tasks.map(item => [item.id, item])),
    epics: new Map(),
    milestones: new Map(),
    decisions: new Map()
  };
}

function task(id: string, fields: Partial<Task>): Task {
  return {
    id,
    type: 'task',
    title: fields.title ?? id,
    status: fields.status ?? 'todo',
    body: fields.body ?? '',
    filePath: '',
    metadata: {},
    ...fields
  };
}
