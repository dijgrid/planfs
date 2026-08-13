import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { ensurePlanfsStructure } from './files';
import { getEntityHistory } from './history';
import { createTaskTemplate, saveEntity } from './repository';

const execFileAsync = promisify(execFile);

describe('entity history', () => {
  let rootPath: string;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-history-'));
    await ensurePlanfsStructure(rootPath);
  });

  afterEach(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('returns committed history for an entity', async () => {
    await git('init');
    await git('config', 'user.email', 'test@example.com');
    await git('config', 'user.name', 'PlanFS Test');
    await git('config', 'commit.gpgsign', 'false');
    await saveEntity(rootPath, createTaskTemplate('TASK-001', 'History task'));
    await git('add', '.');
    await git('commit', '-m', 'TASK-001: add history task');

    await expect(getEntityHistory(rootPath, 'TASK-001')).resolves.toEqual([
      expect.objectContaining({
        author: 'PlanFS Test',
        subject: 'TASK-001: add history task'
      })
    ]);
  });

  it('reports missing entities and unavailable Git history', async () => {
    await saveEntity(rootPath, createTaskTemplate('TASK-001', 'Uncommitted task'));

    await expect(getEntityHistory(rootPath, 'TASK-999')).rejects.toThrow('Entity not found');
    await expect(getEntityHistory(rootPath, 'TASK-001')).rejects.toThrow('Git history is unavailable');
  });

  async function git(...args: string[]): Promise<void> {
    await execFileAsync('git', args, { cwd: rootPath });
  }
});
