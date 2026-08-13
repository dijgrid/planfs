import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'planfs-extension-host-'));
  try {
    process.env.PLANFS_SMOKE_WORKSPACE = workspace;
    await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '..', '..'),
      extensionTestsPath: path.resolve(__dirname, 'suite', 'index'),
      launchArgs: [workspace]
    });
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

void main().catch(error => { console.error(error); process.exit(1); });
