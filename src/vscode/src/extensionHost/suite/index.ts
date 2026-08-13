import { promises as fs } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const workspace = process.env.PLANFS_SMOKE_WORKSPACE;
  if (!workspace) throw new Error('PlanFS smoke workspace was not provided');
  await vscode.commands.executeCommand('planfs.initializeRepository');
  const commands = await vscode.commands.getCommands(true);
  for (const command of ['planfs.initializeRepository', 'planfs.openBoard', 'planfs.openBacklog', 'planfs.openInsights', 'planfs.openEditor']) {
    if (!commands.includes(command)) throw new Error(`PlanFS command was not registered: ${command}`);
  }
  await fs.access(path.join(workspace, '.planfs', 'tasks'));
  await vscode.commands.executeCommand('planfs.openBoard');
  await vscode.commands.executeCommand('planfs.openBacklog');
  await vscode.commands.executeCommand('planfs.openInsights');
}
