import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createCommand } from './create';
import { gitCommand } from './git';
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

  it('creates, lists, shows, and validates epics and milestones', async () => {
    await expect(
      createCommand(rootPath, 'epic', {
        title: 'Phase 6 - Polish',
        owner: 'justin',
        description: 'Polish the PlanFS workflow.'
      })
    ).resolves.toBe(0);
    await expect(
      createCommand(rootPath, 'epic', {
        title: 'Phase 6 - Polish'
      })
    ).resolves.toBe(0);
    await expect(
      createCommand(rootPath, 'milestone', {
        title: 'Phase 6 - Polish',
        targetDate: '2026-09-01',
        owner: 'justin'
      })
    ).resolves.toBe(0);

    await expect(listCommand(rootPath, { type: 'epics' })).resolves.toBe(0);
    await expect(listCommand(rootPath, { type: 'milestones' })).resolves.toBe(0);
    await expect(showCommand(rootPath, 'EPIC-phase-6-polish', {})).resolves.toBe(0);
    await expect(
      showCommand(rootPath, 'MILESTONE-phase-6-polish', {})
    ).resolves.toBe(0);
    await expect(validateCommand(rootPath, {})).resolves.toBe(0);

    const epic = await fs.readFile(
      path.join(rootPath, '.planfs', 'epics', 'EPIC-phase-6-polish.md'),
      'utf-8'
    );
    const duplicateEpic = await fs.readFile(
      path.join(rootPath, '.planfs', 'epics', 'EPIC-phase-6-polish-2.md'),
      'utf-8'
    );
    const milestone = await fs.readFile(
      path.join(
        rootPath,
        '.planfs',
        'milestones',
        'MILESTONE-phase-6-polish.md'
      ),
      'utf-8'
    );

    expect(epic).toContain('id: EPIC-phase-6-polish');
    expect(epic).toContain('owner: justin');
    expect(duplicateEpic).toContain('id: EPIC-phase-6-polish-2');
    expect(milestone).toContain('targetDate: 2026-09-01');
    expect(logSpy).toHaveBeenCalledWith('✓ Created epic: EPIC-phase-6-polish');
    expect(logSpy).toHaveBeenCalledWith(
      '✓ Created milestone: MILESTONE-phase-6-polish'
    );
  });

  it('requires target date when creating milestones', async () => {
    await expect(
      createCommand(rootPath, 'milestone', { title: 'No date' })
    ).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: --target-date is required when creating milestones'
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

  it('validates commit message task references', async () => {
    await createCommand(rootPath, 'task', {
      title: 'Wire Git helpers',
      priority: 'medium'
    });

    await expect(
      gitCommand(
        rootPath,
        'validate-message',
        'TASK-001: wire Git helpers',
        {}
      )
    ).resolves.toBe(0);

    await expect(
      gitCommand(rootPath, 'validate-message', 'TASK-999: unknown task', {})
    ).resolves.toBe(1);
  });
});
