/**
 * Create commands
 */

import * as vscode from 'vscode';
import { ExplorerProvider } from '../explorer';
import {
  createEpicTemplate,
  createMilestoneTemplate,
  createTaskTemplate,
  getNextEpicId,
  getNextMilestoneId,
  getNextTaskId,
  loadRepository,
  saveEntity
} from 'planfs-core';
import { getPlanFSWorkspaceFolder } from '../workspace';

export async function createTaskCommand(explorer: ExplorerProvider): Promise<void> {
  await createEntityCommand(explorer, {
    kind: 'task',
    titlePrompt: 'Enter task title',
    titlePlaceholder: 'e.g., Implement login endpoint',
    create: context => {
      const id = getNextTaskId(context.repository);
      return { id, entity: createTaskTemplate(id, context.title) };
    }
  });
}

export async function createEpicCommand(explorer: ExplorerProvider): Promise<void> {
  await createEntityCommand(explorer, {
    kind: 'epic',
    titlePrompt: 'Enter epic title',
    titlePlaceholder: 'e.g., Improve release workflow',
    create: repository => {
      const id = getNextEpicId(repository.repository, repository.title);
      return { id, entity: createEpicTemplate(id, repository.title) };
    }
  });
}

export async function createMilestoneCommand(explorer: ExplorerProvider): Promise<void> {
  await createEntityCommand(explorer, {
    kind: 'milestone',
    titlePrompt: 'Enter milestone title',
    titlePlaceholder: 'e.g., Public beta',
    collectDetails: async () => {
      const targetDate = await vscode.window.showInputBox({
        prompt: 'Enter target date',
        placeHolder: 'YYYY-MM-DD',
        validateInput: value => /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? undefined
          : 'Use YYYY-MM-DD'
      });
      return targetDate ? { targetDate } : undefined;
    },
    create: context => {
      const id = getNextMilestoneId(context.repository, context.title);
      return { id, entity: createMilestoneTemplate(id, context.title, context.targetDate ?? '') };
    }
  });
}

interface CreateEntityContext {
  repository: Awaited<ReturnType<typeof loadRepository>>;
  title: string;
  targetDate?: string;
}

interface CreateEntityOptions {
  kind: 'task' | 'epic' | 'milestone';
  titlePrompt: string;
  titlePlaceholder: string;
  collectDetails?(): Promise<Partial<CreateEntityContext> | undefined>;
  create(context: CreateEntityContext): { id: string; entity: Parameters<typeof saveEntity>[1] };
}

async function createEntityCommand(
  explorer: ExplorerProvider,
  options: CreateEntityOptions
): Promise<void> {
  const workspaceFolder = getPlanFSWorkspaceFolder();
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const title = await vscode.window.showInputBox({
    prompt: options.titlePrompt,
    placeHolder: options.titlePlaceholder
  });

  if (!title) {
    return;
  }

  const details = await options.collectDetails?.();
  if (options.collectDetails && !details) {
    return;
  }

  try {
    const repository = await loadRepository(workspaceFolder.uri.fsPath);
    const { id, entity } = options.create({ repository, title, ...details });

    await saveEntity(workspaceFolder.uri.fsPath, entity);

    vscode.window.showInformationMessage(`Created ${options.kind}: ${id}`);
    await explorer.refresh();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to create ${options.kind}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
