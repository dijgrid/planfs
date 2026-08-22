import type * as vscode from 'vscode';
import {
  getMilestoneRollup,
  getRepositoryDevelopers,
  Repository,
  reviewBacklog,
  SemanticInspectionCache,
  Task,
  validateEntity
} from 'planfs-core';
import { createHelpTopics } from './help';
import { createSemanticEditorPayload } from './editor-semantic';
import type {
  BacklogReadinessInfo,
  EditableEntity,
  EditorPayload,
  EpicBoardColumn
} from './editor-types';
import { PlanFSUiPreferences } from './preferences';

export async function createEditorPayload(
  repository: Repository,
  entity: EditableEntity,
  extensionUri: vscode.Uri,
  uiPreferences: PlanFSUiPreferences | undefined,
  workspaceFolder: vscode.WorkspaceFolder,
  semanticInspectionCache?: SemanticInspectionCache
): Promise<EditorPayload> {
  const tags = new Set<string>();
  for (const task of repository.tasks.values()) {
    for (const tag of task.tags ?? []) tags.add(tag);
  }
  for (const epic of repository.epics.values()) {
    for (const tag of epic.tags ?? []) tags.add(tag);
  }

  const developers = await getRepositoryDevelopers(repository.root);
  const payload: EditorPayload = {
    entity,
    diagnostics: validateEntity(entity).map(diagnostic => ({
      message: diagnostic.message,
      severity: diagnostic.severity,
      path: diagnostic.path
    })),
    options: {
      epics: Array.from(repository.epics.values()).map(epic => ({ id: epic.id, title: epic.title })),
      milestones: Array.from(repository.milestones.values()).map(milestone => ({
        id: milestone.id,
        title: milestone.title
      })),
      tasks: Array.from(repository.tasks.values()).map(task => ({ id: task.id, title: task.title })),
      tags: Array.from(tags).sort(),
      developers: developers.map(developer => developer.label)
    },
    semantic: await createSemanticEditorPayload(
      repository,
      entity,
      uiPreferences,
      workspaceFolder,
      semanticInspectionCache
    ),
    helpTopics: createHelpTopics(extensionUri, ['editor'])
  };

  if (entity.type === 'epic') payload.epicBoard = createEpicBoard(repository, entity.id);
  if (entity.type === 'task') payload.backlogReadiness = createBacklogReadinessInfo(repository, entity.id);
  if (entity.type === 'milestone') payload.milestoneRollup = getMilestoneRollup(repository, entity.id);

  return payload;
}

function createBacklogReadinessInfo(
  repository: Repository,
  taskId: string
): BacklogReadinessInfo {
  const reviewItem = reviewBacklog(repository).find(item => item.task.id === taskId);
  return {
    needsReview: Boolean(reviewItem),
    reasons: reviewItem?.reasons ?? []
  };
}

function createEpicBoard(repository: Repository, epicId: string): EpicBoardColumn[] {
  const statuses: Array<Task['status']> = ['todo', 'in-progress', 'review', 'done'];
  const tasks = Array.from(repository.tasks.values())
    .filter(task => task.epic === epicId)
    .sort((a, b) => statusIndex(a.status) - statusIndex(b.status) || a.id.localeCompare(b.id));

  return statuses.map(status => ({
    status,
    tasks: tasks
      .filter(task => task.status === status)
      .map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        milestone: task.milestone,
        dueDate: task.dueDate
      }))
  }));
}

function statusIndex(status: Task['status']): number {
  return ['todo', 'in-progress', 'review', 'done'].indexOf(status);
}
