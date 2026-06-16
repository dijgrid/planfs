import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createCommand } from './create';
import { listCommand } from './list';
import { showCommand } from './show';
import { validateCommand } from './validate';

describe('CLI commands', () => {
  let rootPath: string;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-cli-'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('creates, lists, shows, and validates a task repository', async () => {
    await expect(
      createCommand(rootPath, 'task', {
        title: 'Write CLI tests',
        priority: 'high',
        assignee: 'justin'
      })
    ).resolves.toBe(0);

    await expect(listCommand(rootPath, { type: 'tasks' })).resolves.toBe(0);
    await expect(showCommand(rootPath, 'TASK-001', {})).resolves.toBe(0);
    await expect(validateCommand(rootPath, {})).resolves.toBe(0);

    const created = await fs.readFile(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'),
      'utf-8'
    );

    expect(created).toContain('id: TASK-001');
    expect(created).toContain('priority: high');
    expect(logSpy).toHaveBeenCalledWith('✓ Created task: TASK-001');
  });

  it('rejects unsupported entity creation', async () => {
    await expect(
      createCommand(rootPath, 'epic', { title: 'Not yet' })
    ).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: creating epic entities is not supported yet'
    );
  });

  it('emits machine-readable validation output', async () => {
    await createCommand(rootPath, 'task', {
      title: 'Check CI output',
      priority: 'medium'
    });

    await expect(
      validateCommand(rootPath, { format: 'json' })
    ).resolves.toBe(0);

    const lastLog = logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0];
    const output = JSON.parse(lastLog as string);

    expect(output).toMatchObject({
      valid: true,
      summary: {
        entities: 1,
        tasks: 1,
        epics: 0,
        milestones: 0,
        decisions: 0
      },
      result: {
        valid: true,
        errors: []
      }
    });
  });
});
