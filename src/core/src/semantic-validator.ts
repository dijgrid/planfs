import { runSemanticAnalysis } from './semantic-analyzer';
import { getSemanticContentProfile } from './semantic-profiles';
import { parseSemanticDocument } from './semantic';
import {
  AnalyzerResult,
  ConformanceSummary,
  OrderedSection,
  SemanticAnalyzer,
  SemanticDiagnostic,
  SemanticDocument,
  SemanticSeverity,
  SourceRange
} from './semantic-types';
import { Entity, Repository } from './types';

export type SemanticValidationTier = 'baseline' | 'automation-ready';
export type CriterionCheckStatePolicy = 'ignore' | SemanticSeverity;

export interface SemanticValidationOptions {
  tier?: SemanticValidationTier;
  lifecycle?: boolean;
  criterionCheckState?: CriterionCheckStatePolicy;
  analysis?: boolean;
  language?: string;
  analyzer?: SemanticAnalyzer;
}

export interface SemanticValidationDiagnostic extends SemanticDiagnostic {
  entityId: string;
  filePath: string;
  sectionKey: string | null;
}

export interface SemanticEntityValidationResult {
  entityId: string;
  entityType: Entity['type'];
  filePath: string;
  tier: SemanticValidationTier;
  conformance: ConformanceSummary;
  valid: boolean;
  diagnostics: SemanticValidationDiagnostic[];
  analysis: AnalyzerResult | null;
}

export interface SemanticRepositoryValidationResult {
  tier: SemanticValidationTier;
  lifecycle: boolean;
  analysisEnabled: boolean;
  valid: boolean;
  severityCounts: Record<SemanticSeverity, number>;
  entities: SemanticEntityValidationResult[];
  diagnostics: SemanticValidationDiagnostic[];
}

const NON_READY_REFINEMENT_STATES = new Set([
  'captured',
  'needs-refinement',
  'deferred',
  'discarded'
]);

/** Validate one loaded entity without changing its body or metadata. */
export async function validateSemanticEntity(
  entity: Entity,
  options: SemanticValidationOptions = {}
): Promise<SemanticEntityValidationResult> {
  const tier = options.tier ?? 'baseline';
  const document = parseSemanticDocument(entity.type, entity.body, { filePath: entity.filePath });
  const result = validateSemanticDocument(entity, document, options);
  const analysis = await runSemanticAnalysis(document, {
    enabled: options.analysis === true,
    language: options.language ?? 'en',
    analyzer: options.analyzer
  });
  const analysisDiagnostics = analysis?.diagnostics.map(diagnostic => enrichDiagnostic(
    entity,
    document,
    diagnostic
  )) ?? [];
  const diagnostics = [...result.diagnostics, ...analysisDiagnostics].sort(compareDiagnostics);
  return {
    ...result,
    tier,
    valid: !diagnostics.some(diagnostic => diagnostic.severity === 'error'),
    diagnostics,
    analysis
  };
}

/**
 * Validate an already parsed document. This deterministic path performs no
 * analyzer work and is identical whether an analyzer is installed or not.
 */
export function validateSemanticDocument(
  entity: Entity,
  document: SemanticDocument,
  options: SemanticValidationOptions = {}
): SemanticEntityValidationResult {
  const tier = options.tier ?? 'baseline';
  const diagnostics = document.diagnostics
    .filter(diagnostic => diagnostic.conformance === 'baseline')
    .map(diagnostic => enrichDiagnostic(entity, document, diagnostic));
  const automationEvaluated = tier === 'automation-ready' && shouldEvaluateAutomation(entity);

  if (automationEvaluated) {
    diagnostics.push(...document.diagnostics
      .filter(diagnostic => diagnostic.conformance === 'automation-ready')
      .map(diagnostic => enrichDiagnostic(entity, document, diagnostic)));
    diagnostics.push(...validateAutomationReady(entity, document, options));
  }

  if (options.lifecycle === true) {
    diagnostics.push(...validateLifecycle(entity, document));
  }

  const uniqueDiagnostics = deduplicateDiagnostics(diagnostics).sort(compareDiagnostics);
  const baseline = document.conformance.baseline;
  const automationReady: ConformanceSummary['automationReady'] = tier === 'baseline' || !automationEvaluated
    ? 'not-evaluated'
    : hasNonconformingDiagnostics(uniqueDiagnostics, 'automation-ready') || baseline === 'nonconformant'
      ? 'nonconformant'
      : 'conformant';
  const lifecycle: ConformanceSummary['lifecycle'] = options.lifecycle !== true
    ? 'not-evaluated'
    : hasNonconformingDiagnostics(uniqueDiagnostics, 'lifecycle')
      ? 'nonconformant'
      : lifecycleApplies(entity)
        ? 'conformant'
        : 'not-applicable';

  return {
    entityId: entity.id,
    entityType: entity.type,
    filePath: entity.filePath,
    tier,
    conformance: { baseline, automationReady, lifecycle },
    valid: !uniqueDiagnostics.some(diagnostic => diagnostic.severity === 'error'),
    diagnostics: uniqueDiagnostics,
    analysis: null
  };
}

/** Validate every active entity and apply repository-aware lifecycle policy. */
export async function validateSemanticRepository(
  repository: Repository,
  options: SemanticValidationOptions = {}
): Promise<SemanticRepositoryValidationResult> {
  const entities = [
    ...repository.tasks.values(),
    ...repository.epics.values(),
    ...repository.milestones.values(),
    ...repository.decisions.values()
  ];
  const results = await Promise.all(entities.map(entity => validateSemanticEntity(entity, options)));

  if (options.lifecycle === true) {
    for (const result of results) {
      if (result.entityType !== 'epic') continue;
      const epic = repository.epics.get(result.entityId);
      if (!epic || epic.status !== 'completed') continue;
      const openChildren = [...repository.tasks.values()]
        .filter(task => task.epic === epic.id && task.status !== 'done')
        .map(task => task.id)
        .sort();
      if (openChildren.length === 0) continue;
      result.diagnostics.push(createDiagnostic(
        epic,
        null,
        'content.lifecycle.open-child-work',
        'warning',
        `Completed epic has open child tasks: ${openChildren.join(', ')}.`,
        null,
        null,
        'canonical',
        'lifecycle',
        'Complete or reassign the authoritative child tasks, or reopen the epic.',
        'edit-frontmatter',
        false,
        { openChildTaskIds: openChildren.join(',') }
      ));
      result.conformance.lifecycle = 'nonconformant';
    }
  }

  for (const result of results) {
    result.diagnostics = deduplicateDiagnostics(result.diagnostics).sort(compareDiagnostics);
    result.valid = !result.diagnostics.some(diagnostic => diagnostic.severity === 'error');
  }
  const diagnostics = results.flatMap(result => result.diagnostics).sort(compareDiagnostics);
  const severityCounts = diagnostics.reduce<Record<SemanticSeverity, number>>(
    (counts, diagnostic) => ({ ...counts, [diagnostic.severity]: counts[diagnostic.severity] + 1 }),
    { info: 0, warning: 0, error: 0 }
  );
  return {
    tier: options.tier ?? 'baseline',
    lifecycle: options.lifecycle === true,
    analysisEnabled: options.analysis === true,
    valid: severityCounts.error === 0,
    severityCounts,
    entities: results,
    diagnostics
  };
}

function validateAutomationReady(
  entity: Entity,
  document: SemanticDocument,
  options: SemanticValidationOptions
): SemanticValidationDiagnostic[] {
  const diagnostics: SemanticValidationDiagnostic[] = [];
  const profile = getSemanticContentProfile(entity.type);
  const criterionPolicy = options.criterionCheckState ?? 'warning';

  if (entity.type !== 'decision' && document.preamble.empty) {
    diagnostics.push(createDiagnostic(
      entity,
      document,
      'content.preamble.missing',
      'warning',
      `Automation-ready ${entity.type}s require a non-empty summary before the first section.`,
      document.preamble.range,
      null,
      'rule-inferred',
      'automation-ready',
      'Add a concise summary before the first level-two heading.',
      'edit-markdown',
      false
    ));
  }

  const requiredSections = requiredSectionKeys(entity.type);
  for (const key of requiredSections) {
    const sections = document.knownSections[key] ?? [];
    const frontmatterValue = authoritativeBodyValue(entity, key);
    if (sections.length === 0 && !frontmatterValue) {
      diagnostics.push(createDiagnostic(
        entity,
        document,
        'content.section.missing',
        'warning',
        `Automation-ready ${entity.type}s require a non-empty '${key}' section.`,
        insertionRange(document),
        null,
        'rule-inferred',
        'automation-ready',
        `Add the canonical '${canonicalHeading(profile, key)}' section with meaningful content.`,
        'edit-markdown',
        false,
        { key }
      ));
      continue;
    }
    if (sections.length > 0 && sections.every(section => section.empty) && !frontmatterValue) {
      diagnostics.push(createDiagnostic(
        entity,
        document,
        'content.section.required-empty',
        'warning',
        `Required '${key}' content is empty.`,
        sections[0]?.contentRange ?? insertionRange(document),
        sections[0]?.index ?? null,
        sections[0]?.provenance ?? 'rule-inferred',
        'automation-ready',
        `Add meaningful content to '${canonicalHeading(profile, key)}'.`,
        'edit-markdown',
        false,
        { key }
      ));
    }
  }

  for (const definition of profile.sections) {
    for (const section of document.knownSections[definition.key] ?? []) {
      if (section.empty || contentShapeMatches(section, definition.expectedContent)) continue;
      const acceptanceLike = definition.expectedContent === 'task-list';
      diagnostics.push(createDiagnostic(
        entity,
        document,
        acceptanceLike
          ? 'content.acceptance-criteria.unstructured'
          : 'content.section.wrong-shape',
        'warning',
        acceptanceLike
          ? `Section '${section.heading}' contains substantive content outside a criteria list.`
          : `Section '${section.heading}' has '${section.contentShape}' content; expected '${definition.expectedContent}'.`,
        section.contentRange,
        section.index,
        section.provenance,
        'automation-ready',
        acceptanceLike
          ? 'Convert the substantive requirements into Markdown list items.'
          : `Use ${definition.expectedContent} content or retain it under a custom section heading.`,
        'edit-markdown',
        false,
        { key: definition.key, actualShape: section.contentShape, expectedShape: definition.expectedContent }
      ));
    }
  }

  if (criterionPolicy !== 'ignore') {
    for (const criterion of document.criteria.filter(item => item.checked === null)) {
      diagnostics.push(createDiagnostic(
        entity,
        document,
        'content.criterion.missing-check-state',
        criterionPolicy,
        'Criterion is an ordinary list item and has no checked or unchecked state.',
        criterion.range,
        criterion.sectionIndex,
        criterion.provenance,
        'automation-ready',
        'Add an explicit [ ] or [x] task-list marker.',
        'edit-markdown',
        true,
        { criterionId: criterion.id }
      ));
    }
  }

  if ((entity.type === 'task' || entity.type === 'milestone') && document.criteria.length === 0) {
    const key = entity.type === 'task' ? 'acceptanceCriteria' : 'releaseCriteria';
    const section = document.knownSections[key]?.[0];
    diagnostics.push(createDiagnostic(
      entity,
      document,
      'content.criterion.missing',
      'warning',
      `Automation-ready ${entity.type}s require at least one criterion.`,
      section?.contentRange ?? insertionRange(document),
      section?.index ?? null,
      section?.provenance ?? 'rule-inferred',
      'automation-ready',
      'Add at least one Markdown task-list criterion.',
      'edit-markdown',
      false,
      { key }
    ));
  }

  diagnostics.push(...frontmatterBodyConflicts(entity, document));
  return diagnostics;
}

function validateLifecycle(
  entity: Entity,
  document: SemanticDocument
): SemanticValidationDiagnostic[] {
  const diagnostics: SemanticValidationDiagnostic[] = [];
  if (entity.type === 'task' && ['review', 'done'].includes(entity.status)) {
    const incomplete = document.criteria.filter(criterion => criterion.checked !== true);
    if (document.criteria.length === 0 || incomplete.length > 0) {
      diagnostics.push(createDiagnostic(
        entity,
        document,
        'content.lifecycle.incomplete-criteria',
        entity.status === 'done' ? 'warning' : 'info',
        `${entity.status === 'done' ? 'Done' : 'Review'} task has ${document.criteria.length === 0 ? 'no criteria' : `${incomplete.length} incomplete criteria`}.`,
        incomplete[0]?.range ?? insertionRange(document),
        incomplete[0]?.sectionIndex ?? null,
        incomplete[0]?.provenance ?? 'rule-inferred',
        'lifecycle',
        'Review the criteria or explicitly change authoritative task status.',
        'edit-frontmatter',
        false,
        { status: entity.status, incompleteCount: incomplete.length }
      ));
    }
  }

  if (entity.type === 'epic' && entity.status === 'completed') {
    const outcomes = document.knownSections.outcomes ?? [];
    if (outcomes.length === 0 || outcomes.every(section => section.empty)) {
      diagnostics.push(lifecycleMissingSection(entity, document, 'outcomes'));
    }
  }

  if (entity.type === 'milestone' && entity.status === 'completed') {
    const incomplete = document.criteria.filter(criterion => criterion.checked !== true);
    if (document.criteria.length === 0 || incomplete.length > 0) {
      diagnostics.push(createDiagnostic(
        entity,
        document,
        'content.lifecycle.incomplete-criteria',
        'warning',
        `Completed milestone has ${document.criteria.length === 0 ? 'no release criteria' : `${incomplete.length} incomplete release criteria`}.`,
        incomplete[0]?.range ?? insertionRange(document),
        incomplete[0]?.sectionIndex ?? null,
        incomplete[0]?.provenance ?? 'rule-inferred',
        'lifecycle',
        'Complete the release criteria or explicitly reopen the milestone.',
        'edit-frontmatter',
        false,
        { status: entity.status, incompleteCount: incomplete.length }
      ));
    }
  }

  if (entity.type === 'decision' && entity.status === 'accepted') {
    for (const key of ['context', 'decision', 'consequences']) {
      const sections = document.knownSections[key] ?? [];
      if (!authoritativeBodyValue(entity, key) && (sections.length === 0 || sections.every(section => section.empty))) {
        diagnostics.push(lifecycleMissingSection(entity, document, key));
      }
    }
  }
  return diagnostics;
}

function lifecycleMissingSection(
  entity: Entity,
  document: SemanticDocument,
  key: string
): SemanticValidationDiagnostic {
  return createDiagnostic(
    entity,
    document,
    'content.lifecycle.required-content-missing',
    'warning',
    `${entity.status} ${entity.type} is missing required '${key}' content.`,
    insertionRange(document),
    null,
    'rule-inferred',
    'lifecycle',
    `Add '${key}' content or explicitly change authoritative lifecycle status.`,
    'edit-frontmatter',
    false,
    { status: entity.status, key }
  );
}

function frontmatterBodyConflicts(
  entity: Entity,
  document: SemanticDocument
): SemanticValidationDiagnostic[] {
  const keys = entity.type === 'decision'
    ? ['context', 'decision', 'consequences']
    : entity.type === 'epic' || entity.type === 'milestone'
      ? ['description']
      : [];
  return keys.flatMap(key => {
    const authoritative = authoritativeBodyValue(entity, key);
    const section = key === 'description' ? null : document.knownSections[key]?.[0];
    const body = key === 'description' ? document.preamble.text : section?.text;
    if (!authoritative || !body || normalizeText(authoritative) === normalizeText(body)) return [];
    return [createDiagnostic(
      entity,
      document,
      'content.frontmatter-body.conflict',
      'warning',
      `Authoritative frontmatter '${key}' differs from the Markdown body view.`,
      section?.contentRange ?? document.preamble.range,
      section?.index ?? null,
      section?.provenance ?? 'rule-inferred',
      'automation-ready',
      'Reconcile the text explicitly; frontmatter remains authoritative.',
      'edit-frontmatter',
      false,
      { key }
    )];
  });
}

function requiredSectionKeys(entityType: Entity['type']): string[] {
  switch (entityType) {
    case 'task': return ['acceptanceCriteria'];
    case 'epic': return ['outcomes'];
    case 'milestone': return ['outcomes', 'releaseCriteria'];
    case 'decision': return ['context', 'decision', 'consequences'];
  }
}

function authoritativeBodyValue(entity: Entity, key: string): string | undefined {
  const value = key === 'description'
    ? (entity.type === 'epic' || entity.type === 'milestone' ? entity.description : undefined)
    : entity.type === 'decision' && ['context', 'decision', 'consequences'].includes(key)
      ? entity[key as 'context' | 'decision' | 'consequences']
      : undefined;
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function contentShapeMatches(
  section: OrderedSection,
  expected: ReturnType<typeof getSemanticContentProfile>['sections'][number]['expectedContent']
): boolean {
  switch (expected) {
    case 'mixed': return true;
    case 'prose-or-list': return section.contentShape !== 'empty';
    case 'list-or-references': return ['list', 'task-list', 'references'].includes(section.contentShape);
    case 'task-list': return ['task-list', 'list'].includes(section.contentShape);
    default: return section.contentShape === expected;
  }
}

function shouldEvaluateAutomation(entity: Entity): boolean {
  return entity.type !== 'task'
    || !entity.refinementState
    || !NON_READY_REFINEMENT_STATES.has(entity.refinementState);
}

function lifecycleApplies(entity: Entity): boolean {
  return (entity.type === 'task' && ['review', 'done'].includes(entity.status))
    || (entity.type === 'epic' && entity.status === 'completed')
    || (entity.type === 'milestone' && entity.status === 'completed')
    || (entity.type === 'decision' && entity.status === 'accepted');
}

function hasNonconformingDiagnostics(
  diagnostics: SemanticValidationDiagnostic[],
  conformance: SemanticDiagnostic['conformance']
): boolean {
  return diagnostics.some(diagnostic => (
    diagnostic.conformance === conformance && diagnostic.code !== 'content.section.alias'
  ));
}

function enrichDiagnostic(
  entity: Entity,
  document: SemanticDocument,
  diagnostic: SemanticDiagnostic
): SemanticValidationDiagnostic {
  const section = diagnostic.sectionIndex === null
    ? undefined
    : document.sections[diagnostic.sectionIndex];
  return {
    ...diagnostic,
    entityId: entity.id,
    filePath: entity.filePath,
    sectionKey: section?.key ?? (typeof diagnostic.data?.key === 'string' ? diagnostic.data.key : null)
  };
}

function createDiagnostic(
  entity: Entity,
  document: SemanticDocument | null,
  code: string,
  severity: SemanticSeverity,
  message: string,
  range: SourceRange | null,
  sectionIndex: number | null,
  provenance: SemanticDiagnostic['provenance'],
  conformance: SemanticDiagnostic['conformance'],
  repairSummary: string,
  repairKind: SemanticDiagnostic['repair']['kind'],
  previewable: boolean,
  data?: SemanticDiagnostic['data']
): SemanticValidationDiagnostic {
  const section = document && sectionIndex !== null ? document.sections[sectionIndex] : undefined;
  return {
    entityId: entity.id,
    filePath: entity.filePath,
    sectionKey: section?.key ?? (typeof data?.key === 'string' ? data.key : null),
    code,
    severity,
    message,
    range,
    sectionIndex,
    provenance,
    conformance,
    repair: { summary: repairSummary, kind: repairKind, previewable },
    ...(data ? { data } : {})
  };
}

function insertionRange(document: SemanticDocument): SourceRange {
  const point = document.sections.at(-1)?.range.end ?? document.preamble.range.end;
  return { start: { ...point }, end: { ...point } };
}

function canonicalHeading(profile: ReturnType<typeof getSemanticContentProfile>, key: string): string {
  return profile.sections.find(section => section.key === key)?.canonicalHeading ?? key;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim().toLowerCase();
}

function deduplicateDiagnostics(
  diagnostics: SemanticValidationDiagnostic[]
): SemanticValidationDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter(diagnostic => {
    const key = [
      diagnostic.code,
      diagnostic.entityId,
      diagnostic.range?.start.offset ?? -1,
      diagnostic.sectionKey ?? '',
      diagnostic.data?.criterionId ?? ''
    ].join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compareDiagnostics(
  left: SemanticValidationDiagnostic,
  right: SemanticValidationDiagnostic
): number {
  return left.filePath.localeCompare(right.filePath)
    || (left.range?.start.offset ?? -1) - (right.range?.start.offset ?? -1)
    || left.code.localeCompare(right.code);
}
