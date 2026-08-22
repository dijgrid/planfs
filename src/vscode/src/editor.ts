/**
 * Structured PlanFS entity editor
 */

import * as vscode from 'vscode';
import {
  archiveEntity,
  Entity,
  Epic,
  Decision,
  getRepositoryDevelopers,
  getMilestoneRollup,
  inspectSemanticEntity,
  loadRepository,
  Milestone,
  MilestoneRollup,
  Repository,
  reviewBacklog,
  readFile,
  saveEntity,
  SemanticInspectionCache,
  Task,
  updateTask,
  validateEntity
} from 'planfs-core';
import type {
  SemanticAdvisoryConclusion,
  SemanticInspectionResult
} from 'planfs-core';
import {
  createHelpTopics,
  handleHelpMessage,
  HelpTopic
} from './help';
import { renderEditor } from './editor-view';
import { PlanFSUiPreferences, UI_PREFERENCES } from './preferences';
import { renderMessageDocument } from './webview';
import { getPlanFSWorkspaceFolder } from './workspace';

export interface EditorPayload {
  entity: EditableEntity;
  diagnostics: Array<{ message: string; severity: 'error' | 'warning'; path?: string }>;
  options: {
    epics: Array<{ id: string; title: string }>;
    milestones: Array<{ id: string; title: string }>;
    tasks: Array<{ id: string; title: string }>;
    tags: string[];
    developers: string[];
  };
  epicBoard?: EpicBoardColumn[];
  backlogReadiness?: BacklogReadinessInfo;
  milestoneRollup?: MilestoneRollup;
  semantic: SemanticEditorPayload;
  helpTopics: HelpTopic[];
}

export interface SemanticEditorSuggestion {
  key: string;
  conclusion: SemanticAdvisoryConclusion;
  evidence: string[];
  application: SemanticSuggestionApplication | null;
}

export interface SemanticSuggestionApplication {
  field: 'dependsOn' | 'epic' | 'milestone';
  value: string;
  exactChange: string;
  explanation: string;
}

export interface SemanticEditorPayload {
  inspection: SemanticInspectionResult;
  analysisEnabled: boolean;
  suggestions: SemanticEditorSuggestion[];
  suppressedCount: number;
}

export type EditableEntity = Task | Epic | Milestone | Decision;

export interface EpicBoardTask {
  id: string;
  title: string;
  status: Task['status'];
  priority?: string;
  assignee?: string;
  milestone?: string;
  dueDate?: string;
}

export interface EpicBoardColumn {
  status: Task['status'];
  tasks: EpicBoardTask[];
}

export interface BacklogReadinessInfo {
  needsReview: boolean;
  reasons: string[];
}

interface EditorSession {
  workspaceUri: string;
  loadedUpdatedAt?: string;
  dirty?: boolean;
}

export class EntityEditorProvider {
  private panels = new Map<string, vscode.WebviewPanel>();
  private sessions = new Map<string, EditorSession>();
  private readonly semanticInspectionCache = new SemanticInspectionCache({ capacity: 256 });

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly uiPreferences?: PlanFSUiPreferences
  ) {}

  async open(entityId?: string): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const entity = entityId
        ? findEditableEntity(repository, entityId)
        : await pickEditableEntity(repository);

      if (!entity) {
        return;
      }

      const existingPanel = this.panels.get(entity.id);
      if (existingPanel) {
        existingPanel.reveal(vscode.ViewColumn.One);
        await this.updateCleanPanel(entity.id, existingPanel, repository, entity);
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        'planfsEntityEditor',
        `PlanFS Editor: ${entity.id} — ${workspaceFolder.name}`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [this.extensionUri]
        }
      );

      this.panels.set(entity.id, panel);
      this.sessions.set(entity.id, { workspaceUri: workspaceFolder.uri.toString(), loadedUpdatedAt: entity.updatedAt });
      panel.onDidDispose(() => {
        this.panels.delete(entity.id);
        this.sessions.delete(entity.id);
      });
      panel.webview.onDidReceiveMessage(async message => {
        if (message?.type === 'save') {
          await this.save(String(entity.id), message.entity as EditableEntity, panel);
        }

        if (message?.type === 'openRaw') {
          await this.openSource(String(entity.id));
        }

        if (message?.type === 'openSemanticSource') {
          await this.openSource(String(entity.id), {
            start: Number(message.start),
            end: Number(message.end)
          });
        }

        if (message?.type === 'toggleSemanticAnalysis') {
          await this.toggleSemanticAnalysis(String(entity.id), Boolean(message.enabled), panel);
        }

        if (message?.type === 'dismissSemanticSuggestion') {
          await this.setSemanticSuggestionSuppressed(
            String(entity.id),
            String(message.key),
            true,
            panel
          );
        }

        if (message?.type === 'restoreSemanticSuggestions') {
          await this.restoreSemanticSuggestions(String(entity.id), panel);
        }

        if (message?.type === 'previewSemanticSuggestion') {
          await this.previewSemanticSuggestion(String(entity.id), String(message.key));
        }

        if (message?.type === 'applySemanticSuggestion') {
          await this.applySemanticSuggestion(String(entity.id), String(message.key), panel);
        }

        if (message?.type === 'draftState') {
          const session = this.sessions.get(entity.id);
          if (session) session.dirty = Boolean(message.dirty);
        }

        if (message?.type === 'reload') {
          await this.reload(entity.id, panel);
        }

        if (message?.type === 'retrySave') {
          await this.save(String(entity.id), message.entity as EditableEntity, panel, true);
        }

        if (message?.type === 'openEntity') {
          await this.open(String(message.entityId));
        }

        if (message?.type === 'setMilestoneTask') {
          await this.setMilestoneTask(String(entity.id), String(message.taskId), Boolean(message.assigned), panel);
        }

        if (message?.type === 'archiveEntity' || message?.type === 'archiveTask') {
          await this.archiveEditableEntity(String(entity.id), panel);
        }

        await handleHelpMessage(this.extensionUri, message);
      });
      panel.webview.html = renderEditor(
        panel.webview,
        await createPayload(
          repository,
          entity,
          this.extensionUri,
          this.uiPreferences,
          workspaceFolder,
          this.semanticInspectionCache
        )
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to open PlanFS editor: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async refresh(): Promise<void> {
    if (this.panels.size === 0) {
      return;
    }

    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      for (const panel of this.panels.values()) {
        panel.webview.html = renderMessage('No workspace folder open');
      }
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      for (const [entityId, panel] of this.panels.entries()) {
        const session = this.sessions.get(entityId);
        if (session?.workspaceUri !== workspaceFolder.uri.toString()) continue;
        const entity = findEditableEntity(repository, entityId);
        if (!entity) {
          await panel.webview.postMessage({ type: 'conflict', entityId, reason: 'deleted' });
          continue;
        }
        if (session?.dirty) {
          if (entity.updatedAt !== session.loadedUpdatedAt) {
            await panel.webview.postMessage({ type: 'conflict', entityId, reason: 'changed' });
          }
          continue;
        }
        await this.updateCleanPanel(entityId, panel, repository, entity);
      }
    } catch (error) {
      const message = `Failed to refresh PlanFS editor: ${error instanceof Error ? error.message : String(error)}`;
      for (const panel of this.panels.values()) {
        panel.webview.html = renderMessage(message);
      }
    }
  }

  private async save(
    originalEntityId: string,
    edited: EditableEntity,
    panel: vscode.WebviewPanel,
    allowConflict = false
  ): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    if (edited.id !== originalEntityId) {
      vscode.window.showErrorMessage('Entity IDs cannot be changed from the structured editor');
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const current = findEditableEntity(repository, originalEntityId);

      if (!current) {
        vscode.window.showErrorMessage(`Entity not found: ${originalEntityId}`);
        return;
      }

      const session = this.sessions.get(originalEntityId);
      if (!allowConflict && session && current.updatedAt !== session.loadedUpdatedAt) {
        await panel.webview.postMessage({ type: 'conflict', entityId: originalEntityId, reason: 'changed' });
        return;
      }

      const entity = mergeEditableEntity(current, edited);
      const errors = validateEntity(entity).filter(error => error.severity === 'error');

      if (errors.length > 0) {
        panel.webview.postMessage({
          type: 'validation',
          errors: errors.map(error => error.message)
        });
        return;
      }

      await saveEntity(workspaceFolder.uri.fsPath, entity);
      const refreshed = await loadRepository(workspaceFolder.uri.fsPath);
      const saved = findEditableEntity(refreshed, originalEntityId) ?? entity;
      const updatedSession = this.sessions.get(originalEntityId);
      if (updatedSession) {
        updatedSession.loadedUpdatedAt = saved.updatedAt;
        updatedSession.dirty = false;
      }
      await panel.webview.postMessage({
        type: 'saved',
        payload: await createPayload(
          refreshed,
          saved,
          this.extensionUri,
          this.uiPreferences,
          workspaceFolder,
          this.semanticInspectionCache
        )
      });
      vscode.window.showInformationMessage(`Saved ${entity.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      panel.webview.postMessage({ type: 'validation', errors: [message] });
      vscode.window.showErrorMessage(`Failed to save entity: ${message}`);
    }
  }

  private async updateCleanPanel(
    entityId: string,
    panel: vscode.WebviewPanel,
    repository: Repository,
    entity: EditableEntity
  ): Promise<void> {
    const session = this.sessions.get(entityId);
    if (session) session.loadedUpdatedAt = entity.updatedAt;
    const workspaceFolder = this.workspaceFolderForSession(entityId) ?? getPlanFSWorkspaceFolder();
    if (!workspaceFolder) return;
    await panel.webview.postMessage({
      type: 'updateEditor',
      payload: await createPayload(
        repository,
        entity,
        this.extensionUri,
        this.uiPreferences,
        workspaceFolder,
        this.semanticInspectionCache
      )
    });
  }

  private async reload(entityId: string, panel: vscode.WebviewPanel): Promise<void> {
    const session = this.sessions.get(entityId);
    const workspaceFolder = this.workspaceFolderForSession(entityId);
    if (!session || !workspaceFolder) return;
    const repository = await loadRepository(workspaceFolder.uri.fsPath);
    const entity = findEditableEntity(repository, entityId);
    if (!entity) {
      await panel.webview.postMessage({ type: 'conflict', entityId, reason: 'deleted' });
      return;
    }
    session.dirty = false;
    await this.updateCleanPanel(entityId, panel, repository, entity);
  }

  private async setMilestoneTask(
    milestoneId: string,
    taskId: string,
    assigned: boolean,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) return;
    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const milestone = repository.milestones.get(milestoneId);
      const task = repository.tasks.get(taskId);
      if (!milestone || !task) throw new Error('Milestone or task was not found');
      if (assigned && task.milestone && task.milestone !== milestoneId) {
        const answer = await vscode.window.showWarningMessage(
          `${task.id} is assigned to ${task.milestone}. Move it to ${milestoneId}?`,
          { modal: true },
          'Move task'
        );
        if (answer !== 'Move task') return;
      }
      task.milestone = assigned ? milestoneId : undefined;
      task.metadata = { ...task.metadata };
      if (assigned) {
        task.metadata.milestone = milestoneId;
      } else {
        delete task.metadata.milestone;
      }
      task.updatedAt = new Date().toISOString();
      const errors = validateEntity(task).filter(error => error.severity === 'error');
      if (errors.length > 0) {
        throw new Error(`Task update failed validation: ${errors.map(error => error.message).join('; ')}`);
      }
      await saveEntity(workspaceFolder.uri.fsPath, task);
      const refreshed = await loadRepository(workspaceFolder.uri.fsPath);
      panel.webview.html = renderEditor(
        panel.webview,
        await createPayload(
          refreshed,
          milestone,
          this.extensionUri,
          this.uiPreferences,
          workspaceFolder,
          this.semanticInspectionCache
        )
      );
      vscode.window.showInformationMessage(`${assigned ? 'Added' : 'Removed'} ${task.id} ${assigned ? 'to' : 'from'} ${milestoneId}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update milestone tasks: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async archiveEditableEntity(
    entityId: string,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const workspaceFolder = getPlanFSWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    try {
      const repository = await loadRepository(workspaceFolder.uri.fsPath);
      const entity = findEditableEntity(repository, entityId);
      if (!entity) {
        vscode.window.showErrorMessage(`Entity not found: ${entityId}`);
        return;
      }

      if (entity.type !== 'task' && entity.type !== 'epic') {
        vscode.window.showErrorMessage('Only tasks and epics can be archived from the PlanFS editor.');
        return;
      }

      let includeChildren = false;
      if (entity.type === 'epic') {
        const answer = await vscode.window.showWarningMessage(
          `Archive ${entity.id}? Child tasks can be archived with it.`,
          { modal: true },
          'Archive epic only',
          'Archive epic and tasks'
        );
        if (!answer) {
          return;
        }
        includeChildren = answer === 'Archive epic and tasks';
      } else {
        const answer = await vscode.window.showWarningMessage(
          `Archive ${entity.id}?`,
          { modal: true },
          'Archive'
        );
        if (answer !== 'Archive') {
          return;
        }
      }

      const disposition = entity.status === 'done' ? 'completed' : await pickArchiveDisposition(entity.id);
      if (!disposition) return;
      await archiveEntity(workspaceFolder.uri.fsPath, entity.id, { includeChildren, disposition });
      panel.webview.html = renderMessage(`Archived ${entity.id}`);
      vscode.window.showInformationMessage(`Archived ${entity.id}`);
      await vscode.commands.executeCommand('planfs.refreshExplorer');
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to archive item: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private workspaceFolderForSession(entityId: string): vscode.WorkspaceFolder | undefined {
    const session = this.sessions.get(entityId);
    return session
      ? vscode.workspace.workspaceFolders?.find(folder => folder.uri.toString() === session.workspaceUri)
      : undefined;
  }

  private async semanticPayload(entityId: string): Promise<SemanticEditorPayload | undefined> {
    const workspaceFolder = this.workspaceFolderForSession(entityId);
    if (!workspaceFolder) return undefined;
    const repository = await loadRepository(workspaceFolder.uri.fsPath);
    const entity = findEditableEntity(repository, entityId);
    if (!entity) return undefined;
    return createSemanticEditorPayload(
      repository,
      entity,
      this.uiPreferences,
      workspaceFolder,
      this.semanticInspectionCache
    );
  }

  private async postSemanticPayload(entityId: string, panel: vscode.WebviewPanel): Promise<void> {
    const semantic = await this.semanticPayload(entityId);
    if (semantic) await panel.webview.postMessage({ type: 'updateSemantic', semantic });
  }

  private async toggleSemanticAnalysis(
    entityId: string,
    enabled: boolean,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const workspaceFolder = this.workspaceFolderForSession(entityId);
    if (!workspaceFolder || !this.uiPreferences) return;
    await this.uiPreferences.set(UI_PREFERENCES.semanticAnalysisEnabled, enabled, workspaceFolder);
    await this.postSemanticPayload(entityId, panel);
  }

  private async setSemanticSuggestionSuppressed(
    entityId: string,
    key: string,
    suppressed: boolean,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const workspaceFolder = this.workspaceFolderForSession(entityId);
    if (!workspaceFolder || !this.uiPreferences || !key.startsWith(`${entityId}:`)) return;
    const current = this.uiPreferences.get(
      UI_PREFERENCES.semanticSuggestionSuppressions,
      workspaceFolder
    );
    const next = new Set(current);
    if (suppressed) next.add(key); else next.delete(key);
    await this.uiPreferences.set(
      UI_PREFERENCES.semanticSuggestionSuppressions,
      [...next].sort(),
      workspaceFolder
    );
    await this.postSemanticPayload(entityId, panel);
  }

  private async restoreSemanticSuggestions(
    entityId: string,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const workspaceFolder = this.workspaceFolderForSession(entityId);
    if (!workspaceFolder || !this.uiPreferences) return;
    const current = this.uiPreferences.get(
      UI_PREFERENCES.semanticSuggestionSuppressions,
      workspaceFolder
    );
    await this.uiPreferences.set(
      UI_PREFERENCES.semanticSuggestionSuppressions,
      current.filter(key => !key.startsWith(`${entityId}:`)),
      workspaceFolder
    );
    await this.postSemanticPayload(entityId, panel);
  }

  private async previewSemanticSuggestion(entityId: string, key: string): Promise<void> {
    const semantic = await this.semanticPayload(entityId);
    const suggestion = semantic?.suggestions.find(candidate => candidate.key === key);
    if (!suggestion || !suggestion.conclusion.repair.previewable) return;
    const field = suggestion.conclusion.data.suggestedField;
    const targetId = suggestion.conclusion.data.targetId;
    const preview = field && targetId
      ? `Preview only — ${field}: ${targetId}. Review existing frontmatter values before applying.`
      : `Preview only — ${suggestion.conclusion.repair.summary}`;
    const action = await vscode.window.showInformationMessage(
      `${preview} PlanFS has not changed the file.`,
      { modal: true },
      'Open source'
    );
    if (action === 'Open source') {
      await this.openSource(entityId, {
        start: suggestion.conclusion.range.start.offset,
        end: suggestion.conclusion.range.end.offset
      });
    }
  }

  private async applySemanticSuggestion(
    entityId: string,
    key: string,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const workspaceFolder = this.workspaceFolderForSession(entityId);
    const session = this.sessions.get(entityId);
    if (!workspaceFolder || !session) return;
    if (session.dirty) {
      vscode.window.showWarningMessage('Save or reload your current draft before applying a semantic suggestion.');
      return;
    }

    try {
      let repository = await loadRepository(workspaceFolder.uri.fsPath);
      let entity = findEditableEntity(repository, entityId);
      if (!entity) return;
      if (entity.updatedAt !== session.loadedUpdatedAt) {
        await panel.webview.postMessage({ type: 'conflict', entityId, reason: 'changed' });
        return;
      }

      let semantic = await createSemanticEditorPayload(
        repository,
        entity,
        this.uiPreferences,
        workspaceFolder,
        this.semanticInspectionCache
      );
      let suggestion = semantic.suggestions.find(candidate => candidate.key === key);
      if (!suggestion?.application || entity.type !== 'task') return;
      const application = suggestion.application;
      const evidence = suggestion.evidence.length > 0
        ? ` Evidence: ${suggestion.evidence.join(' · ')}.`
        : '';
      const answer = await vscode.window.showWarningMessage(
        `${application.explanation}${evidence} Proposed authoritative change: ${application.exactChange}. ` +
          'The analyzer remains advisory; this edit happens only because you choose Apply.',
        { modal: true },
        'Apply metadata change',
        'Open source'
      );
      if (answer === 'Open source') {
        await this.openSource(entityId, {
          start: suggestion.conclusion.range.start.offset,
          end: suggestion.conclusion.range.end.offset
        });
        return;
      }
      if (answer !== 'Apply metadata change') return;

      repository = await loadRepository(workspaceFolder.uri.fsPath);
      entity = findEditableEntity(repository, entityId);
      if (!entity || entity.type !== 'task' || entity.updatedAt !== session.loadedUpdatedAt) {
        await panel.webview.postMessage({ type: 'conflict', entityId, reason: entity ? 'changed' : 'deleted' });
        return;
      }
      semantic = await createSemanticEditorPayload(
        repository,
        entity,
        this.uiPreferences,
        workspaceFolder,
        this.semanticInspectionCache
      );
      suggestion = semantic.suggestions.find(candidate => candidate.key === key);
      if (!suggestion?.application || !sameApplication(application, suggestion.application)) {
        throw new Error('The suggestion changed while it was being reviewed. Refresh and review it again.');
      }

      const patch = application.field === 'dependsOn'
        ? { dependsOn: [...(entity.dependsOn ?? []), application.value] }
        : application.field === 'epic'
          ? { epic: application.value }
          : { milestone: application.value };
      const result = await updateTask(workspaceFolder.uri.fsPath, repository, {
        id: entity.id,
        patch,
        expectedUpdatedAt: session.loadedUpdatedAt ?? null,
        validationScope: 'repository'
      });
      session.loadedUpdatedAt = result.task.updatedAt;
      session.dirty = false;
      const refreshed = await loadRepository(workspaceFolder.uri.fsPath);
      const saved = refreshed.tasks.get(entity.id) ?? result.task;
      await panel.webview.postMessage({
        type: 'saved',
        payload: await createPayload(
          refreshed,
          saved,
          this.extensionUri,
          this.uiPreferences,
          workspaceFolder,
          this.semanticInspectionCache
        )
      });
      vscode.window.showInformationMessage(`Applied ${application.field} metadata to ${entity.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      panel.webview.postMessage({ type: 'validation', errors: [message] });
      vscode.window.showErrorMessage(`Failed to apply semantic suggestion: ${message}`);
    }
  }

  private async openSource(
    entityId: string,
    range?: { start: number; end: number }
  ): Promise<void> {
    const workspaceFolder = this.workspaceFolderForSession(entityId);
    if (!workspaceFolder) return;
    const repository = await loadRepository(workspaceFolder.uri.fsPath);
    const entity = findEntity(repository, entityId);
    if (!entity) return;
    const document = await vscode.workspace.openTextDocument(entity.filePath);
    if (!range || !Number.isFinite(range.start) || !Number.isFinite(range.end)) {
      await vscode.window.showTextDocument(document, { preview: false });
      return;
    }
    const content = await readFile(entity.filePath);
    const bodyStart = locateBodyStart(content, entity.body);
    const start = positionAt(content, bodyStart + range.start);
    const end = positionAt(content, bodyStart + Math.max(range.start, range.end));
    await vscode.window.showTextDocument(document, {
      preview: false,
      selection: new vscode.Range(start, end)
    });
  }

}

async function pickArchiveDisposition(entityId: string): Promise<'cancelled' | 'duplicate' | 'deferred' | 'superseded' | undefined> {
  const selected = await vscode.window.showQuickPick([
    { label: 'Cancelled', value: 'cancelled' as const }, { label: 'Duplicate', value: 'duplicate' as const },
    { label: 'Deferred', value: 'deferred' as const }, { label: 'Superseded', value: 'superseded' as const }
  ], { title: `Why archive unfinished ${entityId}?`, placeHolder: 'Choose an archive disposition' });
  return selected?.value;
}

function renderMessage(message: string): string {
  return renderMessageDocument('PlanFS Entity Editor', message);
}

async function pickEditableEntity(
  repository: Repository
): Promise<EditableEntity | undefined> {
  const items = [
    ...Array.from(repository.tasks.values()),
    ...Array.from(repository.epics.values()),
    ...Array.from(repository.milestones.values()),
    ...Array.from(repository.decisions.values())
  ].map(entity => ({
    label: entity.id,
    description: entity.title,
    detail: entity.type,
    entity
  }));

  const selected = await vscode.window.showQuickPick(items, {
    title: 'Open PlanFS Structured Editor',
    placeHolder: 'Select a task, epic, milestone, or decision'
  });

  return selected?.entity;
}

function findEntity(repository: Repository, entityId: string): Entity | undefined {
  return repository.tasks.get(entityId)
    ?? repository.epics.get(entityId)
    ?? repository.milestones.get(entityId)
    ?? repository.decisions.get(entityId);
}

function findEditableEntity(
  repository: Repository,
  entityId: string
): EditableEntity | undefined {
  return repository.tasks.get(entityId)
    ?? repository.epics.get(entityId)
    ?? repository.milestones.get(entityId)
    ?? repository.decisions.get(entityId);
}

async function createPayload(
  repository: Repository,
  entity: EditableEntity,
  extensionUri: vscode.Uri,
  uiPreferences: PlanFSUiPreferences | undefined,
  workspaceFolder: vscode.WorkspaceFolder,
  semanticInspectionCache?: SemanticInspectionCache
): Promise<EditorPayload> {
  const tags = new Set<string>();
  for (const task of repository.tasks.values()) {
    for (const tag of task.tags ?? []) {
      tags.add(tag);
    }
  }
  for (const epic of repository.epics.values()) {
    for (const tag of epic.tags ?? []) {
      tags.add(tag);
    }
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
      epics: Array.from(repository.epics.values()).map(epic => ({
        id: epic.id,
        title: epic.title
      })),
      milestones: Array.from(repository.milestones.values()).map(milestone => ({
        id: milestone.id,
        title: milestone.title
      })),
      tasks: Array.from(repository.tasks.values()).map(task => ({
        id: task.id,
        title: task.title
      })),
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

  if (entity.type === 'epic') {
    payload.epicBoard = createEpicBoard(repository, entity.id);
  }

  if (entity.type === 'task') {
    payload.backlogReadiness = createBacklogReadinessInfo(repository, entity.id);
  }

  if (entity.type === 'milestone') {
    payload.milestoneRollup = getMilestoneRollup(repository, entity.id);
  }

  return payload;
}

async function createSemanticEditorPayload(
  repository: Repository,
  entity: EditableEntity,
  uiPreferences: PlanFSUiPreferences | undefined,
  workspaceFolder: vscode.WorkspaceFolder,
  semanticInspectionCache?: SemanticInspectionCache
): Promise<SemanticEditorPayload> {
  const analysisEnabled = uiPreferences?.get(
    UI_PREFERENCES.semanticAnalysisEnabled,
    workspaceFolder
  ) ?? true;
  const suppressed = new Set(uiPreferences?.get(
    UI_PREFERENCES.semanticSuggestionSuppressions,
    workspaceFolder
  ) ?? []);
  const inspectionOptions = {
    tier: 'automation-ready',
    analysis: analysisEnabled,
    language: 'en'
  } as const;
  const inspection = semanticInspectionCache
    ? await semanticInspectionCache.inspect(entity, inspectionOptions)
    : await inspectSemanticEntity(entity, inspectionOptions);
  const suggestions = inspection.advisory.conclusions.map(conclusion => {
    const key = semanticSuggestionKey(entity.id, conclusion);
    const evidence = inspection.analysis?.signals
      .filter(signal => conclusion.signalKinds.includes(signal.kind) && signalMatchesConclusion(signal, conclusion))
      .flatMap(signal => signal.evidence.map(item => item.text)) ?? [];
    return {
      key,
      conclusion,
      evidence: [...new Set(evidence)],
      application: createSemanticSuggestionApplication(repository, entity, conclusion)
    };
  });
  return {
    inspection,
    analysisEnabled,
    suggestions: suggestions.filter(suggestion => !suppressed.has(suggestion.key)),
    suppressedCount: suggestions.filter(suggestion => suppressed.has(suggestion.key)).length
  };
}

function createSemanticSuggestionApplication(
  repository: Repository,
  entity: EditableEntity,
  conclusion: SemanticAdvisoryConclusion
): SemanticSuggestionApplication | null {
  if (entity.type !== 'task' || conclusion.code !== 'analysis.relationship.metadata-missing') return null;
  const field = conclusion.data.suggestedField;
  const value = conclusion.data.targetId;
  if ((field !== 'dependsOn' && field !== 'epic' && field !== 'milestone') || typeof value !== 'string') {
    return null;
  }
  if (field === 'dependsOn') {
    if (!repository.tasks.has(value) || entity.dependsOn?.includes(value)) return null;
    return {
      field,
      value,
      exactChange: `append ${value} to dependsOn`,
      explanation: `${value} was found near dependency wording in this task's Markdown.`
    };
  }
  const targetExists = field === 'epic' ? repository.epics.has(value) : repository.milestones.has(value);
  if (!targetExists || entity[field]) return null;
  return {
    field,
    value,
    exactChange: `set ${field} to ${value}`,
    explanation: `${value} was found near parent relationship wording in this task's Markdown.`
  };
}

function sameApplication(
  left: SemanticSuggestionApplication,
  right: SemanticSuggestionApplication
): boolean {
  return left.field === right.field && left.value === right.value;
}

function semanticSuggestionKey(entityId: string, conclusion: SemanticAdvisoryConclusion): string {
  const identity = conclusion.data.targetId ?? conclusion.data.criterionId ?? conclusion.range.start.offset;
  return `${entityId}:${conclusion.code}:${String(identity)}`;
}

function signalMatchesConclusion(
  signal: { data: Record<string, string | number | boolean | null> },
  conclusion: SemanticAdvisoryConclusion
): boolean {
  if (conclusion.data.targetId) return signal.data.targetId === conclusion.data.targetId;
  if (conclusion.data.criterionId) return signal.data.criterionId === conclusion.data.criterionId;
  return false;
}

function locateBodyStart(content: string, body: string): number {
  if (!body) return content.length;
  const firstDelimiterEnd = content.indexOf('\n---', 3);
  const searchStart = firstDelimiterEnd >= 0 ? firstDelimiterEnd + 4 : 0;
  const bodyStart = content.indexOf(body, searchStart);
  return bodyStart >= 0 ? bodyStart : searchStart;
}

function positionAt(content: string, offset: number): vscode.Position {
  const bounded = Math.max(0, Math.min(offset, content.length));
  const prefix = content.slice(0, bounded);
  const lastNewline = prefix.lastIndexOf('\n');
  const line = prefix.split('\n').length - 1;
  const character = bounded - (lastNewline + 1);
  return new vscode.Position(line, character);
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

function mergeEditableEntity(
  current: EditableEntity,
  edited: EditableEntity
): EditableEntity {
  const next = {
    ...current,
    ...edited,
    filePath: current.filePath,
    metadata: current.metadata,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString()
  } as EditableEntity;

  return removeEmptyFields(next);
}

function removeEmptyFields<T extends EditableEntity>(entity: T): T {
  const copy = { ...entity } as Record<string, unknown>;
  for (const [key, value] of Object.entries(copy)) {
    if (
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && value !== null && Object.keys(value).length === 0)
    ) {
      delete copy[key];
    }
  }
  return copy as T;
}
