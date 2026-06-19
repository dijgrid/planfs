/**
 * VS Code extension entry point
 */

import * as vscode from 'vscode';
import { BoardProvider } from './board';
import { PlanFSDecorationProvider } from './decorations';
import { EntityEditorProvider } from './editor';
import { ExplorerProvider } from './explorer';
import { InsightsProvider } from './insights';
import { createTaskCommand, createEpicCommand, createMilestoneCommand } from './commands/create';
import { initializeRepositoryCommand } from './commands/init';
import { openTaskCommand } from './commands/open';

let explorerProvider: ExplorerProvider;
let boardProvider: BoardProvider;
let insightsProvider: InsightsProvider;
let editorProvider: EntityEditorProvider;
let refreshQueue = Promise.resolve();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('PlanFS extension activated');

  // Initialize explorer
  explorerProvider = new ExplorerProvider();
  boardProvider = new BoardProvider(context.extensionUri);
  insightsProvider = new InsightsProvider(context.extensionUri);
  editorProvider = new EntityEditorProvider(context.extensionUri);
  vscode.window.registerTreeDataProvider('planfs-explorer', explorerProvider);
  context.subscriptions.push(vscode.window.registerFileDecorationProvider(new PlanFSDecorationProvider()));

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('planfs.openBoard', () => boardProvider.open()),
    vscode.commands.registerCommand('planfs.openInsights', () => insightsProvider.open()),
    vscode.commands.registerCommand('planfs.initializeRepository', () => initializeRepositoryCommand(explorerProvider)),
    vscode.commands.registerCommand('planfs.createTask', () => createTaskCommand(explorerProvider)),
    vscode.commands.registerCommand('planfs.createEpic', () => createEpicCommand()),
    vscode.commands.registerCommand('planfs.createMilestone', () => createMilestoneCommand()),
    vscode.commands.registerCommand('planfs.openTask', (item) => openTaskCommand(item)),
    vscode.commands.registerCommand('planfs.openEditor', (item) => editorProvider.open(item?.entity?.id)),
    vscode.commands.registerCommand('planfs.applySavedFilter', () => explorerProvider.applySavedFilter()),
    vscode.commands.registerCommand('planfs.clearSavedFilter', () => explorerProvider.clearSavedFilter()),
    vscode.commands.registerCommand('planfs.refreshExplorer', () => refreshViews())
  );

  // Watch for file changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/.planfs/**/*.md');
  const savedFilterWatcher = vscode.workspace.createFileSystemWatcher('**/.planfs/**/*.json');
  watcher.onDidCreate(() => queueRefreshViews());
  watcher.onDidChange(() => queueRefreshViews());
  watcher.onDidDelete(() => queueRefreshViews());
  savedFilterWatcher.onDidCreate(() => queueRefreshViews());
  savedFilterWatcher.onDidChange(() => queueRefreshViews());
  savedFilterWatcher.onDidDelete(() => queueRefreshViews());

  context.subscriptions.push(watcher, savedFilterWatcher);

  // Initial load
  await explorerProvider.refresh();
}

async function refreshViews(): Promise<void> {
  await explorerProvider.refresh();
  await boardProvider.refresh();
  await insightsProvider.refresh();
}

function queueRefreshViews(): void {
  refreshQueue = refreshQueue
    .then(refreshViews)
    .catch(error => {
      console.error('Failed to refresh PlanFS views:', error);
    });
}

export function deactivate(): void {
  console.log('PlanFS extension deactivated');
}
