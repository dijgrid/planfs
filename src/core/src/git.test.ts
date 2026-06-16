import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import {
  getBranchPlanningContext,
  extractTaskIds,
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
