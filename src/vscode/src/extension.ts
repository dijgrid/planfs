/**
 * VS Code extension entry point
 */

import * as vscode from 'vscode';
import { ExplorerProvider } from './explorer';
import { createTaskCommand, createEpicCommand, createMilestoneCommand } from './commands/create';
import { openTaskCommand } from './commands/open';

let explorerProvider: ExplorerProvider;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('PlanFS extension activated');

  // Initialize explorer
  explorerProvider = new ExplorerProvider();
  vscode.window.registerTreeDataProvider('planfs-explorer', explorerProvider);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('planfs.createTask', () => createTaskCommand(explorerProvider)),
    vscode.commands.registerCommand('planfs.createEpic', () => createEpicCommand()),
    vscode.commands.registerCommand('planfs.createMilestone', () => createMilestoneCommand()),
    vscode.commands.registerCommand('planfs.openTask', (item) => openTaskCommand(item)),
    vscode.commands.registerCommand('planfs.refreshExplorer', () => explorerProvider.refresh())
  );

  // Watch for file changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/.planfs/**/*.md');
  watcher.onDidCreate(() => explorerProvider.refresh());
  watcher.onDidChange(() => explorerProvider.refresh());
  watcher.onDidDelete(() => explorerProvider.refresh());

  context.subscriptions.push(watcher);

  // Initial load
  await explorerProvider.refresh();
}

export function deactivate(): void {
  console.log('PlanFS extension deactivated');
}
