import { runSemanticAnalysis } from './semantic-analyzer';
import { parseSemanticDocument } from './semantic';
import {
  AdvisorySignal,
  AnalyzerResult,
  EntityMention,
  SemanticAnalyzer,
  SemanticDiagnostic,
  SemanticDocument,
  SemanticFinding,
  SemanticCriterion,
  OrderedSection,
  SourceRange
} from './semantic-types';
import {
  CriterionCheckStatePolicy,
  SemanticValidationDiagnostic,
  SemanticValidationTier,
  validateSemanticDocument
} from './semantic-validator';
import { Entity } from './types';

export type SemanticInspectionContractVersion = '1.0.0';

export type SemanticInspectionView =
  | 'all'
  | 'acceptance-criteria'
  | 'findings'
  | 'sections'
  | 'mentions'
  | 'relationships'
  | 'raw';

export interface SemanticInspectionOptions {
  tier?: SemanticValidationTier;
  lifecycle?: boolean;
  criterionCheckState?: CriterionCheckStatePolicy;
  analysis?: boolean;
  language?: string;
  analyzer?: SemanticAnalyzer;
}

export interface SemanticInspectionEntity {
  id: string;
  type: Entity['type'];
  title: string;
  status: Entity['status'];
  filePath: string;
}

export interface AuthoritativeRelationships {
  dependsOn: string[];
  epic: string | null;
  milestone: string | null;
  supersedes: string | null;
  supersededBy: string | null;
}

export interface SemanticInspectionAuthoritative {
  metadata: Record<string, unknown>;
  relationships: AuthoritativeRelationships;
}

export interface SemanticAdvisoryConclusion {
  code: string;
  message: string;
  range: SourceRange;
  provenance: 'nlp-inferred';
  authoritative: false;
  signalKinds: string[];
  repair: {
    summary: string;
    kind: 'edit-markdown' | 'edit-frontmatter';
    previewable: boolean;
  };
  data: Record<string, string | number | boolean | null>;
}

export interface SemanticInspectionAdvisory {
  mentions: EntityMention[];
  conclusions: SemanticAdvisoryConclusion[];
}

export interface SemanticInspectionResult {
  inspectionVersion: SemanticInspectionContractVersion;
  entity: SemanticInspectionEntity;
  authoritative: SemanticInspectionAuthoritative;
  semantic: SemanticDocument;
  advisory: SemanticInspectionAdvisory;
  analysis: AnalyzerResult | null;
  diagnostics: SemanticValidationDiagnostic[];
}

export type SemanticInspectionData =
  | {
      authoritative: SemanticInspectionAuthoritative;
      semantic: SemanticDocument;
      advisory: SemanticInspectionAdvisory;
      analysis: AnalyzerResult | null;
    }
  | { criteria: SemanticCriterion[] }
  | { findings: SemanticFinding[] }
  | { sections: OrderedSection[] }
  | { mentions: EntityMention[] }
  | {
      authoritativeRelationships: AuthoritativeRelationships;
      advisoryMentions: EntityMention[];
      relationshipSignals: AdvisorySignal[];
    }
  | { rawMarkdown: string };

export interface SemanticInspectionViewResult {
  inspectionVersion: SemanticInspectionContractVersion;
  view: SemanticInspectionView;
  entity: SemanticInspectionEntity;
  data: SemanticInspectionData;
  diagnostics: SemanticValidationDiagnostic[];
}

/**
 * Build a read-only semantic inspection result for one already loaded entity.
 * Analysis is optional at the core boundary; interactive callers may enable it
 * by default while deterministic automation can leave it disabled.
 */
export async function inspectSemanticEntity(
  entity: Entity,
  options: SemanticInspectionOptions = {}
): Promise<SemanticInspectionResult> {
  const semantic = parseSemanticDocument(entity.type, entity.body, { filePath: entity.filePath });
  const validation = validateSemanticDocument(entity, semantic, {
    tier: options.tier ?? 'automation-ready',
    lifecycle: options.lifecycle,
    criterionCheckState: options.criterionCheckState
  });
  const analysis = await runSemanticAnalysis(semantic, {
    enabled: options.analysis === true,
    language: options.language ?? 'en',
    analyzer: options.analyzer
  });
  const analysisDiagnostics = analysis?.diagnostics.map(diagnostic => (
    enrichAnalysisDiagnostic(entity, semantic, diagnostic)
  )) ?? [];
  const diagnostics = [...validation.diagnostics, ...analysisDiagnostics].sort(compareDiagnostics);
  const relationships = authoritativeRelationships(entity);

  return {
    inspectionVersion: '1.0.0',
    entity: {
      id: entity.id,
      type: entity.type,
      title: entity.title,
      status: entity.status,
      filePath: entity.filePath
    },
    authoritative: {
      metadata: sortRecord(entity.metadata),
      relationships
    },
    semantic,
    advisory: {
      mentions: semantic.mentions,
      conclusions: actionableConclusions(analysis, relationships)
    },
    analysis,
    diagnostics
  };
}

/** Select a deterministic, focused JSON-ready view without reparsing Markdown. */
export function selectSemanticInspectionView(
  inspection: SemanticInspectionResult,
  view: SemanticInspectionView = 'all'
): SemanticInspectionViewResult {
  let data: SemanticInspectionData;
  switch (view) {
    case 'acceptance-criteria':
      data = { criteria: inspection.semantic.criteria };
      break;
    case 'findings':
      data = { findings: inspection.semantic.findings };
      break;
    case 'sections':
      data = { sections: inspection.semantic.sections };
      break;
    case 'mentions':
      data = { mentions: inspection.advisory.mentions };
      break;
    case 'relationships':
      data = {
        authoritativeRelationships: inspection.authoritative.relationships,
        advisoryMentions: inspection.advisory.mentions,
        relationshipSignals: inspection.analysis?.signals.filter(signal => (
          signal.kind === 'relationship-mention'
        )) ?? []
      };
      break;
    case 'raw':
      data = { rawMarkdown: inspection.semantic.source.rawMarkdown };
      break;
    case 'all':
      data = {
        authoritative: inspection.authoritative,
        semantic: inspection.semantic,
        advisory: inspection.advisory,
        analysis: inspection.analysis
      };
      break;
  }

  return {
    inspectionVersion: inspection.inspectionVersion,
    view,
    entity: inspection.entity,
    data,
    diagnostics: inspection.diagnostics
  };
}

function authoritativeRelationships(entity: Entity): AuthoritativeRelationships {
  return {
    dependsOn: entity.type === 'task' ? [...(entity.dependsOn ?? [])] : [],
    epic: entity.type === 'task' ? entity.epic ?? null : null,
    milestone: entity.type === 'task' ? entity.milestone ?? null : null,
    supersedes: entity.type === 'decision' ? entity.supersedes ?? null : null,
    supersededBy: entity.type === 'decision' ? entity.supersededBy ?? null : null
  };
}

function actionableConclusions(
  analysis: AnalyzerResult | null,
  relationships: AuthoritativeRelationships
): SemanticAdvisoryConclusion[] {
  if (!analysis) return [];
  const conclusions: SemanticAdvisoryConclusion[] = [];
  const representedIds = new Set([
    ...relationships.dependsOn,
    relationships.epic,
    relationships.milestone,
    relationships.supersedes,
    relationships.supersededBy
  ].filter((value): value is string => value !== null));

  const relationshipSignals = analysis.signals.filter(signal => signal.kind === 'relationship-mention');
  const seenRelationshipTargets = new Set<string>();
  for (const signal of relationshipSignals) {
    const targetId = typeof signal.data.targetId === 'string' ? signal.data.targetId : null;
    if (!targetId || representedIds.has(targetId) || seenRelationshipTargets.has(targetId)) continue;
    seenRelationshipTargets.add(targetId);
    conclusions.push({
      code: 'analysis.relationship.metadata-missing',
      message: `${targetId} is mentioned as a possible planning relationship but is not represented in authoritative metadata.`,
      range: signal.range,
      provenance: 'nlp-inferred',
      authoritative: false,
      signalKinds: ['relationship-mention'],
      repair: {
        summary: 'Review the prose and preview an appropriate frontmatter relationship update if intended.',
        kind: 'edit-frontmatter',
        previewable: true
      },
      data: { targetId }
    });
  }

  const wordingByCriterion = new Map<string, AdvisorySignal[]>();
  for (const signal of analysis.signals) {
    const criterionId = typeof signal.data.criterionId === 'string' ? signal.data.criterionId : null;
    if (!criterionId || !isAmbiguousWordingSignal(signal, analysis.signals)) continue;
    const existing = wordingByCriterion.get(criterionId) ?? [];
    existing.push(signal);
    wordingByCriterion.set(criterionId, existing);
  }
  for (const [criterionId, signals] of wordingByCriterion) {
    const first = signals[0];
    if (!first) continue;
    const kinds = [...new Set(signals.map(signal => signal.kind))].sort();
    conclusions.push({
      code: 'analysis.criterion.wording-ambiguous',
      message: 'Acceptance-criterion wording may need a clearer required outcome.',
      range: first.range,
      provenance: 'nlp-inferred',
      authoritative: false,
      signalKinds: kinds,
      repair: {
        summary: 'Clarify whether the behavior is required and make the conditional outcome objectively testable.',
        kind: 'edit-markdown',
        previewable: true
      },
      data: { criterionId }
    });
  }

  return conclusions.sort((left, right) => (
    left.range.start.offset - right.range.start.offset || left.code.localeCompare(right.code)
  ));
}

function isAmbiguousWordingSignal(
  signal: AdvisorySignal,
  allSignals: AdvisorySignal[]
): boolean {
  if (signal.kind === 'condition') {
    const criterionId = signal.data.criterionId;
    const representedByRelationship = allSignals.some(candidate => (
      candidate.kind === 'relationship-mention'
      && candidate.data.criterionId === criterionId
      && candidate.range.start.offset <= signal.range.start.offset
      && candidate.range.end.offset >= signal.range.end.offset
    ));
    return !representedByRelationship;
  }
  if (signal.kind !== 'modality') return false;
  return signal.evidence.some(evidence => /^(should|may)$/i.test(evidence.text));
}

function enrichAnalysisDiagnostic(
  entity: Entity,
  document: SemanticDocument,
  diagnostic: SemanticDiagnostic
): SemanticValidationDiagnostic {
  const section = diagnostic.sectionIndex === null
    ? null
    : document.sections[diagnostic.sectionIndex] ?? null;
  return {
    ...diagnostic,
    entityId: entity.id,
    filePath: entity.filePath,
    sectionKey: section?.key ?? null
  };
}

function compareDiagnostics(
  left: SemanticValidationDiagnostic,
  right: SemanticValidationDiagnostic
): number {
  const leftOffset = left.range?.start.offset ?? Number.MAX_SAFE_INTEGER;
  const rightOffset = right.range?.start.offset ?? Number.MAX_SAFE_INTEGER;
  return leftOffset - rightOffset || left.code.localeCompare(right.code);
}

function sortRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, sortValue(value)])
  );
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === 'object') {
    return sortRecord(value as Record<string, unknown>);
  }
  return value;
}
