import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  applyFormatMigration,
  getPlanfsFormat,
  PLANFS_FORMAT_VERSION,
  planFormatMigration
} from './format';

describe('PlanFS format migrations', () => {
  let rootPath: string;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-format-'));
  });

  afterEach(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('previews, applies, and then recognizes the current format', async () => {
    await expect(getPlanfsFormat(rootPath)).resolves.toMatchObject({
      version: 1,
      explicit: false
    });

    const preview = await planFormatMigration(rootPath);
    expect(preview.changes).toEqual([
      expect.objectContaining({
        action: 'create',
        filePath: path.join(rootPath, '.planfs', 'planfs.json')
      })
    ]);

    await applyFormatMigration(rootPath);
    await expect(getPlanfsFormat(rootPath)).resolves.toMatchObject({
      version: PLANFS_FORMAT_VERSION,
      explicit: true
    });
    await expect(planFormatMigration(rootPath)).resolves.toMatchObject({ changes: [] });
  });

  it.each([
    ['invalid JSON', '{'],
    ['missing version', '{}'],
    ['zero version', '{"formatVersion":0}']
  ])('rejects %s configuration', async (_label, content) => {
    await fs.mkdir(path.join(rootPath, '.planfs'), { recursive: true });
    await fs.writeFile(path.join(rootPath, '.planfs', 'planfs.json'), content, 'utf8');
    await expect(getPlanfsFormat(rootPath)).rejects.toThrow();
  });

  it('rejects a repository format newer than this build', async () => {
    await fs.mkdir(path.join(rootPath, '.planfs'), { recursive: true });
    await fs.writeFile(
      path.join(rootPath, '.planfs', 'planfs.json'),
      JSON.stringify({ formatVersion: PLANFS_FORMAT_VERSION + 1 }),
      'utf8'
    );

    await expect(getPlanfsFormat(rootPath)).rejects.toThrow('newer than this CLI supports');
  });
});
