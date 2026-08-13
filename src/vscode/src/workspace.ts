/**
 * Shared PlanFS workspace selection.
 */

import * as vscode from 'vscode';

let activeWorkspaceFolderUri: string | undefined;

export function getPlanFSWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    activeWorkspaceFolderUri = undefined;
    return undefined;
  }

  if (activeWorkspaceFolderUri) {
    const active = folders.find(folder => folder.uri.toString() === activeWorkspaceFolderUri);
    if (active) {
      return active;
    }
  }

  activeWorkspaceFolderUri = folders[0].uri.toString();
  return folders[0];
}

export function selectPlanFSWorkspaceFolderForUri(uri: vscode.Uri): vscode.WorkspaceFolder | undefined {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (folder) {
    activeWorkspaceFolderUri = folder.uri.toString();
  }

  return folder;
}

export function selectPlanFSWorkspaceFolder(folder: vscode.WorkspaceFolder): void {
  activeWorkspaceFolderUri = folder.uri.toString();
}

export async function choosePlanFSWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) return undefined;
  if (folders.length === 1) {
    selectPlanFSWorkspaceFolder(folders[0]);
    return folders[0];
  }
  const picked = await vscode.window.showQuickPick(folders.map(folder => ({ label: folder.name, description: folder.uri.fsPath, folder })), {
    title: 'Choose PlanFS repository', placeHolder: 'Commands and new views use this repository'
  });
  if (picked) selectPlanFSWorkspaceFolder(picked.folder);
  return picked?.folder;
}
