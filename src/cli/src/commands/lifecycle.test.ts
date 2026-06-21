import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { aiCommand } from './ai';
import { createCommand } from './create';
import { initCommand } from './init';
import { listCommand } from './list';
import { nextCommand } from './next';
import { validateCommand } from './validate';
import {
  loadRepository,
  saveEntity,
  Task,
  validateRepositoryState
} from 'planfs-core';

describe('CLI project lifecycle integration', () => {
  let rootPath: string;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-lifecycle-'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('runs a project from initialization through completion with CLI workflows', async () => {
    await expect(initCommand(rootPath, { format: 'json' })).resolves.toBe(0);
    await expectDirectory('.planfs/tasks');
    await expectDirectory('.planfs/epics');
    await expectDirectory('.planfs/milestones');
    await expectDirectory('.planfs/decisions');
    await expect(validateCommand(rootPath, { format: 'json' })).resolves.toBe(0);

    await expect(createCommand(rootPath, 'epic', {
      title: 'Product Launch',
      owner: 'justin',
      description: 'Coordinate the launch lifecycle.'
    })).resolves.toBe(0);
    await expect(createCommand(rootPath, 'milestone', {
      title: 'v1 Launch',
      targetDate: '2026-09-01',
      owner: 'justin'
    })).resolves.toBe(0);
    await expect(createCommand(rootPath, 'task', {
      title: 'Define launch plan',
      priority: 'critical',
      assignee: 'justin'
    })).resolves.toBe(0);
    await expect(createCommand(rootPath, 'task', {
      title: 'Build launch workflow',
      priority: 'high',
      assignee: 'justin'
    })).resolves.toBe(0);
    await expect(createCommand(rootPath, 'task', {
      title: 'Review launch workflow',
      priority: 'medium',
      assignee: 'casey'
    })).resolves.toBe(0);
    await expect(createCommand(rootPath, 'task', {
      title: 'Publish launch notes',
      priority: 'medium',
      assignee: 'justin'
    })).resolves.toBe(0);

    await enrichLifecycleTasks();
    await expect(validateCommand(rootPath, { format: 'json' })).resolves.toBe(0);

    await expect(nextCommand(rootPath, { format: 'json' })).resolves.toBe(0);
    expect(lastJson().map((candidate: { id: string }) => candidate.id)).toEqual([
      'TASK-001'
    ]);

    await expect(aiCommand(rootPath, 'summary', { format: 'json' })).resolves.toBe(0);
    expect(lastJson()).toMatchObject({
      counts: {
        tasks: 4,
        openTasks: 4,
        readyTasks: 1,
        blockedTasks: 3
      }
    });

    await expect(aiCommand(rootPath, 'update-task', {
      id: 'TASK-002',
      epic: 'EPIC-missing',
      format: 'json'
    })).resolves.toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Error:',
      expect.stringContaining('Referenced epic not found')
    );
    let repository = await loadRepository(rootPath);
    expect(repository.tasks.get('TASK-002')?.epic).toBe('EPIC-product-launch');
    expect(validateRepositoryState(repository).valid).toBe(true);
    errorSpy.mockClear();

    await transitionTask('TASK-001', 'in-progress');
    await expect(nextCommand(rootPath, { includeBlocked: true, format: 'json' })).resolves.toBe(0);
    expect(lastJson().map((candidate: { id: string; readiness: string }) => [
      candidate.id,
      candidate.readiness
    ])).toEqual([
      ['TASK-001', 'in-progress'],
      ['TASK-002', 'blocked'],
      ['TASK-003', 'blocked'],
      ['TASK-004', 'blocked']
    ]);
    await assertRepositoryValid();

    await transitionTask('TASK-001', 'review');
    await expect(nextCommand(rootPath, { format: 'json' })).resolves.toBe(0);
    expect(lastJson()).toMatchObject([
      {
        id: 'TASK-001',
        readiness: 'needs-review'
      }
    ]);
    await assertRepositoryValid();

    await transitionTask('TASK-001', 'done');
    await expect(nextCommand(rootPath, { format: 'json' })).resolves.toBe(0);
    expect(lastJson().map((candidate: { id: string }) => candidate.id)).toEqual([
      'TASK-002'
    ]);

    await transitionTask('TASK-002', 'in-progress');
    await transitionTask('TASK-002', 'review');
    await transitionTask('TASK-002', 'done');
    await expect(nextCommand(rootPath, { format: 'json' })).resolves.toBe(0);
    expect(lastJson().map((candidate: { id: string }) => candidate.id)).toEqual([
      'TASK-003'
    ]);

    await transitionTask('TASK-003', 'in-progress');
    await transitionTask('TASK-003', 'review');
    await transitionTask('TASK-003', 'done');
    await transitionTask('TASK-004', 'in-progress');
    await transitionTask('TASK-004', 'review');
    await transitionTask('TASK-004', 'done');

    await expect(nextCommand(rootPath, { format: 'json' })).resolves.toBe(0);
    expect(lastJson()).toEqual([]);
    await expect(listCommand(rootPath, {
      type: 'tasks',
      status: 'done',
      format: 'json'
    })).resolves.toBe(0);
    expect(lastJson()).toHaveLength(4);
    await expect(aiCommand(rootPath, 'summary', { format: 'json' })).resolves.toBe(0);
    expect(lastJson()).toMatchObject({
      counts: {
        tasks: 4,
        openTasks: 0,
        readyTasks: 0,
        blockedTasks: 0,
        recentlyCompletedTasks: 4
      }
    });
    await expect(validateCommand(rootPath, { format: 'json' })).resolves.toBe(0);

    repository = await loadRepository(rootPath);
    expect(Array.from(repository.tasks.values()).every(task => task.status === 'done')).toBe(true);
    expect(repository.epics.get('EPIC-product-launch')?.status).toBe('active');
    expect(repository.milestones.get('MILESTONE-v1-launch')?.status).toBe('active');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  async function enrichLifecycleTasks(): Promise<void> {
    const repository = await loadRepository(rootPath);
    const updates: Record<string, Partial<Task>> = {
      'TASK-001': {
        epic: 'EPIC-product-launch',
        milestone: 'MILESTONE-v1-launch',
        dueDate: '2026-08-01',
        tags: ['lifecycle', 'planning'],
        body: 'Define the work that must happen before implementation starts.'
      },
      'TASK-002': {
        epic: 'EPIC-product-launch',
        milestone: 'MILESTONE-v1-launch',
        dueDate: '2026-08-10',
        dependsOn: ['TASK-001'],
        tags: ['lifecycle', 'implementation'],
        body: 'Build the CLI-visible workflow after the plan is defined.'
      },
      'TASK-003': {
        epic: 'EPIC-product-launch',
        milestone: 'MILESTONE-v1-launch',
        dueDate: '2026-08-15',
        dependsOn: ['TASK-002'],
        tags: ['lifecycle', 'review'],
        body: 'Review the completed workflow before publication.'
      },
      'TASK-004': {
        epic: 'EPIC-product-launch',
        milestone: 'MILESTONE-v1-launch',
        dueDate: '2026-08-20',
        dependsOn: ['TASK-003'],
        tags: ['lifecycle', 'docs'],
        body: 'Publish the final notes once review is complete.'
      }
    };

    for (const [taskId, update] of Object.entries(updates)) {
      const task = repository.tasks.get(taskId);
      expect(task).toBeDefined();
      Object.assign(task!, update);
      await saveEntity(rootPath, task!);
    }
  }

  async function transitionTask(taskId: string, status: Task['status']): Promise<void> {
    await expect(aiCommand(rootPath, 'update-task', {
      id: taskId,
      status,
      format: 'json'
    })).resolves.toBe(0);
  }

  async function assertRepositoryValid(): Promise<void> {
    const repository = await loadRepository(rootPath);
    expect(validateRepositoryState(repository).valid).toBe(true);
  }

  async function expectDirectory(relativePath: string): Promise<void> {
    const stats = await fs.stat(path.join(rootPath, relativePath));
    expect(stats.isDirectory()).toBe(true);
  }

  function lastJson(): any {
    return JSON.parse(logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string);
  }
});
