import type {
  Decision,
  Epic,
  Milestone,
  MilestoneRollup,
  SemanticAdvisoryConclusion,
  SemanticInspectionResult,
  Task
} from 'planfs-core';
import type { HelpTopic } from './help';

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
