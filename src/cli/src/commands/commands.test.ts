import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { aiCommand } from './ai';
import { archiveCommand } from './archive';
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

  it('explicitly enables local advisory analysis in text and stable JSON output', async () => {
    await initCommand(rootPath, { format: 'json' });
    const taskPath = path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md');
    await fs.writeFile(taskPath, [
      '---',
      'id: TASK-001',
      'title: Advisory analysis',
      'status: todo',
      'dependsOn:',
      '  - TASK-100',
      '---',
      '',
      '## Acceptance Criteria',
      '',
      '- [ ] Must not send prose over the network.',
      '- [ ] Complete this after TASK-118.',
      '- [ ] Render `should depend on TASK-999` literally.',
      ''
    ].join('\n'), 'utf-8');
    const before = await fs.readFile(taskPath, 'utf-8');

    await expect(showCommand(rootPath, 'TASK-001', {
      nlp: true,
      format: 'json',
      language: 'en-US'
    })).resolves.toBe(0);
    const jsonOutput = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(jsonOutput).toMatchObject({
      entity: { id: 'TASK-001', status: 'todo', dependsOn: ['TASK-100'] },
      analysis: {
        analyzer: { id: 'planfs-local-english-rules', version: '1.0.0' },
        language: 'en',
        diagnostics: []
      }
    });
    expect(new Set(jsonOutput.analysis.signals.map((signal: { kind: string }) => signal.kind))).toEqual(
      new Set(['modality', 'negation', 'condition', 'relationship-mention'])
    );
    expect(jsonOutput.analysis.signals.some((signal: { data: { targetId?: string } }) => (
      signal.data.targetId === 'TASK-999'
    ))).toBe(false);
    expect(await fs.readFile(taskPath, 'utf-8')).toBe(before);

    await expect(showCommand(rootPath, 'TASK-001', {
      nlp: true,
      format: 'pretty'
    })).resolves.toBe(0);
    expect(logSpy).toHaveBeenCalledWith('\nAdvisory prose analysis:');
    expect(logSpy).toHaveBeenCalledWith(
      'Advisory only; frontmatter and repository relationships are unchanged.'
    );
  });

  it('preserves legacy show JSON when analysis is disabled and bounds unsupported languages', async () => {
    await createCommand(rootPath, 'task', { title: 'Disabled analysis' });

    await expect(showCommand(rootPath, 'TASK-001', { format: 'json' })).resolves.toBe(0);
    const disabled = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(disabled.id).toBe('TASK-001');
    expect(disabled).not.toHaveProperty('entity');
    expect(disabled).not.toHaveProperty('analysis');

    await expect(showCommand(rootPath, 'TASK-001', {
      format: 'json',
      nlp: true,
      language: 'fr'
    })).resolves.toBe(0);
    const unsupported = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(unsupported.analysis).toMatchObject({
      signals: [],
      diagnostics: [{ code: 'analysis.language.unsupported', severity: 'info' }]
    });
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
      '.planfs/filters',
      '.planfs/archive',
      '.planfs/archive/tasks',
      '.planfs/archive/epics'
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

  it('previews entity creation without writing files', async () => {
    await expect(
      createCommand(rootPath, 'task', {
        title: 'Preview task',
        priority: 'high',
        assignee: 'justin',
        dryRun: true,
        format: 'json'
      })
    ).resolves.toBe(0);

    const output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output).toMatchObject({
      type: 'task',
      id: 'TASK-001',
      dryRun: true,
      entity: {
        title: 'Preview task',
        priority: 'high',
        assignee: 'justin'
      }
    });
    expect(output.preview).toContain('title: Preview task');
    await expect(
      fs.stat(path.join(rootPath, '.planfs'))
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      fs.stat(path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'))
    ).rejects.toMatchObject({ code: 'ENOENT' });
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

  it('previews archive changes without moving files', async () => {
    await writeTask('TASK-001', [
      'title: Archive preview',
      'status: todo',
      'updatedAt: 2026-06-20T00:00:00.000Z'
    ]);

    await expect(archiveCommand(rootPath, 'archive', {
      id: 'TASK-001',
      dryRun: true,
      expectedUpdatedAt: '2026-06-20T00:00:00.000Z',
      format: 'json'
    })).resolves.toBe(0);

    const output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output).toMatchObject({
      dryRun: true,
      archived: [
        {
          id: 'TASK-001',
          archive: {
            originalPath: '.planfs/tasks/TASK-001.md'
          }
        }
      ]
    });
    expect(output.previews[0].preview).toContain('archive:');
    await expect(
      fs.stat(path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'))
    ).resolves.toBeDefined();
    await expect(
      fs.stat(path.join(rootPath, '.planfs', 'archive', 'tasks', 'TASK-001.md'))
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses archive when the target changed since preview', async () => {
    await writeTask('TASK-001', [
      'title: Archive conflict',
      'status: todo',
      'updatedAt: 2026-06-20T00:00:00.000Z'
    ]);

    await expect(archiveCommand(rootPath, 'archive', {
      id: 'TASK-001',
      expectedUpdatedAt: '2026-06-19T00:00:00.000Z',
      format: 'json'
    })).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error:',
      'Archive conflict: TASK-001 changed since preview'
    );
    await expect(
      fs.stat(path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'))
    ).resolves.toBeDefined();
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

  it('emits AI-ready planning summaries', async () => {
    await writeTask('TASK-001', [
      'title: Done dependency',
      'status: done',
      'updatedAt: 2026-06-01T00:00:00Z'
    ]);
    await writeTask('TASK-002', [
      'title: Ready AI task',
      'status: todo',
      'priority: high',
      'assignee: justin',
      'dependsOn:',
      '  - TASK-001',
      'updatedAt: 2026-06-20T00:00:00Z'
    ]);
    await writeTask('TASK-003', [
      'title: Blocked AI task',
      'status: todo',
      'dependsOn:',
      '  - TASK-004'
    ]);
    await writeTask('TASK-004', [
      'title: Open dependency',
      'status: todo'
    ]);

    await expect(aiCommand(rootPath, 'summary', {
      assignee: 'justin',
      format: 'json'
    })).resolves.toBe(0);

    const output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output.counts).toMatchObject({
      tasks: 1,
      openTasks: 1,
      readyTasks: 1
    });
    expect(output.readyWork[0]).toMatchObject({
      id: 'TASK-002',
      filePath: expect.stringContaining('TASK-002.md')
    });
  });

  it('emits selective compact JSON and concise text planning summaries', async () => {
    await writeTask('TASK-001', [
      'title: Review AI output',
      'status: review',
      'updatedAt: 2026-06-20T00:00:00Z'
    ]);
    await writeTask('TASK-002', [
      'title: Open AI output',
      'status: todo'
    ]);

    await expect(aiCommand(rootPath, 'summary', {
      only: 'review', compact: true, format: 'json'
    })).resolves.toBe(0);
    const compactOutput = logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string;
    expect(compactOutput).not.toContain('\n');
    expect(JSON.parse(compactOutput)).toMatchObject({
      section: 'review', count: 1, items: [{ id: 'TASK-001' }]
    });

    await expect(aiCommand(rootPath, 'summary', {
      only: 'review', format: 'text'
    })).resolves.toBe(0);
    const textOutput = logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string;
    expect(textOutput).toContain('PlanFS planning summary');
    expect(textOutput).toContain('Review (1)');
    expect(textOutput).toContain('TASK-001 [review] Review AI output');
    expect(textOutput).not.toContain('TASK-002');
  });

  it('previews and applies AI task updates', async () => {
    await writeTask('TASK-001', [
      'title: Update with AI command',
      'status: todo',
      'priority: medium'
    ]);

    await expect(aiCommand(rootPath, 'update-task', {
      id: 'TASK-001',
      status: 'review',
      priority: 'high',
      tags: 'ai,workflow',
      dryRun: true,
      format: 'json'
    })).resolves.toBe(0);

    let output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output.dryRun).toBe(true);
    expect(output.changedFields).toEqual(['status', 'priority', 'tags']);
    expect(output.preview).toContain('status: review');

    let taskFile = await fs.readFile(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'),
      'utf-8'
    );
    expect(taskFile).toContain('status: todo');

    await expect(aiCommand(rootPath, 'update-task', {
      id: 'TASK-001',
      status: 'review',
      priority: 'high',
      tags: 'ai,workflow',
      format: 'json'
    })).resolves.toBe(0);

    output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output.dryRun).toBe(false);
    taskFile = await fs.readFile(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'),
      'utf-8'
    );
    expect(taskFile).toContain('status: review');
    expect(taskFile).toContain('priority: high');
    expect(taskFile).toContain('tags:');
  });

  it('previews and applies transactional AI bulk task updates', async () => {
    await writeTask('TASK-001', [
      'title: First bulk task',
      'status: todo'
    ]);
    await writeTask('TASK-002', [
      'title: Second bulk task',
      'status: todo'
    ]);

    await expect(aiCommand(rootPath, 'bulk-update-tasks', {
      ids: 'TASK-001,TASK-002',
      status: 'review',
      assignee: 'justin',
      estimate: '2d',
      dryRun: true,
      format: 'json'
    })).resolves.toBe(0);

    let output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output.dryRun).toBe(true);
    expect(output.taskIds).toEqual(['TASK-001', 'TASK-002']);
    expect(output.changedFields).toEqual(['status', 'assignee', 'estimate']);
    expect(output.changedTasks[0].preview).toContain('estimate: 2d');

    let firstTask = await fs.readFile(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'),
      'utf-8'
    );
    expect(firstTask).toContain('status: todo');
    expect(firstTask).not.toContain('estimate: 2d');

    await expect(aiCommand(rootPath, 'bulk-update-tasks', {
      ids: ['TASK-001', 'TASK-002'],
      status: 'review',
      assignee: 'justin',
      estimate: '2d',
      format: 'json'
    })).resolves.toBe(0);

    output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output.dryRun).toBe(false);
    firstTask = await fs.readFile(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'),
      'utf-8'
    );
    const secondTask = await fs.readFile(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-002.md'),
      'utf-8'
    );
    expect(firstTask).toContain('status: review');
    expect(firstTask).toContain('assignee: justin');
    expect(firstTask).toContain('estimate: 2d');
    expect(secondTask).toContain('status: review');
    expect(secondTask).toContain('estimate: 2d');
  });

  it('blocks invalid AI bulk task updates before writing', async () => {
    await writeTask('TASK-001', [
      'title: First invalid bulk task',
      'status: todo'
    ]);
    await writeTask('TASK-002', [
      'title: Second invalid bulk task',
      'status: todo'
    ]);

    await expect(aiCommand(rootPath, 'bulk-update-tasks', {
      ids: 'TASK-001,TASK-002',
      milestone: 'MILESTONE-missing',
      format: 'json'
    })).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error:',
      expect.stringContaining('Referenced milestone not found')
    );
    const firstTask = await fs.readFile(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'),
      'utf-8'
    );
    const secondTask = await fs.readFile(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-002.md'),
      'utf-8'
    );
    expect(firstTask).not.toContain('MILESTONE-missing');
    expect(secondTask).not.toContain('MILESTONE-missing');
  });

  it('blocks invalid AI task updates before writing', async () => {
    await writeTask('TASK-001', [
      'title: Invalid AI update',
      'status: todo',
      'priority: medium'
    ]);

    await expect(aiCommand(rootPath, 'update-task', {
      id: 'TASK-001',
      epic: 'EPIC-missing',
      format: 'json'
    })).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error:',
      expect.stringContaining('Referenced epic not found')
    );
    const taskFile = await fs.readFile(
      path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'),
      'utf-8'
    );
    expect(taskFile).not.toContain('EPIC-missing');
  });

  it('returns a concurrency token and refuses stale AI task updates', async () => {
    await writeTask('TASK-001', [
      'title: Concurrent AI update',
      'status: todo',
      'updatedAt: 2026-06-20T00:00:00Z'
    ]);

    await expect(aiCommand(rootPath, 'update-task', {
      id: 'TASK-001', status: 'review', dryRun: true, format: 'json'
    })).resolves.toBe(0);
    const preview = JSON.parse(logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string);
    expect(preview.expectedUpdatedAt).toBe('2026-06-20T00:00:00Z');

    await writeTask('TASK-001', [
      'title: Concurrent AI update',
      'status: in-progress',
      'updatedAt: 2026-06-21T00:00:00Z'
    ]);
    await expect(aiCommand(rootPath, 'update-task', {
      id: 'TASK-001',
      status: 'review',
      expectedUpdatedAt: preview.expectedUpdatedAt,
      format: 'json'
    })).resolves.toBe(1);
    expect(errorSpy).toHaveBeenCalledWith('Error:', expect.stringContaining('changed since preview'));
    expect(await fs.readFile(path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'), 'utf-8'))
      .toContain('status: in-progress');
  });

  it('initializes agent instructions for AI planning awareness', async () => {
    await fs.writeFile(
      path.join(rootPath, 'AGENTS.md'),
      [
        '# AGENTS.md',
        '',
        'Existing guidance.',
        ''
      ].join('\n'),
      'utf-8'
    );

    await expect(aiCommand(rootPath, 'initialize', {
      dryRun: true,
      format: 'json'
    })).resolves.toBe(0);

    let output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output).toMatchObject({
      created: false,
      updated: true,
      dryRun: true
    });
    expect(output.content).toContain('PLANFS-AI-AWARENESS:START');

    let agents = await fs.readFile(path.join(rootPath, 'AGENTS.md'), 'utf-8');
    expect(agents).not.toContain('PLANFS-AI-AWARENESS:START');

    await expect(aiCommand(rootPath, 'initialize', {
      format: 'json'
    })).resolves.toBe(0);

    output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output).toMatchObject({
      created: false,
      updated: true,
      dryRun: false
    });

    agents = await fs.readFile(path.join(rootPath, 'AGENTS.md'), 'utf-8');
    expect(agents).toContain('Existing guidance.');
    expect(agents).toContain('planfs ai summary');
    expect(agents).toContain('planfs ai bulk-update-tasks --ids TASK-061,TASK-062 --status review --dry-run');
    expect(agents).toContain('Prefer these preview/apply helpers over editing task frontmatter directly');
    expect(agents.match(/PLANFS-AI-AWARENESS:START/g)).toHaveLength(1);

    await expect(aiCommand(rootPath, 'initialize', {
      format: 'json'
    })).resolves.toBe(0);
    output = JSON.parse(
      logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string
    );
    expect(output.updated).toBe(false);

    await expect(aiCommand(rootPath, 'initialize', {
      command: 'node tools/planfs.js',
      dryRun: true,
      format: 'json'
    })).resolves.toBe(0);
    output = JSON.parse(logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string);
    expect(output.content).toContain('node tools/planfs.js ai summary');
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
