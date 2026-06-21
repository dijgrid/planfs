import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildPlanningSummary,
  parseTaskUpdatePatch,
  updateTaskPlanning
} from './ai';
import { ensurePlanfsStructure } from './files';
import {
  createTaskTemplate,
  loadRepository,
  saveEntity
} from './repository';
import { Epic, Milestone, Repository, Task } from './types';

describe('AI planning helpers', () => {
  const now = new Date('2026-06-21T12:00:00Z');

  it('builds compact planning summaries with counts, readiness, stale work, and file paths', () => {
    const done = createTask('TASK-001', 'Done dependency', 'done');
    const ready = {
      ...createTask('TASK-002', 'Ready task', 'todo', ['TASK-001']),
      priority: 'high' as const,
      assignee: 'justin',
      updatedAt: '2026-06-20T00:00:00Z'
    };
    const dependency = createTask('TASK-003', 'Open dependency', 'todo');
    const blocked = {
      ...createTask('TASK-004', 'Blocked task', 'todo', ['TASK-003']),
      updatedAt: '2025-01-01T00:00:00Z'
    };
    const repository = createRepository([done, ready, dependency, blocked], [
      {
        id: 'EPIC-ai',
        type: 'epic',
        title: 'AI',
        status: 'active',
        filePath: '.planfs/epics/EPIC-ai.md',
        metadata: {},
        body: ''
      }
    ], [
      {
        id: 'MILESTONE-ai',
        type: 'milestone',
        title: 'AI milestone',
        status: 'active',
        targetDate: '2026-09-01',
        filePath: '.planfs/milestones/MILESTONE-ai.md',
        metadata: {},
        body: ''
      }
    ]);

    const summary = buildPlanningSummary(repository, { now });

    expect(summary.counts).toMatchObject({
      tasks: 4,
      openTasks: 3,
      activeEpics: 1,
      activeMilestones: 1,
      blockedTasks: 1,
      readyTasks: 2,
      staleTasks: 2,
      recentlyCompletedTasks: 1
    });
    expect(summary.readyWork.map(task => task.id)).toEqual(['TASK-002', 'TASK-003']);
    expect(summary.blockedWork[0]).toMatchObject({
      id: 'TASK-004',
      blockingTaskIds: ['TASK-003']
    });
    expect(summary.stalePlanIndicators.map(item => item.id)).toEqual(['TASK-003', 'TASK-004']);
    expect(summary.openTasks[0]).toHaveProperty('filePath');
  });

  it('previews and applies validated task metadata updates', async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-ai-update-'));
    try {
      await ensurePlanfsStructure(rootPath);
      const task = createTaskTemplate('TASK-001', 'Update me');
      await saveEntity(rootPath, task);

      let repository = await loadRepository(rootPath);
      const dryRun = await updateTaskPlanning(rootPath, repository, {
        id: 'TASK-001',
        patch: parseTaskUpdatePatch({
          status: 'in-progress',
          priority: 'high',
          assignee: 'justin',
          tags: 'ai,update'
        }),
        dryRun: true,
        now
      });

      expect(dryRun.changedFields).toEqual(['status', 'priority', 'assignee', 'tags']);
      expect(dryRun.preview).toContain('status: in-progress');
      repository = await loadRepository(rootPath);
      expect(repository.tasks.get('TASK-001')?.status).toBe('todo');

      await updateTaskPlanning(rootPath, repository, {
        id: 'TASK-001',
        patch: parseTaskUpdatePatch({
          status: 'review',
          refinementState: 'ready'
        }),
        now
      });

      repository = await loadRepository(rootPath);
      expect(repository.tasks.get('TASK-001')?.status).toBe('review');
      expect(repository.tasks.get('TASK-001')?.refinementState).toBe('ready');
      expect(repository.tasks.get('TASK-001')?.updatedAt).toBe(now.toISOString());
    } finally {
      await fs.rm(rootPath, { recursive: true, force: true });
    }
  });

  it('rejects updates that would break repository validation', async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-ai-invalid-'));
    try {
      await ensurePlanfsStructure(rootPath);
      await saveEntity(rootPath, createTaskTemplate('TASK-001', 'Update me'));
      const repository = await loadRepository(rootPath);

      await expect(updateTaskPlanning(rootPath, repository, {
        id: 'TASK-001',
        patch: parseTaskUpdatePatch({ epic: 'EPIC-missing' }),
        now
      })).rejects.toThrow('Referenced epic not found');
    } finally {
      await fs.rm(rootPath, { recursive: true, force: true });
    }
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
    filePath: `.planfs/tasks/${id}.md`,
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
