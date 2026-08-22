/** Compact semantic planning context shared by agent and human workflows. */

import { explainNextWork, getTaskReadiness, TaskReadinessResult } from './next-work';
import { getAllEntities } from './repository';
import {
  inspectSemanticEntity,
  SemanticAdvisoryConclusion,
  SemanticInspectionOptions
} from './semantic-inspection';
import {
  EntityMention,
  AnalyzerResult,
  SemanticCriterion,
  SemanticDecisionStatement,
  SemanticDiagnostic,
  SemanticFinding,
  SemanticQuestion,
  SemanticReference,
  SemanticProvenance,
  SourceRange
} from './semantic-types';
import { Entity, Repository, Task } from './types';

export type SemanticPlanningContextVersion = '1.0.0';

export type SemanticPlanningContextOptions = SemanticInspectionOptions;

export interface PlanningContextEntity {
  id: string;
  type: Entity['type'];
  title: string;
  status: Entity['status'];
  filePath: string;
  archived: boolean;
}

export interface PlanningContextText {
  heading: string;
  text: string;
  markdown: string;
  provenance: Exclude<SemanticProvenance, 'nlp-inferred'>;
  range: SourceRange;
}

export interface PlanningContextReference {
  id: string;
  entity: PlanningContextEntity | null;
  authoritative: true;
}

export interface PlanningContextRelationships {
  dependsOn: PlanningContextReference[];
  epic: PlanningContextReference | null;
  milestone: PlanningContextReference | null;
  supersedes: PlanningContextReference | null;
  supersededBy: PlanningContextReference | null;
}

export interface PlanningContextReadiness extends TaskReadinessResult {
  reasons: string[];
}

export interface SemanticPlanningContext {
  contextVersion: SemanticPlanningContextVersion;
  entity: PlanningContextEntity;
  intent: {
    text: string;
    markdown: string;
    range: SourceRange;
  };
  sections: Record<string, PlanningContextText[]>;
  acceptanceCriteria: SemanticCriterion[];
  findings: SemanticFinding[];
  decisions: SemanticDecisionStatement[];
  questions: SemanticQuestion[];
  references: SemanticReference[];
  relationships: PlanningContextRelationships;
  readiness: PlanningContextReadiness | null;
  advisory: {
    enabled: boolean;
    mentions: EntityMention[];
    conclusions: SemanticAdvisoryConclusion[];
    analysis: AnalyzerResult | null;
  };
  diagnostics: SemanticDiagnostic[];
}

/**
 * Project one entity into bounded, traceable planning context. Frontmatter
 * relationships remain authoritative; body interpretation stays read-only.
 */
export async function buildSemanticPlanningContext(
  repository: Repository,
  entityId: string,
  options: SemanticPlanningContextOptions = {}
): Promise<SemanticPlanningContext> {
  const entities = getAllEntities(repository, { includeArchived: true });
  const entity = entities.find(candidate => candidate.id === entityId);
  if (!entity) {
    throw new Error(`Entity not found: ${entityId}`);
  }

  const inspection = await inspectSemanticEntity(entity, {
    tier: options.tier ?? 'automation-ready',
    lifecycle: options.lifecycle,
    criterionCheckState: options.criterionCheckState,
    analysis: options.analysis === true,
    language: options.language,
    analyzer: options.analyzer
  });
  const entityIndex = new Map(entities.map(candidate => [candidate.id, candidate]));
  const relationship = (id: string | null): PlanningContextReference | null => {
    if (!id) return null;
    const resolved = entityIndex.get(id);
    return {
      id,
      entity: resolved ? toContextEntity(resolved) : null,
      authoritative: true
    };
  };
  const requiredRelationship = (id: string): PlanningContextReference => {
    const resolved = relationship(id);
    if (!resolved) throw new Error('Relationship ID must not be empty');
    return resolved;
  };
  const readiness = entity.type === 'task'
    ? taskReadiness(entity, repository)
    : null;

  return {
    contextVersion: '1.0.0',
    entity: toContextEntity(entity),
    intent: {
      text: inspection.semantic.preamble.text,
      markdown: inspection.semantic.preamble.markdown,
      range: inspection.semantic.preamble.range
    },
    sections: compactSections(inspection.semantic.sections),
    acceptanceCriteria: inspection.semantic.criteria,
    findings: inspection.semantic.findings,
    decisions: inspection.semantic.decisions,
    questions: inspection.semantic.questions,
    references: inspection.semantic.references,
    relationships: {
      dependsOn: inspection.authoritative.relationships.dependsOn.map(requiredRelationship),
      epic: relationship(inspection.authoritative.relationships.epic),
      milestone: relationship(inspection.authoritative.relationships.milestone),
      supersedes: relationship(inspection.authoritative.relationships.supersedes),
      supersededBy: relationship(inspection.authoritative.relationships.supersededBy)
    },
    readiness,
    advisory: {
      enabled: inspection.analysis !== null,
      mentions: inspection.advisory.mentions,
      conclusions: inspection.advisory.conclusions,
      analysis: inspection.analysis
    },
    diagnostics: inspection.diagnostics
  };
}

function compactSections(
  sections: Array<{
    key: string | null;
    heading: string;
    text: string;
    contentMarkdown: string;
    provenance: Exclude<SemanticProvenance, 'nlp-inferred'>;
    contentRange: SourceRange;
  }>
): Record<string, PlanningContextText[]> {
  const result: Record<string, PlanningContextText[]> = {};
  for (const section of sections) {
    if (!section.key) continue;
    (result[section.key] ??= []).push({
      heading: section.heading,
      text: section.text,
      markdown: section.contentMarkdown,
      provenance: section.provenance,
      range: section.contentRange
    });
  }
  return result;
}

function taskReadiness(task: Task, repository: Repository): PlanningContextReadiness {
  return {
    ...getTaskReadiness(task, repository),
    reasons: explainNextWork(task, repository)
  };
}

function toContextEntity(entity: Entity): PlanningContextEntity {
  return {
    id: entity.id,
    type: entity.type,
    title: entity.title,
    status: entity.status,
    filePath: entity.filePath,
    archived: Boolean(entity.archive)
  };
}
