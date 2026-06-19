/**
 * Initialize PlanFS command
 */

import * as vscode from 'vscode';
import { initializeRepository } from 'planfs-core';
import { ExplorerProvider } from '../explorer';
import { getPlanFSWorkspaceFolder } from '../workspace';

export async function initializeRepositoryCommand(
  explorer: ExplorerProvider
): Promise<void> {
  const workspaceFolder = getPlanFSWorkspaceFolder();
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  try {
    const result = await initializeRepository(workspaceFolder.uri.fsPath);
    await explorer.refresh();

    const created = result.created.length;
    const existing = result.existing.length;
    vscode.window.showInformationMessage(
      `PlanFS initialized: ${created} created, ${existing} already existed`
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to initialize PlanFS: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
