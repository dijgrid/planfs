/**
 * Create commands
 */

import * as vscode from 'vscode';
import { ExplorerProvider } from '../explorer';
import { loadRepository, saveEntity, createTaskTemplate, getNextTaskId } from 'planfs-core';
import { getPlanFSWorkspaceFolder } from '../workspace';

export async function createTaskCommand(explorer: ExplorerProvider): Promise<void> {
  const workspaceFolder = getPlanFSWorkspaceFolder();
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const title = await vscode.window.showInputBox({
    prompt: 'Enter task title',
    placeHolder: 'e.g., Implement login endpoint'
  });

  if (!title) {
    return;
  }

  try {
    const repo = await loadRepository(workspaceFolder.uri.fsPath);
    const taskId = getNextTaskId(repo);
    const task = createTaskTemplate(taskId, title);

    await saveEntity(workspaceFolder.uri.fsPath, task);

    vscode.window.showInformationMessage(`Created task: ${taskId}`);
    await explorer.refresh();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to create task: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function createEpicCommand(): Promise<void> {
  vscode.window.showInformationMessage('Epic creation coming soon');
}

export async function createMilestoneCommand(): Promise<void> {
  vscode.window.showInformationMessage('Milestone creation coming soon');
}
