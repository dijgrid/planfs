/**
 * VS Code extension entry point
 */

import * as vscode from 'vscode';
import { BoardProvider } from './board';
import { ExplorerProvider } from './explorer';
import { createTaskCommand, createEpicCommand, createMilestoneCommand } from './commands/create';
import { openTaskCommand } from './commands/open';

let explorerProvider: ExplorerProvider;
let boardProvider: BoardProvider;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('PlanFS extension activated');

  // Initialize explorer
  explorerProvider = new ExplorerProvider();
  boardProvider = new BoardProvider(context.extensionUri);
  vscode.window.registerTreeDataProvider('planfs-explorer', explorerProvider);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('planfs.openBoard', () => boardProvider.open()),
    vscode.commands.registerCommand('planfs.createTask', () => createTaskCommand(explorerProvider)),
    vscode.commands.registerCommand('planfs.createEpic', () => createEpicCommand()),
    vscode.commands.registerCommand('planfs.createMilestone', () => createMilestoneCommand()),
    vscode.commands.registerCommand('planfs.openTask', (item) => openTaskCommand(item)),
    vscode.commands.registerCommand('planfs.refreshExplorer', () => explorerProvider.refresh())
  );

  // Watch for file changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/.planfs/**/*.md');
  watcher.onDidCreate(() => refreshViews());
  watcher.onDidChange(() => refreshViews());
  watcher.onDidDelete(() => refreshViews());

  context.subscriptions.push(watcher);

  // Initial load
  await explorerProvider.refresh();
}

async function refreshViews(): Promise<void> {
  await explorerProvider.refresh();
  await boardProvider.refresh();
}

export function deactivate(): void {
  console.log('PlanFS extension deactivated');
}
