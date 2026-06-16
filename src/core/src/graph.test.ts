import {
  buildTaskGraph,
  generateReports,
  getTransitiveDependencies
} from '../src/graph';
import { Epic, Milestone, Repository, Task } from '../src/types';

describe('Graph utilities', () => {
  const task1 = createTask('TASK-001', 'Foundation', 'done');
  const task2 = createTask('TASK-002', 'Backend', 'in-progress', ['TASK-001']);
  const task3 = createTask('TASK-003', 'Frontend', 'todo', ['TASK-002']);
  const task4 = createTask('TASK-004', 'Missing dep', 'todo', ['TASK-999']);

  it('builds task dependency graph with levels and missing dependencies', () => {
    const graph = buildTaskGraph([task1, task2, task3, task4]);

    expect(graph.edges).toEqual([
      { from: 'TASK-001', to: 'TASK-002' },
      { from: 'TASK-002', to: 'TASK-003' }
    ]);
    expect(graph.nodes.get('TASK-001')?.level).toBe(0);
    expect(graph.nodes.get('TASK-002')?.level).toBe(1);
    expect(graph.nodes.get('TASK-003')?.level).toBe(2);
    expect(graph.missingDependencies).toEqual([
      { taskId: 'TASK-004', dependencyId: 'TASK-999' }
    ]);
  });

  it('calculates critical path and transitive dependencies', () => {
    const graph = buildTaskGraph([task1, task2, task3, task4]);

    expect(graph.criticalPath).toEqual(['TASK-001', 'TASK-002', 'TASK-003']);
    expect(graph.nodes.get('TASK-002')?.critical).toBe(true);
    expect(getTransitiveDependencies('TASK-003', graph)).toEqual([
      'TASK-002',
      'TASK-001'
    ]);
  });

  it('generates repository reports', () => {
    const epic: Epic = {
      id: 'EPIC-test',
      type: 'epic',
      title: 'Test Epic',
      status: 'active',
      filePath: '',
      metadata: {},
      body: ''
    };
    const milestone: Milestone = {
      id: 'MILESTONE-test',
      type: 'milestone',
      title: 'Test Milestone',
      status: 'active',
      targetDate: '2026-08-01',
      filePath: '',
      metadata: {},
      body: ''
    };
    const tasks = [
      { ...task1, epic: epic.id, milestone: milestone.id, assignee: 'justin' },
      { ...task2, epic: epic.id, milestone: milestone.id, assignee: 'justin' },
      { ...task3, epic: epic.id, milestone: milestone.id, assignee: 'sam' },
      task4
    ];
    const repository: Repository = {
      root: '',
      tasks: new Map(tasks.map(task => [task.id, task])),
      epics: new Map([[epic.id, epic]]),
      milestones: new Map([[milestone.id, milestone]]),
      decisions: new Map()
    };

    const reports = generateReports(repository);

    expect(reports.epicCompletion[0]).toMatchObject({
      epicId: epic.id,
      total: 3,
      done: 1,
      percentDone: 33
    });
    expect(reports.workload.find(report => report.assignee === 'justin')?.total).toBe(2);
    expect(reports.timeline[0]).toMatchObject({
      milestoneId: milestone.id,
      total: 3,
      done: 1
    });
    expect(reports.blockedTasks.map(task => task.id)).toEqual(['TASK-004']);
  });
});

function createTask(
  id: string,
  title: string,
  status: Task['status'],
  dependsOn?: string[]
): Task {
  return {
    id,
    type: 'task',
    title,
    status,
    dependsOn,
    filePath: '',
    metadata: {},
    body: ''
  };
}
