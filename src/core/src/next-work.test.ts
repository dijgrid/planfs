import {
  explainNextWork,
  getNextWorkCandidates,
  getTaskReadiness
} from '../src/next-work';
import { Epic, Milestone, Repository, Task } from '../src/types';

describe('Next work utilities', () => {
  const now = new Date('2026-06-20T12:00:00Z');

  it('classifies task readiness from status and dependencies', () => {
    const done = createTask('TASK-001', 'Done dependency', 'done');
    const open = createTask('TASK-002', 'Open dependency', 'todo');
    const ready = createTask('TASK-003', 'Ready', 'todo', ['TASK-001']);
    const blocked = createTask('TASK-004', 'Blocked', 'todo', ['TASK-002']);
    const missing = createTask('TASK-005', 'Missing', 'todo', ['TASK-999']);
    const inProgress = createTask('TASK-006', 'In progress', 'in-progress');
    const review = createTask('TASK-007', 'Review', 'review');
    const repository = createRepository([
      done,
      open,
      ready,
      blocked,
      missing,
      inProgress,
      review
    ]);

    expect(getTaskReadiness(ready, repository).status).toBe('ready');
    expect(getTaskReadiness(blocked, repository)).toMatchObject({
      status: 'blocked',
      blockingTaskIds: ['TASK-002']
    });
    expect(getTaskReadiness(missing, repository)).toMatchObject({
      status: 'missing-dependency',
      missingDependencyIds: ['TASK-999']
    });
    expect(getTaskReadiness(inProgress, repository).status).toBe('in-progress');
    expect(getTaskReadiness(review, repository).status).toBe('needs-review');
    expect(getTaskReadiness(done, repository).status).toBe('done');
  });

  it('treats archived dependencies as satisfied historical work', () => {
    const archived = {
      ...createTask('TASK-001', 'Archived dependency', 'done'),
      archive: {
        archivedAt: '2026-06-21T18:44:00Z',
        originalPath: '.planfs/tasks/TASK-001.md'
      }
    };
    const active = createTask('TASK-002', 'Active task', 'todo', ['TASK-001']);
    const repository = {
      ...createRepository([active]),
      archivedTasks: new Map([[archived.id, archived]])
    };

    expect(getTaskReadiness(active, repository)).toEqual({
      status: 'ready',
      blockingTaskIds: [],
      missingDependencyIds: []
    });
  });

  it('ranks actionable tasks by priority, due date, critical path, downstream work, and stable tie-breakers', () => {
    const foundation = createTask('TASK-001', 'Foundation', 'done');
    const criticalPath = {
      ...createTask('TASK-002', 'Critical path', 'todo', ['TASK-001']),
      priority: 'medium' as const,
      dueDate: '2026-07-15'
    };
    const downstream = createTask('TASK-003', 'Downstream child', 'todo', ['TASK-002']);
    const low = {
      ...createTask('TASK-004', 'Low priority', 'todo'),
      priority: 'low' as const,
      dueDate: '2026-06-22'
    };
    const high = {
      ...createTask('TASK-005', 'High priority', 'todo'),
      priority: 'high' as const,
      dueDate: '2026-06-30'
    };
    const critical = {
      ...createTask('TASK-006', 'Critical priority', 'todo'),
      priority: 'critical' as const,
      dueDate: '2026-07-30'
    };
    const repository = createRepository([
      foundation,
      criticalPath,
      downstream,
      low,
      high,
      critical
    ]);

    expect(getNextWorkCandidates(repository, { now }).map(candidate => candidate.task.id)).toEqual([
      'TASK-006',
      'TASK-005',
      'TASK-002',
      'TASK-004'
    ]);
  });

  it('uses epic priority after task priority and before due date', () => {
    const lowEpic: Epic = {
      id: 'EPIC-low',
      type: 'epic',
      title: 'Low Epic',
      status: 'active',
      priority: 'low',
      filePath: '',
      metadata: {},
      body: ''
    };
    const criticalEpic: Epic = {
      ...lowEpic,
      id: 'EPIC-critical',
      title: 'Critical Epic',
      priority: 'critical'
    };
    const lowEpicTask = {
      ...createTask('TASK-001', 'Low epic task', 'todo'),
      epic: lowEpic.id,
      dueDate: '2026-06-21'
    };
    const criticalEpicTask = {
      ...createTask('TASK-002', 'Critical epic task', 'todo'),
      epic: criticalEpic.id,
      dueDate: '2026-06-25'
    };
    const taskPriority = {
      ...createTask('TASK-003', 'Task priority wins', 'todo'),
      priority: 'high' as const,
      epic: lowEpic.id,
      dueDate: '2026-07-01'
    };
    const repository = createRepository(
      [lowEpicTask, criticalEpicTask, taskPriority],
      [lowEpic, criticalEpic]
    );

    expect(getNextWorkCandidates(repository, { now }).map(candidate => candidate.task.id)).toEqual([
      'TASK-003',
      'TASK-002',
      'TASK-001'
    ]);
  });

  it('can include blocked and missing-dependency tasks with explanations', () => {
    const dependency = createTask('TASK-001', 'Dependency', 'todo');
    const blocked = createTask('TASK-002', 'Blocked', 'todo', ['TASK-001']);
    const missing = createTask('TASK-003', 'Missing', 'todo', ['TASK-999']);
    const repository = createRepository([dependency, blocked, missing]);

    const candidates = getNextWorkCandidates(repository, {
      includeBlocked: true,
      now
    });

    expect(candidates.map(candidate => candidate.task.id)).toEqual([
      'TASK-001',
      'TASK-002',
      'TASK-003'
    ]);
    expect(candidates[1].reasons[0]).toBe('Blocked by TASK-001');
    expect(candidates[2].reasons[0]).toBe('Missing dependency TASK-999');
  });

  it('explains ranking inputs', () => {
    const epic: Epic = {
      id: 'EPIC-test',
      type: 'epic',
      title: 'Test Epic',
      status: 'active',
      priority: 'critical',
      targetDate: '2026-06-24',
      filePath: '',
      metadata: {},
      body: ''
    };
    const task = {
      ...createTask('TASK-001', 'Explained', 'todo'),
      priority: 'high' as const,
      dueDate: '2026-06-21',
      epic: epic.id
    };
    const dependent = createTask('TASK-002', 'Dependent', 'todo', ['TASK-001']);
    const repository = createRepository([task, dependent], [epic]);

    expect(explainNextWork(task, repository, { now })).toEqual([
      'Ready: dependencies complete',
      'High task priority',
      'Critical epic priority',
      'Due in 1 day',
      'Target in 4 days',
      'On critical path',
      'Unblocks 1 downstream task'
    ]);
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

function createRepository(
  tasks: Task[],
  epics: Epic[] = [],
  milestones: Milestone[] = []
): Repository {
  return {
    root: '',
    tasks: new Map(tasks.map(task => [task.id, task])),
    epics: new Map(epics.map(epic => [epic.id, epic])),
    milestones: new Map(milestones.map(milestone => [milestone.id, milestone])),
    decisions: new Map()
  };
}
