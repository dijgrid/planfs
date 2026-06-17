import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import {
  generatePullRequestSummary,
  getPullRequestProviderBoundaries,
  getTaskPullRequestRefs
} from './pull-request';
import { Task } from './types';

const execFileAsync = promisify(execFile);

describe('pull request helpers', () => {
  let rootPath: string;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-pr-'));
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
    await git('checkout', '-b', 'TASK-019-pr-summary');
    await writeTask('TASK-001', 'Base task updated', 'review');
    await writeTask('TASK-002', 'New PR task', 'todo');
  });

  afterEach(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('generates a markdown PR summary from branch context', async () => {
    const summary = await generatePullRequestSummary(rootPath, {
      baseRef: 'main'
    });

    expect(summary.title).toContain('TASK-019');
    expect(summary.relatedTaskIds).toEqual(['TASK-019', 'TASK-002', 'TASK-001']);
    expect(summary.addedTasks).toBe(1);
    expect(summary.modifiedTasks).toBe(1);
    expect(summary.markdown).toContain('### Related Tasks');
    expect(summary.markdown).toContain('- TASK-002');
    expect(summary.markdown).toContain('planfs validate --format json');
  });

  it('describes provider boundaries', () => {
    expect(getPullRequestProviderBoundaries().map(provider => provider.id)).toEqual([
      'github',
      'gitlab',
      'azure-devops'
    ]);
  });

  it('detects task pull request references from links', () => {
    const task: Task = {
      id: 'TASK-001',
      type: 'task',
      title: 'Task',
      status: 'todo',
      filePath: '',
      metadata: {},
      body: '',
      links: {
        pr: 'https://github.com/dijgrid/planfs/pull/5',
        docs: 'https://example.com'
      }
    };

    expect(getTaskPullRequestRefs(task)).toEqual([
      {
        provider: 'github',
        url: 'https://github.com/dijgrid/planfs/pull/5',
        status: 'linked'
      }
    ]);
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
