import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createCommand } from './create';
import { backlogCommand } from './backlog';
import { gitCommand } from './git';
import { initCommand } from './init';
import { listCommand } from './list';
import { nextCommand } from './next';
import { pullRequestCommand } from './pr';
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

  it('initializes repository structure idempotently', async () => {
    await expect(initCommand(rootPath, { format: 'json' })).resolves.toBe(0);

    const output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );

    expect(output.created).toEqual([
      '.planfs',
      '.planfs/tasks',
      '.planfs/epics',
      '.planfs/milestones',
      '.planfs/decisions',
      '.planfs/filters'
    ]);

    await expect(initCommand(rootPath, { format: 'json' })).resolves.toBe(0);
    const secondOutput = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(secondOutput.created).toEqual([]);
    expect(secondOutput.existing).toContain('.planfs/filters');
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

  it('lists ranked next-work candidates', async () => {
    await writeTask('TASK-001', [
      'title: Done dependency',
      'status: done'
    ]);
    await writeTask('TASK-002', [
      'title: Blocked task',
      'status: todo',
      'priority: critical',
      'dependsOn:',
      '  - TASK-003'
    ]);
    await writeTask('TASK-003', [
      'title: Open dependency',
      'status: todo',
      'priority: low'
    ]);
    await writeTask('TASK-004', [
      'title: Ready high priority',
      'status: todo',
      'priority: high',
      'assignee: justin',
      'dependsOn:',
      '  - TASK-001'
    ]);

    await expect(nextCommand(rootPath, { format: 'json' })).resolves.toBe(0);

    const output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output.map((candidate: { id: string }) => candidate.id)).toEqual([
      'TASK-004',
      'TASK-003'
    ]);
    expect(output[0]).toMatchObject({
      readiness: 'ready',
      priority: 'high',
      assignee: 'justin'
    });
  });

  it('captures, lists, updates, and reviews backlog items', async () => {
    await fs.mkdir(path.join(rootPath, '.planfs', 'tasks'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.planfs', 'epics'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.planfs', 'milestones'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.planfs', 'decisions'), { recursive: true });

    await expect(backlogCommand(rootPath, 'capture', {
      title: 'Investigate import flow',
      body: 'Rough note for later.',
      priority: 'high',
      assignee: 'justin'
    })).resolves.toBe(0);

    await expect(backlogCommand(rootPath, 'list', {
      state: 'captured',
      query: 'import',
      format: 'json'
    })).resolves.toBe(0);

    let output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({
      id: 'TASK-001',
      refinementState: 'captured',
      priority: 'high'
    });

    await expect(backlogCommand(rootPath, 'set-state', {
      id: 'TASK-001',
      state: 'ready'
    })).resolves.toBe(0);

    const updated = await fs.readFile(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'),
      'utf-8'
    );
    expect(updated).toContain('refinementState: ready');

    await expect(backlogCommand(rootPath, 'review', { format: 'json' })).resolves.toBe(0);
    output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output).toEqual([]);
  });

  it('reports incomplete backlog review items', async () => {
    await writeTask('TASK-001', [
      'title: Thin backlog item',
      'status: todo',
      'refinementState: needs-refinement',
      'updatedAt: 2026-01-01T00:00:00Z'
    ]);

    await expect(backlogCommand(rootPath, 'review', {})).resolves.toBe(0);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('BACKLOG REVIEW'));
    expect(logSpy).toHaveBeenCalledWith('TASK-001 Thin backlog item');
  });

  it('can include blocked next-work candidates with explanations', async () => {
    await writeTask('TASK-001', [
      'title: Open dependency',
      'status: todo'
    ]);
    await writeTask('TASK-002', [
      'title: Blocked task',
      'status: todo',
      'dependsOn:',
      '  - TASK-001'
    ]);

    await expect(
      nextCommand(rootPath, { includeBlocked: true, explain: true })
    ).resolves.toBe(0);

    expect(logSpy).toHaveBeenCalledWith('TASK-002 Blocked task');
    expect(logSpy).toHaveBeenCalledWith('  Blocked by TASK-001');
  });

  it('lists pull request provider boundaries', async () => {
    await expect(
      pullRequestCommand(rootPath, 'providers', { format: 'json' })
    ).resolves.toBe(0);

    const output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output.map((provider: { id: string }) => provider.id)).toEqual([
      'github',
      'gitlab',
      'azure-devops'
    ]);
  });

  it('shows pull request references on task details', async () => {
    await fs.mkdir(path.join(rootPath, '.planfs', 'tasks'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.planfs', 'epics'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.planfs', 'milestones'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.planfs', 'decisions'), { recursive: true });
    await fs.writeFile(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'),
      [
        '---',
        'id: TASK-001',
        'title: Linked PR task',
        'status: todo',
        'links:',
        '  pr: https://github.com/dijgrid/planfs/pull/5',
        '---',
        '',
        'Task with a linked PR.',
        ''
      ].join('\n'),
      'utf-8'
    );

    await expect(showCommand(rootPath, 'TASK-001', {})).resolves.toBe(0);
    expect(logSpy).toHaveBeenCalledWith('Pull Requests:');
    expect(logSpy).toHaveBeenCalledWith(
      '  - github: linked (https://github.com/dijgrid/planfs/pull/5)'
    );
  });

  async function writeTask(id: string, metadataLines: string[]): Promise<void> {
    await fs.mkdir(path.join(rootPath, '.planfs', 'tasks'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.planfs', 'epics'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.planfs', 'milestones'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.planfs', 'decisions'), { recursive: true });
    await fs.writeFile(
      path.join(rootPath, '.planfs', 'tasks', `${id}.md`),
      [
        '---',
        `id: ${id}`,
        ...metadataLines,
        '---',
        '',
        `${id} body.`,
        ''
      ].join('\n'),
      'utf-8'
    );
  }
});
