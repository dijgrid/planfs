import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { main } from './cli';

describe('CLI argument wiring', () => {
  let rootPath: string;
  let originalArgv: string[];
  let originalCwd: string;
  let originalExitCode: typeof process.exitCode;
  let exitSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(async () => {
    rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-cli-main-'));
    originalArgv = process.argv;
    originalCwd = process.cwd();
    originalExitCode = process.exitCode;
    process.chdir(rootPath);
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    process.argv = originalArgv;
    process.chdir(originalCwd);
    process.exitCode = originalExitCode;
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

  it('parses semantic validation options and allows JSON output to flush naturally', async () => {
    process.argv = ['node', 'planfs', 'init', '--format', 'json'];
    await main();
    exitSpy.mockClear();

    process.argv = [
      'node', 'planfs', 'validate',
      '--semantic', 'automation-ready',
      '--lifecycle',
      '--nlp',
      '--language', 'en',
      '--criterion-check-state', 'warning',
      '--format', 'json'
    ];
    await main();

    expect(exitSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
    const output = JSON.parse(logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string);
    expect(output).toMatchObject({
      valid: true,
      semantic: {
        tier: 'automation-ready',
        lifecycle: true,
        analysisEnabled: true
      }
    });
  });

  it('runs semantic inspection by default and accepts explicit local-analysis opt-out', async () => {
    process.argv = ['node', 'planfs', 'init', '--format', 'json'];
    await main();
    exitSpy.mockClear();
    await fs.writeFile(path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'), [
      '---',
      'id: TASK-001',
      'title: Inspect through CLI',
      'status: todo',
      '---',
      '',
      'Summary.',
      ''
    ].join('\n'), 'utf-8');

    process.argv = [
      'node', 'planfs', 'inspect', 'TASK-001',
      '--view', 'acceptance-criteria',
      '--format', 'json',
      '--no-nlp'
    ];
    await main();

    expect(exitSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
    const disabled = JSON.parse(logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string);
    expect(disabled).toMatchObject({
      inspectionVersion: '1.0.0',
      view: 'acceptance-criteria',
      data: { criteria: [] }
    });

    exitSpy.mockClear();
    process.argv = [
      'node', 'planfs', 'inspect', 'TASK-001',
      '--format', 'json'
    ];
    await main();

    expect(exitSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
    const enabled = JSON.parse(logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string);
    expect(enabled.data.analysis).toMatchObject({
      analyzer: { id: 'planfs-local-english-rules', version: '1.0.0' },
      language: 'en'
    });
  });

  it('wires semantic formatter preview and check modes', async () => {
    process.argv = ['node', 'planfs', 'init', '--format', 'json'];
    await main();
    exitSpy.mockClear();
    await fs.writeFile(path.join(rootPath, '.planfs', 'tasks', 'TASK-001.md'), [
      '---',
      'id: TASK-001',
      'title: Format through public CLI',
      'status: todo',
      '---',
      '',
      '## Acceptance',
      '',
      '- Criterion',
      ''
    ].join('\n'), 'utf8');

    process.argv = ['node', 'planfs', 'format', 'TASK-001', '--format', 'json'];
    await main();
    expect(process.exitCode).toBe(0);
    let output = JSON.parse(logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string);
    expect(output).toMatchObject({ mode: 'preview', changedEntityIds: ['TASK-001'] });

    process.argv = ['node', 'planfs', 'format', 'TASK-001', '--check', '--format', 'json'];
    await main();
    expect(process.exitCode).toBe(1);
    output = JSON.parse(logSpy.mock.calls[logSpy.mock.calls.length - 1]?.[0] as string);
    expect(output.mode).toBe('check');
  });
});
