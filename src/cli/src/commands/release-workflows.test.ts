import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import {
  createTaskTemplate,
  ensurePlanfsStructure,
  loadRepository,
  saveEntity
} from 'planfs-core';
import { branchCommand } from './branch';
import { doctorCommand } from './doctor';
import { filterCommand } from './filter';
import { historyCommand } from './history';
import { migrateCommand } from './migrate';
import { updateCommand } from './update';

const execFileAsync = promisify(execFile);

describe('CLI 1.3 release workflows', () => {
  let rootPath: string;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-cli-release-'));
    await ensurePlanfsStructure(rootPath);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('previews and applies format migrations idempotently', async () => {
    await fs.unlink(path.join(rootPath, '.planfs', 'planfs.json'));
    await expect(migrateCommand(rootPath, { format: 'json' })).resolves.toBe(0);
    expect(lastJson()).toMatchObject({ applied: false, changes: [expect.any(Object)] });

    await expect(migrateCommand(rootPath, { apply: true, format: 'json' })).resolves.toBe(0);
    expect(lastJson()).toMatchObject({ applied: true, targetVersion: 1 });
    await expect(fs.readFile(path.join(rootPath, '.planfs', 'planfs.json'), 'utf8'))
      .resolves.toContain('"formatVersion": 1');

    await expect(migrateCommand(rootPath)).resolves.toBe(0);
    expect(logSpy).toHaveBeenLastCalledWith('No format migration needed.');
  });

  it('saves, lists, shows, previews deletion, and deletes shared filters', async () => {
    await expect(filterCommand(rootPath, 'save', {
      id: 'release-work',
      name: 'Release Work',
      description: 'Tasks for the release',
      criteria: '{"status":["todo","review"],"tags":["release"]}',
      format: 'json'
    })).resolves.toBe(0);
    expect(lastJson()).toMatchObject({ id: 'release-work', name: 'Release Work' });

    await expect(filterCommand(rootPath, 'list', { format: 'json' })).resolves.toBe(0);
    expect(lastJson()).toHaveLength(1);
    await expect(filterCommand(rootPath, 'show', { id: 'release-work' })).resolves.toBe(0);

    await expect(filterCommand(rootPath, 'delete', {
      id: 'release-work', dryRun: true, format: 'json'
    })).resolves.toBe(0);
    expect(lastJson()).toEqual({ id: 'release-work', dryRun: true });

    await expect(filterCommand(rootPath, 'delete', {
      id: 'release-work', format: 'json'
    })).resolves.toBe(0);
    await expect(filterCommand(rootPath, 'show', {
      id: 'release-work', format: 'json'
    })).resolves.toBe(1);
    expect(errorSpy).toHaveBeenLastCalledWith(expect.stringContaining('Filter not found'));
  });

  it('previews and applies guarded general entity updates', async () => {
    await saveEntity(rootPath, {
      ...createTaskTemplate('TASK-001', 'Original task'),
      priority: 'high',
      updatedAt: '2026-08-01T00:00:00.000Z'
    });

    await expect(updateCommand(rootPath, 'TASK-001', {
      patch: { title: 'Preview title' },
      expectedUpdatedAt: '2026-08-01T00:00:00.000Z',
      dryRun: true,
      format: 'json'
    })).resolves.toBe(0);
    expect(lastJson()).toMatchObject({ dryRun: true, entity: { title: 'Preview title' } });
    expect((await loadRepository(rootPath)).tasks.get('TASK-001')?.title).toBe('Original task');

    await expect(updateCommand(rootPath, 'TASK-001', {
      patch: { title: 'Updated task', status: 'review', assignee: 'casey' },
      expectedUpdatedAt: '2026-08-01T00:00:00.000Z',
      format: 'json'
    })).resolves.toBe(0);
    expect((await loadRepository(rootPath)).tasks.get('TASK-001')).toMatchObject({
      title: 'Updated task', status: 'review', assignee: 'casey'
    });

    await expect(updateCommand(rootPath, 'TASK-001', {
      patch: { status: 'done' }, expectedUpdatedAt: '2026-08-01T00:00:00.000Z'
    })).resolves.toBe(1);
    await expect(updateCommand(rootPath, 'TASK-001', {
      patch: { id: 'TASK-999' }
    })).resolves.toBe(1);
    await expect(updateCommand(rootPath, 'TASK-999', {
      patch: { title: 'Missing' }
    })).resolves.toBe(1);
    expect(errorSpy).toHaveBeenCalledTimes(3);
  });

  it('reports actionable and healthy plan states', async () => {
    const task = {
      ...createTaskTemplate('TASK-001', 'Review task'),
      status: 'review' as const
    };
    await saveEntity(rootPath, task);

    await expect(doctorCommand(rootPath, { format: 'json' })).resolves.toBe(1);
    expect(lastJson()).toMatchObject({
      issues: [expect.objectContaining({ category: 'stale-review', id: 'TASK-001' })]
    });

    await saveEntity(rootPath, { ...task, status: 'done' });
    await expect(doctorCommand(rootPath)).resolves.toBe(0);
    expect(logSpy).toHaveBeenLastCalledWith('Plan health: no actionable issues.');
  });

  it('shows entity history and branch planning context from a real Git repository', async () => {
    await git('init', '-b', 'main');
    await git('config', 'user.email', 'test@example.com');
    await git('config', 'user.name', 'PlanFS Test');
    await git('config', 'commit.gpgsign', 'false');
    await saveEntity(rootPath, createTaskTemplate('TASK-001', 'Base task'));
    await git('add', '.');
    await git('commit', '-m', 'TASK-001: add base task');

    await expect(historyCommand(rootPath, 'TASK-001', 'json')).resolves.toBe(0);
    expect(lastJson()).toEqual([
      expect.objectContaining({ author: 'PlanFS Test', subject: 'TASK-001: add base task' })
    ]);
    await expect(historyCommand(rootPath, 'TASK-001')).resolves.toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('TASK-001: add base task'));

    await git('checkout', '-b', 'TASK-002-release-work');
    const baseTask = (await loadRepository(rootPath)).tasks.get('TASK-001')!;
    await saveEntity(rootPath, { ...baseTask, status: 'in-progress' });
    await saveEntity(rootPath, createTaskTemplate('TASK-002', 'Release task'));

    await expect(branchCommand(rootPath, { base: 'main', format: 'json' })).resolves.toBe(0);
    expect(lastJson()).toMatchObject({
      currentBranch: 'TASK-002-release-work',
      addedTasks: [expect.objectContaining({ id: 'TASK-002' })],
      modifiedTasks: [expect.objectContaining({ id: 'TASK-001' })]
    });
    await expect(branchCommand(rootPath, { base: 'main' })).resolves.toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Branch: TASK-002-release-work'));

    await expect(historyCommand(rootPath, 'TASK-999')).resolves.toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Entity not found'));
  });

  function lastJson(): any {
    return JSON.parse(logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string);
  }

  async function git(...args: string[]): Promise<void> {
    await execFileAsync('git', args, { cwd: rootPath });
  }
});
