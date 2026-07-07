/**
 * VS Code extension entry point
 */

import * as vscode from 'vscode';
import { BacklogProvider } from './backlog';
import { ArchiveProvider, archiveExplorerItem } from './archive';
import { BoardProvider } from './board';
import { PlanFSDecorationProvider } from './decorations';
import { EntityEditorProvider } from './editor';
import { ExplorerProvider } from './explorer';
import { InsightsProvider } from './insights';
import { PlanFSUiPreferences } from './preferences';
import { createTaskCommand, createEpicCommand, createMilestoneCommand } from './commands/create';
import { initializeRepositoryCommand } from './commands/init';
import { openTaskCommand } from './commands/open';
import { selectPlanFSWorkspaceFolderForUri } from './workspace';

let explorerProvider: ExplorerProvider;
let backlogProvider: BacklogProvider;
let archiveProvider: ArchiveProvider;
let boardProvider: BoardProvider;
let insightsProvider: InsightsProvider;
let editorProvider: EntityEditorProvider;
let refreshQueue = Promise.resolve();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('PlanFS extension activated');

  // Initialize explorer
  const uiPreferences = new PlanFSUiPreferences(context.globalState);
  explorerProvider = new ExplorerProvider();
  backlogProvider = new BacklogProvider(context.extensionUri, uiPreferences);
  archiveProvider = new ArchiveProvider(context.extensionUri);
  boardProvider = new BoardProvider(context.extensionUri, uiPreferences);
  insightsProvider = new InsightsProvider(context.extensionUri);
  editorProvider = new EntityEditorProvider(context.extensionUri);
  vscode.window.registerTreeDataProvider('planfs-explorer', explorerProvider);
  context.subscriptions.push(vscode.window.registerFileDecorationProvider(new PlanFSDecorationProvider()));

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('planfs.openBoard', () => boardProvider.open()),
    vscode.commands.registerCommand('planfs.openNextWorkBoard', () => boardProvider.open('next-work')),
    vscode.commands.registerCommand('planfs.openBacklog', () => backlogProvider.open()),
    vscode.commands.registerCommand('planfs.openArchive', () => archiveProvider.open()),
    vscode.commands.registerCommand('planfs.archiveItem', async (item) => {
      await archiveExplorerItem(item);
      await refreshViews();
    }),
    vscode.commands.registerCommand('planfs.openInsights', () => insightsProvider.open()),
    vscode.commands.registerCommand('planfs.initializeRepository', () => initializeRepositoryCommand(explorerProvider)),
    vscode.commands.registerCommand('planfs.createTask', () => createTaskCommand(explorerProvider)),
    vscode.commands.registerCommand('planfs.createEpic', () => createEpicCommand(explorerProvider)),
    vscode.commands.registerCommand('planfs.createMilestone', () => createMilestoneCommand(explorerProvider)),
    vscode.commands.registerCommand('planfs.openTask', (item) => openTaskCommand(item)),
    vscode.commands.registerCommand('planfs.openEditor', (item) => editorProvider.open(resolveEditorEntityId(item))),
    vscode.commands.registerCommand('planfs.applySavedFilter', () => explorerProvider.applySavedFilter()),
    vscode.commands.registerCommand('planfs.clearSavedFilter', () => explorerProvider.clearSavedFilter()),
    vscode.commands.registerCommand('planfs.refreshExplorer', () => refreshViews())
  );

  // Watch for file changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/.planfs/**/*.md');
  const savedFilterWatcher = vscode.workspace.createFileSystemWatcher('**/.planfs/**/*.json');
  watcher.onDidCreate(uri => queueRefreshViews(uri));
  watcher.onDidChange(uri => queueRefreshViews(uri));
  watcher.onDidDelete(uri => queueRefreshViews(uri));
  savedFilterWatcher.onDidCreate(uri => queueRefreshViews(uri));
  savedFilterWatcher.onDidChange(uri => queueRefreshViews(uri));
  savedFilterWatcher.onDidDelete(uri => queueRefreshViews(uri));

  context.subscriptions.push(watcher, savedFilterWatcher);

  // Initial load
  await explorerProvider.refresh();
}

async function refreshViews(): Promise<void> {
  await explorerProvider.refresh();
  await backlogProvider.refresh();
  await archiveProvider.refresh();
  await boardProvider.refresh();
  await insightsProvider.refresh();
  await editorProvider.refresh();
}

function queueRefreshViews(changedUri?: vscode.Uri): void {
  if (changedUri) {
    selectPlanFSWorkspaceFolderForUri(changedUri);
  }

  refreshQueue = refreshQueue
    .then(refreshViews)
    .catch(error => {
      console.error('Failed to refresh PlanFS views:', error);
    });
}

export function deactivate(): void {
  console.log('PlanFS extension deactivated');
}

function resolveEditorEntityId(item: unknown): string | undefined {
  if (typeof item === 'string') {
    return item;
  }

  if (item && typeof item === 'object') {
    const candidate = item as { entity?: { id?: unknown }; id?: unknown };
    const id = candidate.entity?.id ?? candidate.id;
    return typeof id === 'string' ? id : undefined;
  }

  return undefined;
}
