import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { main } from './cli';

describe('CLI argument wiring', () => {
  let rootPath: string;
  let originalArgv: string[];
  let originalCwd: string;
  let exitSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-cli-main-'));
    originalArgv = process.argv;
    originalCwd = process.cwd();
    process.chdir(rootPath);
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    process.argv = originalArgv;
    process.chdir(originalCwd);
    exitSpy.mockRestore();
    logSpy.mockRestore();
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  it('parses initialization options and invokes the command handler', async () => {
    process.argv = ['node', 'planfs', 'init', '--format', 'json'];

    await main();

    expect(exitSpy).toHaveBeenCalledWith(0);
    await expect(fs.stat(path.join(rootPath, '.planfs', 'tasks'))).resolves.toBeDefined();
  });

  it('parses AI summary options through the public CLI surface', async () => {
    process.argv = ['node', 'planfs', 'init', '--format', 'json'];
    await main();
    exitSpy.mockClear();

    process.argv = [
      'node', 'planfs', 'ai', 'summary',
      '--only', 'ready',
      '--compact',
      '--format', 'json'
    ];
    await main();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(logSpy).toHaveBeenLastCalledWith(expect.stringContaining('"section":"ready"'));
  });
});
