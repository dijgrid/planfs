import {
  inspectSemanticEntity,
  Repository,
  SemanticInspectionCache
} from 'planfs-core';
import type { SemanticAdvisoryConclusion } from 'planfs-core';
import { PlanFSUiPreferences, UI_PREFERENCES } from './preferences';
import type {
  EditableEntity,
  SemanticEditorPayload,
  SemanticSuggestionApplication
} from './editor-types';
import type * as vscode from 'vscode';

export async function createSemanticEditorPayload(
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

export function sameSemanticSuggestionApplication(
  left: SemanticSuggestionApplication,
  right: SemanticSuggestionApplication
): boolean {
  return left.field === right.field && left.value === right.value;
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
