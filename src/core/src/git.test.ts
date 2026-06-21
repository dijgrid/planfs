import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import {
  getBranchPlanningContext,
  extractTaskIds,
  getCurrentRepositoryUser,
  getRepositoryDevelopers,
  suggestCommitMessage,
  validateCommitMessage
} from './git';

const execFileAsync = promisify(execFile);

describe('git planning helpers', () => {
  let rootPath: string;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-git-'));
    await git('init');
    await git('config', 'user.email', 'test@example.com');
    await git('config', 'user.name', 'PlanFS Test');
    await git('config', 'commit.gpgsign', 'false');
    await git('checkout', '-b', 'main');
    await fs.mkdir(path.join(rootPath, '.planfs', 'tasks'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.planfs', 'epics'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.planfs', 'milestones'), { recursive: true });
    await fs.mkdir(path.join(rootPath, '.planfs', 'decisions'), { recursive: true });
    await writeTask('TASK-001', 'Base task', 'todo');
    await git('add', '.');
    await git('commit', '-m', 'initial plan');
    await git('checkout', '-b', 'TASK-003-branch-context');
    await writeTask('TASK-001', 'Base task updated', 'in-progress');
    await writeTask('TASK-002', 'New branch task', 'todo');
  });

  afterEach(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('extracts normalized task IDs', () => {
    expect(extractTaskIds('feature/task-001-and-TASK-002')).toEqual([
      'TASK-001',
      'TASK-002'
    ]);
  });

  it('summarizes branch planning changes against a base ref', async () => {
    const context = await getBranchPlanningContext(rootPath, {
      baseRef: 'main'
    });

    expect(context.currentBranch).toBe('TASK-003-branch-context');
    expect(context.baseRef).toBe('main');
    expect(context.taskIdsInBranchName).toEqual(['TASK-003']);
    expect(context.addedTasks.map(task => task.id)).toEqual(['TASK-002']);
    expect(context.modifiedTasks.map(task => task.id)).toEqual(['TASK-001']);
    expect(context.modifiedTasks[0]?.previous).toEqual({
      title: 'Base task',
      status: 'todo'
    });
    expect(context.relatedTaskIds).toEqual(['TASK-003', 'TASK-002', 'TASK-001']);
    expect(context.pullRequestPreview.summary).toContain('1 added task');
    expect(context.pullRequestPreview.summary).toContain('1 modified task');
  });

  it('suggests a commit message from related branch tasks', async () => {
    const suggestion = await suggestCommitMessage(rootPath, {
      baseRef: 'main'
    });

    expect(suggestion).toEqual({
      message: 'TASK-003: branch context',
      taskIds: ['TASK-003', 'TASK-002', 'TASK-001'],
      source: 'related-task'
    });
  });

  it('collects developer suggestions from repository history', async () => {
    await expect(getRepositoryDevelopers(rootPath)).resolves.toEqual([
      {
        name: 'PlanFS Test',
        email: 'test@example.com',
        label: 'PlanFS Test <test@example.com>'
      }
    ]);
  });

  it('resolves the current repository user from git config', async () => {
    await expect(getCurrentRepositoryUser(rootPath)).resolves.toEqual({
      name: 'PlanFS Test',
      email: 'test@example.com',
      label: 'PlanFS Test <test@example.com>',
      aliases: [
        'PlanFS Test',
        'test@example.com',
        'PlanFS Test <test@example.com>'
      ]
    });
  });

  it('deduplicates developer suggestions by email', async () => {
    await fs.writeFile(path.join(rootPath, 'notes.md'), 'extra commit\n', 'utf-8');
    await git('add', 'notes.md');
    await execFileAsync('git', ['commit', '-m', 'extra contributor'], {
      cwd: rootPath,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'PlanFS Duplicate',
        GIT_AUTHOR_EMAIL: 'test@example.com',
        GIT_COMMITTER_NAME: 'PlanFS Duplicate',
        GIT_COMMITTER_EMAIL: 'test@example.com'
      }
    });

    const developers = await getRepositoryDevelopers(rootPath);
    expect(developers).toHaveLength(1);
    expect(developers[0]?.email).toBe('test@example.com');
  });

  it('returns no developer suggestions when git history is unavailable', async () => {
    const emptyRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-git-empty-'));
    try {
      await expect(getRepositoryDevelopers(emptyRoot)).resolves.toEqual([]);
    } finally {
      await fs.rm(emptyRoot, { recursive: true, force: true });
    }
  });

  it('validates commit message task references', async () => {
    await expect(
      validateCommitMessage(rootPath, 'TASK-001: update the base task')
    ).resolves.toEqual({
      valid: true,
      taskIds: ['TASK-001'],
      missingTaskIds: [],
      warnings: []
    });

    await expect(
      validateCommitMessage(rootPath, 'TASK-999: missing reference')
    ).resolves.toMatchObject({
      valid: false,
      taskIds: ['TASK-999'],
      missingTaskIds: ['TASK-999']
    });

    await expect(
      validateCommitMessage(rootPath, 'update planning docs')
    ).resolves.toEqual({
      valid: true,
      taskIds: [],
      missingTaskIds: [],
      warnings: ['Commit message does not reference a PlanFS task ID.']
    });
  });

  async function writeTask(
    id: string,
    title: string,
    status: string
  ): Promise<void> {
    await fs.writeFile(
      path.join(rootPath, '.planfs', 'tasks', `${id}.md`),
      [
        '---',
        `id: ${id}`,
        `title: ${title}`,
        `status: ${status}`,
        '---',
        '',
        `${title}.`,
        ''
      ].join('\n'),
      'utf-8'
    );
  }

  async function git(...args: string[]): Promise<void> {
    await execFileAsync('git', args, { cwd: rootPath });
  }
});
