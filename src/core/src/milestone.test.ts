import { getMilestoneRollup } from './milestone';
import { Milestone, Repository, Task } from './types';

function task(id: string, patch: Partial<Task> = {}): Task {
  return { id, type: 'task', title: id, status: 'todo', filePath: `${id}.md`, metadata: {}, body: '', ...patch };
}

function repository(tasks: Task[]): Repository {
  const milestone: Milestone = {
    id: 'MILESTONE-001', type: 'milestone', title: 'Launch', status: 'active', targetDate: '2026-08-15',
    filePath: 'milestone.md', metadata: {}, body: ''
  };
  return {
    root: '.', tasks: new Map(tasks.map(item => [item.id, item])), epics: new Map(),
    milestones: new Map([[milestone.id, milestone]]), decisions: new Map()
  };
}

describe('getMilestoneRollup', () => {
  it('summarizes completion, blocking, overdue, and target-date risk', () => {
    const repo = repository([
      task('TASK-001', { milestone: 'MILESTONE-001', status: 'done' }),
      task('TASK-002', { milestone: 'MILESTONE-001', dependsOn: ['TASK-003'], dueDate: '2026-08-20' }),
      task('TASK-003', { milestone: 'MILESTONE-001', dueDate: '2026-07-01' }),
      task('TASK-005', { milestone: 'MILESTONE-001', dueDate: '2026-08-15' }),
      task('TASK-006', { milestone: 'MILESTONE-001', dueDate: '2026-08-16' }),
      task('TASK-004')
    ]);
    const rollup = getMilestoneRollup(repo, 'MILESTONE-001', { now: new Date('2026-07-30') });
    expect(rollup).toMatchObject({ total: 5, open: 4, done: 1, blocked: 1, overdue: 1, atRisk: 2, completionPercentage: 20 });
    expect(rollup?.tasks.find(item => item.task.id === 'TASK-002')).toMatchObject({ blocked: true, atRisk: true });
    expect(rollup?.tasks.find(item => item.task.id === 'TASK-006')).toMatchObject({ blocked: false, atRisk: true });
  });

  it('represents an empty milestone without a misleading percentage', () => {
    expect(getMilestoneRollup(repository([]), 'MILESTONE-001')).toMatchObject({ total: 0, open: 0, done: 0, completionPercentage: undefined });
  });
});
