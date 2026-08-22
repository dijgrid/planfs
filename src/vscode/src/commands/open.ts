/**
 * Open task command
 */

import * as vscode from 'vscode';
import { TreeItem } from '../explorer';

export async function openTaskCommand(item: TreeItem | undefined): Promise<void> {
  if (!item?.entity) {
    vscode.window.showErrorMessage('Open Markdown is available from a task in the PlanFS Explorer.');
    return;
  }

  try {
    const filePath = item.entity.filePath;
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to open task: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
