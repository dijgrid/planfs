import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildPlanningSummary
} from './ai';
import {
  parseTaskUpdatePatch,
  updateTaskPlanning
} from './task-update';
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

  it('applies every planning summary scope and deterministic completion ordering', () => {
    const first = {
      ...createTask('TASK-010', 'Scoped task', 'todo'),
      assignee: 'justin',
      epic: 'EPIC-release',
      milestone: 'MILESTONE-release',
      refinementState: 'captured' as const
    };
    const second = {
      ...createTask('TASK-011', 'Other task', 'review'),
      assignee: 'casey',
      epic: 'EPIC-other',
      milestone: 'MILESTONE-other',
      refinementState: 'ready' as const
    };
    const doneA = { ...createTask('TASK-020', 'Done A', 'done'), updatedAt: 'invalid' };
    const doneB = { ...createTask('TASK-021', 'Done B', 'done') };
    const repository = createRepository([first, second, doneA, doneB]);

    expect(buildPlanningSummary(repository, { assignee: 'justin' }).openTasks.map(task => task.id))
      .toEqual(['TASK-010']);
    expect(buildPlanningSummary(repository, { epic: 'EPIC-release' }).openTasks.map(task => task.id))
      .toEqual(['TASK-010']);
    expect(buildPlanningSummary(repository, { milestone: 'MILESTONE-release' }).openTasks.map(task => task.id))
      .toEqual(['TASK-010']);
    expect(buildPlanningSummary(repository, { status: ['todo'] }).openTasks.map(task => task.id))
      .toEqual(['TASK-010']);
    expect(buildPlanningSummary(repository, { refinementState: 'captured' }).openTasks.map(task => task.id))
      .toEqual(['TASK-010']);
    expect(buildPlanningSummary(repository, { recentLimit: 1 }).recentlyCompletedWork.map(task => task.id))
      .toEqual(['TASK-021']);
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

  it('rejects a stale update when updatedAt changed since preview', async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-ai-conflict-'));
    try {
      await ensurePlanfsStructure(rootPath);
      await saveEntity(rootPath, { ...createTaskTemplate('TASK-001', 'Update me'), updatedAt: '2026-06-20T00:00:00Z' });
      const repository = await loadRepository(rootPath);

      await expect(updateTaskPlanning(rootPath, repository, {
        id: 'TASK-001',
        patch: { status: 'review' },
        expectedUpdatedAt: '2026-06-19T00:00:00Z',
        now
      })).rejects.toThrow('TASK-001 changed since preview');

      expect((await loadRepository(rootPath)).tasks.get('TASK-001')?.status).toBe('todo');
    } finally {
      await fs.rm(rootPath, { recursive: true, force: true });
    }
  });

  it('updates titles and removes cleared optional metadata', async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-task-update-fields-'));
    try {
      await ensurePlanfsStructure(rootPath);
      await saveEntity(rootPath, {
        ...createTaskTemplate('TASK-001', 'Original title'),
        priority: 'high',
        tags: ['cleanup']
      });
      await saveEntity(rootPath, createTaskTemplate('TASK-002', 'Dependency target'));
      const repository = await loadRepository(rootPath);

      const result = await updateTaskPlanning(rootPath, repository, {
        id: 'TASK-001',
        patch: parseTaskUpdatePatch({
          title: 'Updated title',
          priority: '',
          dependsOn: ['TASK-002'],
          tags: []
        }),
        now
      });

      expect(result.changedFields).toEqual(['title', 'priority', 'dependsOn', 'tags']);
      const updated = (await loadRepository(rootPath)).tasks.get('TASK-001');
      expect(updated?.title).toBe('Updated title');
      expect(updated?.priority).toBeUndefined();
      expect(updated?.dependsOn).toEqual(['TASK-002']);
      expect(updated?.tags).toBeUndefined();
      const markdown = await fs.readFile(path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'), 'utf8');
      expect(markdown).not.toContain('priority:');
      expect(markdown).not.toContain('tags:');
    } finally {
      await fs.rm(rootPath, { recursive: true, force: true });
    }
  });

  it('supports task-scoped validation when unrelated repository errors already exist', async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-task-update-scope-'));
    try {
      await ensurePlanfsStructure(rootPath);
      await saveEntity(rootPath, createTaskTemplate('TASK-001', 'Update me'));
      await saveEntity(rootPath, {
        ...createTaskTemplate('TASK-002', 'Unrelated invalid task'),
        status: 'active' as never
      });
      const repository = await loadRepository(rootPath);

      await updateTaskPlanning(rootPath, repository, {
        id: 'TASK-001',
        patch: { assignee: 'PlanFS Test' },
        validationScope: 'task',
        now
      });

      expect((await loadRepository(rootPath)).tasks.get('TASK-001')?.assignee).toBe('PlanFS Test');
    } finally {
      await fs.rm(rootPath, { recursive: true, force: true });
    }
  });

  it('handles no-op, missing-task, unset-timestamp, and parser edge cases', async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-task-update-edges-'));
    try {
      await ensurePlanfsStructure(rootPath);
      await saveEntity(rootPath, {
        ...createTaskTemplate('TASK-001', 'No-op task'),
        updatedAt: undefined
      });
      let repository = await loadRepository(rootPath);

      await expect(updateTaskPlanning(rootPath, repository, {
        id: 'TASK-999', patch: {}
      })).rejects.toThrow('Task not found');
      await expect(updateTaskPlanning(rootPath, repository, {
        id: 'TASK-001', patch: { status: 'todo' }, dryRun: true
      })).resolves.toMatchObject({ changedFields: [], dryRun: true });
      await expect(updateTaskPlanning(rootPath, repository, {
        id: 'TASK-001', patch: { assignee: 'casey' }, expectedUpdatedAt: null, now
      })).resolves.toMatchObject({ changedFields: ['assignee'] });

      repository = await loadRepository(rootPath);
      expect(repository.tasks.get('TASK-001')?.assignee).toBe('casey');
      expect(parseTaskUpdatePatch({ assignee: undefined })).toEqual({});
      expect(parseTaskUpdatePatch({ tags: '' })).toEqual({ tags: undefined });
      expect(parseTaskUpdatePatch({ tags: [] })).toEqual({ tags: undefined });
      expect(() => parseTaskUpdatePatch({ title: ' ' })).toThrow('title is required');
      expect(() => parseTaskUpdatePatch({ status: 'active' })).toThrow('status must be one of');
      expect(() => parseTaskUpdatePatch({ priority: 'urgent' })).toThrow('priority must be one of');
      expect(() => parseTaskUpdatePatch({ refinementState: 'unknown' }))
        .toThrow('refinementState must be one of');
      expect(() => parseTaskUpdatePatch({ assignee: 42 })).toThrow('Expected a string');
      expect(() => parseTaskUpdatePatch({ tags: [42] })).toThrow('tags must be');
      expect(() => parseTaskUpdatePatch({ dependsOn: [42] })).toThrow('dependsOn must be');
      expect(() => parseTaskUpdatePatch({ unknown: 'value' })).toThrow('Unsupported task update field');
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
