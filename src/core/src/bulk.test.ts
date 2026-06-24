import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  bulkUpdateTasks,
  createMilestoneTemplate,
  createTaskTemplate,
  ensurePlanfsStructure,
  loadRepository,
  saveEntity
} from '.';
import * as repositoryApi from './repository';

describe('bulk task updates', () => {
  let rootPath: string;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-bulk-'));
    await ensurePlanfsStructure(rootPath);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('previews bulk updates without writing task files', async () => {
    await saveEntity(rootPath, createTaskTemplate('TASK-001', 'First task'));
    await saveEntity(rootPath, createTaskTemplate('TASK-002', 'Second task'));

    const repository = await loadRepository(rootPath);
    const result = await bulkUpdateTasks(rootPath, repository, {
      taskIds: ['TASK-001', 'TASK-002'],
      patch: {
        status: 'review',
        priority: 'high',
        assignee: 'justin',
        estimate: '2d'
      },
      dryRun: true,
      now: new Date('2026-06-24T00:00:00Z')
    });

    expect(result.dryRun).toBe(true);
    expect(result.changedFields).toEqual(['status', 'priority', 'assignee', 'estimate']);
    expect(result.changedTasks).toHaveLength(2);
    expect(result.changedTasks[0].preview).toContain('status: review');
    expect(result.changedTasks[0].preview).toContain('estimate: 2d');

    const unchanged = await loadRepository(rootPath);
    expect(unchanged.tasks.get('TASK-001')?.status).toBe('todo');
    expect(unchanged.tasks.get('TASK-001')?.estimate).toBeUndefined();
  });

  it('applies successful bulk updates as one validated operation', async () => {
    await saveEntity(rootPath, createMilestoneTemplate('MILESTONE-alpha', 'Alpha', '2026-07-01'));
    await saveEntity(rootPath, createTaskTemplate('TASK-001', 'First task'));
    await saveEntity(rootPath, createTaskTemplate('TASK-002', 'Second task'));

    const repository = await loadRepository(rootPath);
    const result = await bulkUpdateTasks(rootPath, repository, {
      taskIds: ['TASK-001', 'TASK-002'],
      patch: {
        milestone: 'MILESTONE-alpha',
        estimate: '3d'
      },
      now: new Date('2026-06-24T00:00:00Z')
    });

    expect(result.dryRun).toBe(false);
    expect(result.changedTasks.map(change => change.id)).toEqual(['TASK-001', 'TASK-002']);

    const updated = await loadRepository(rootPath);
    expect(updated.tasks.get('TASK-001')?.milestone).toBe('MILESTONE-alpha');
    expect(updated.tasks.get('TASK-001')?.estimate).toBe('3d');
    expect(updated.tasks.get('TASK-002')?.milestone).toBe('MILESTONE-alpha');
    expect(updated.tasks.get('TASK-002')?.estimate).toBe('3d');
  });

  it('blocks validation failures before writing any task files', async () => {
    await saveEntity(rootPath, createTaskTemplate('TASK-001', 'Invalid target'));

    const before = await fs.readFile(taskPath('TASK-001'), 'utf-8');
    const repository = await loadRepository(rootPath);

    await expect(bulkUpdateTasks(rootPath, repository, {
      taskIds: ['TASK-001'],
      patch: {
        milestone: 'MILESTONE-missing'
      }
    })).rejects.toThrow('Referenced milestone not found');

    await expect(fs.readFile(taskPath('TASK-001'), 'utf-8')).resolves.toBe(before);
  });

  it('detects stale task conflicts before writing', async () => {
    await saveEntity(rootPath, {
      ...createTaskTemplate('TASK-001', 'Conflicting task'),
      updatedAt: '2026-06-20T00:00:00.000Z'
    });

    const repository = await loadRepository(rootPath);

    await expect(bulkUpdateTasks(rootPath, repository, {
      taskIds: ['TASK-001'],
      patch: {
        status: 'review'
      },
      expectedUpdatedAt: {
        'TASK-001': '2026-06-19T00:00:00.000Z'
      }
    })).rejects.toThrow('Task changed since preview: TASK-001');
  });

  it('restores previously written task files when a later write fails', async () => {
    await saveEntity(rootPath, createTaskTemplate('TASK-001', 'First task'));
    await saveEntity(rootPath, createTaskTemplate('TASK-002', 'Second task'));
    const firstBefore = await fs.readFile(taskPath('TASK-001'), 'utf-8');
    const secondBefore = await fs.readFile(taskPath('TASK-002'), 'utf-8');
    const originalSaveEntity = repositoryApi.saveEntity;
    let writes = 0;

    jest.spyOn(repositoryApi, 'saveEntity').mockImplementation(async (root, entity) => {
      writes += 1;
      if (writes === 2) {
        throw new Error('simulated write failure');
      }
      await originalSaveEntity(root, entity);
    });

    const repository = await loadRepository(rootPath);
    await expect(bulkUpdateTasks(rootPath, repository, {
      taskIds: ['TASK-001', 'TASK-002'],
      patch: {
        status: 'review'
      }
    })).rejects.toThrow('simulated write failure');

    await expect(fs.readFile(taskPath('TASK-001'), 'utf-8')).resolves.toBe(firstBefore);
    await expect(fs.readFile(taskPath('TASK-002'), 'utf-8')).resolves.toBe(secondBefore);
  });

  function taskPath(taskId: string): string {
    return path.join(rootPath, '.planfs', 'tasks', `${taskId}.md`);
  }
});
