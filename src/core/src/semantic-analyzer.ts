import {
  AdvisorySignal,
  AnalyzerIdentity,
  AnalyzerResult,
  SemanticAnalyzer,
  SemanticCriterion,
  SemanticDiagnostic,
  SemanticDocument,
  SourcePoint,
  SourceRange
} from './semantic-types';

export const LOCAL_RULE_ANALYZER_IDENTITY = Object.freeze({
  id: 'planfs-local-english-rules',
  version: '1.0.0'
}) satisfies AnalyzerIdentity;

export type LocalRuleSignalKind =
  | 'modality'
  | 'negation'
  | 'condition'
  | 'date-duration'
  | 'relationship-mention';

export interface LocalRuleSemanticAnalyzerOptions {
  cacheSize?: number;
}

export interface SemanticAnalysisCacheStats {
  size: number;
  capacity: number;
  hits: number;
  misses: number;
  evictions: number;
}

export interface RunSemanticAnalysisOptions {
  enabled?: boolean;
  language?: string;
  analyzer?: SemanticAnalyzer;
}

interface RuleMatch {
  kind: LocalRuleSignalKind;
  start: number;
  end: number;
  confidence: number;
  basis: string;
  evidence: Array<{ start: number; end: number }>;
  data?: Record<string, string | number | boolean | null>;
}

interface CachedResult {
  key: string;
  value: AnalyzerResult;
}

const DEFAULT_CACHE_SIZE = 256;
const SUPPORTED_LANGUAGES = ['en'] as const;

/**
 * Local advisory prose analyzer containing only signals promoted by TASK-118.
 * It never changes the semantic document or authoritative entity metadata.
 */
export class LocalRuleSemanticAnalyzer implements SemanticAnalyzer {
  readonly identity = LOCAL_RULE_ANALYZER_IDENTITY;
  readonly supportedLanguages = SUPPORTED_LANGUAGES;

  private readonly cache = new Map<string, CachedResult>();
  private readonly capacity: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: LocalRuleSemanticAnalyzerOptions = {}) {
    const requestedCapacity = options.cacheSize ?? DEFAULT_CACHE_SIZE;
    if (!Number.isSafeInteger(requestedCapacity) || requestedCapacity < 0) {
      throw new Error('cacheSize must be a non-negative safe integer');
    }
    this.capacity = requestedCapacity;
  }

  get cacheStats(): SemanticAnalysisCacheStats {
    return {
      size: this.cache.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  async analyze(request: { document: SemanticDocument; language: string }): Promise<AnalyzerResult> {
    const language = normalizeLanguage(request.language);
    if (!this.supportedLanguages.includes(language as 'en')) {
      return {
        analyzer: { ...this.identity },
        language,
        signals: [],
        diagnostics: [unsupportedLanguageDiagnostic(this.identity, language)]
      };
    }

    const key = createCacheKey(request.document, language, this.identity);
    const cached = this.cache.get(key);
    if (cached) {
      this.hits += 1;
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cloneAnalyzerResult(cached.value);
    }

    this.misses += 1;
    const result: AnalyzerResult = {
      analyzer: { ...this.identity },
      language,
      signals: request.document.criteria
        .flatMap(criterion => analyzeCriterion(request.document, criterion, language))
        .sort(compareSignals),
      diagnostics: []
    };

    if (this.capacity > 0) {
      this.cache.set(key, { key, value: cloneAnalyzerResult(result) });
      if (this.cache.size > this.capacity) {
        const oldestKey = this.cache.keys().next().value as string | undefined;
        if (oldestKey !== undefined) this.cache.delete(oldestKey);
        this.evictions += 1;
      }
    }

    return cloneAnalyzerResult(result);
  }
}

const defaultAnalyzer = new LocalRuleSemanticAnalyzer();

/**
 * Explicit opt-in helper. A disabled request returns null and performs no analysis.
 * Analyzer failures are converted into bounded advisory diagnostics.
 */
export async function runSemanticAnalysis(
  document: SemanticDocument,
  options: RunSemanticAnalysisOptions = {}
): Promise<AnalyzerResult | null> {
  if (options.enabled !== true) return null;

  const analyzer = options.analyzer ?? defaultAnalyzer;
  const language = normalizeLanguage(options.language ?? 'en');
  try {
    return await analyzer.analyze({ document, language });
  } catch (error) {
    return {
      analyzer: { ...analyzer.identity },
      language,
      signals: [],
      diagnostics: [analyzerFailureDiagnostic(analyzer.identity, error)]
    };
  }
}

function analyzeCriterion(
  document: SemanticDocument,
  criterion: SemanticCriterion,
  language: string
): AdvisorySignal[] {
  let eligible = maskIneligibleMarkdown(criterion.markdown);
  for (const child of document.criteria.filter(candidate => candidate.parentCriterionId === criterion.id)) {
    const start = child.range.start.offset - criterion.range.start.offset;
    const end = child.range.end.offset - criterion.range.start.offset;
    eligible = maskRange(eligible, start, end);
  }

  const matches: RuleMatch[] = [];
  collect(matches, eligible, /\b(must|should|may)\b/gi, 'modality', 0.98, 'exact-modal-token');
  collect(matches, eligible, /\b(not|never|no|without)\b/gi, 'negation', 0.98, 'exact-negation-token');
  collect(
    matches,
    eligible,
    /\b(if|when|unless|until|after|before|once)\b/gi,
    'condition',
    0.95,
    'bounded-condition-introducer'
  );
  collect(
    matches,
    eligible,
    /\b(?:\d+(?:\.\d+)?\s*(?:ms|milliseconds?|seconds?|minutes?|hours?|days?)|per second|tomorrow|\d{4}-\d{2}-\d{2})\b/gi,
    'date-duration',
    0.95,
    'explicit-date-or-duration'
  );
  collectRelationships(matches, eligible);

  return deduplicateMatches(matches).map(match => toSignal(document, criterion, match, language));
}

function collectRelationships(matches: RuleMatch[], eligible: string): void {
  const entities = [...eligible.matchAll(
    /\b(?:TASK-[0-9]{3,}|EPIC-[A-Za-z0-9-]+|MILESTONE-[A-Za-z0-9-]+|DECISION-[A-Za-z0-9-]+)\b/g
  )];
  const phrases = [...eligible.matchAll(
    /\b(?:after|before|block(?:s|ed by)?|depend(?:s|ed)? on|belongs under|parent)\b/gi
  )];
  if (entities.length === 0 || phrases.length === 0) return;

  for (const entity of entities) {
    const phrase = nearestMatch(entity, phrases);
    const entityStart = entity.index ?? 0;
    const phraseStart = phrase.index ?? 0;
    const entityEnd = entityStart + entity[0].length;
    const phraseEnd = phraseStart + phrase[0].length;
    const gapStart = Math.min(entityEnd, phraseEnd);
    const gapEnd = Math.max(entityStart, phraseStart);
    const gap = eligible.slice(gapStart, gapEnd);
    if (gap.length > 80 || /[.!?\n]/.test(gap)) continue;
    matches.push({
      kind: 'relationship-mention',
      start: Math.min(entityStart, phraseStart),
      end: Math.max(entityEnd, phraseEnd),
      confidence: 0.90,
      basis: 'exact-planfs-id-with-bounded-relationship-phrase',
      evidence: [
        { start: phraseStart, end: phraseEnd },
        { start: entityStart, end: entityEnd }
      ],
      data: {
        targetId: entity[0],
        relationshipPhrase: phrase[0].toLowerCase()
      }
    });
  }
}

function maskIneligibleMarkdown(markdown: string): string {
  let value = markdown;
  const patterns = [
    /(^|\n)[ \t]*(```+|~~~+)[^\n]*(?:\n[\s\S]*?(?:\n[ \t]*\2[^\n]*)?(?=\n|$)|$)/g,
    /`+[^`\n]*`+/g,
    /<!--[\s\S]*?-->/g,
    /<([A-Za-z][A-Za-z0-9-]*)\b[^>]*>[\s\S]*?<\/\1\s*>/g,
    /<https?:\/\/[^>]+>/gi,
    /<[^>]*>/g,
    /\]\([^)]*\)/g,
    /https?:\/\/[^\s)>]+/gi,
    /(^|\n)[ \t]*(?:[-+*]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?/g
  ];
  for (const pattern of patterns) {
    value = value.replace(pattern, matched => ' '.repeat(matched.length));
  }
  return value.replace(/[_*~>#]/g, ' ').replace(/\[/g, ' ').replace(/\]/g, ' ');
}

function maskRange(value: string, start: number, end: number): string {
  const safeStart = Math.max(0, Math.min(value.length, start));
  const safeEnd = Math.max(safeStart, Math.min(value.length, end));
  return `${value.slice(0, safeStart)}${' '.repeat(safeEnd - safeStart)}${value.slice(safeEnd)}`;
}

function collect(
  target: RuleMatch[],
  text: string,
  pattern: RegExp,
  kind: LocalRuleSignalKind,
  confidence: number,
  basis: string
): void {
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    target.push({
      kind,
      start,
      end: start + match[0].length,
      confidence,
      basis,
      evidence: [{ start, end: start + match[0].length }]
    });
  }
}

function nearestMatch(target: RegExpMatchArray, matches: RegExpMatchArray[]): RegExpMatchArray {
  const targetIndex = target.index ?? 0;
  return matches.reduce((nearest, candidate) => (
    Math.abs((candidate.index ?? 0) - targetIndex) < Math.abs((nearest.index ?? 0) - targetIndex)
      ? candidate
      : nearest
  ));
}

function deduplicateMatches(matches: RuleMatch[]): RuleMatch[] {
  const seen = new Set<string>();
  return matches.filter(match => {
    const key = `${match.kind}:${match.start}:${match.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toSignal(
  document: SemanticDocument,
  criterion: SemanticCriterion,
  match: RuleMatch,
  language: string
): AdvisorySignal {
  const criterionStart = criterion.range.start.offset;
  const range = sourceRange(document.source.rawMarkdown, criterionStart + match.start, criterionStart + match.end);
  const evidence = match.evidence.map(item => {
    const evidenceRange = sourceRange(
      document.source.rawMarkdown,
      criterionStart + item.start,
      criterionStart + item.end
    );
    return {
      text: document.source.rawMarkdown.slice(evidenceRange.start.offset, evidenceRange.end.offset),
      range: evidenceRange
    };
  });
  return {
    kind: match.kind,
    message: messageFor(match.kind, evidence.map(item => item.text)),
    language,
    analyzer: { ...LOCAL_RULE_ANALYZER_IDENTITY },
    provenance: 'nlp-inferred',
    range,
    evidence,
    confidence: match.confidence,
    authoritative: false,
    data: {
      criterionId: criterion.id,
      evidenceBasis: match.basis,
      ...match.data
    }
  };
}

function messageFor(kind: LocalRuleSignalKind, evidence: string[]): string {
  switch (kind) {
    case 'modality':
      return `Modal wording detected: ${evidence[0] ?? ''}`;
    case 'negation':
      return `Negation detected: ${evidence[0] ?? ''}`;
    case 'condition':
      return `Conditional wording detected: ${evidence[0] ?? ''}`;
    case 'date-duration':
      return `Date or duration wording detected: ${evidence[0] ?? ''}`;
    case 'relationship-mention':
      return `Possible planning relationship mentioned in prose: ${evidence[1] ?? evidence[0] ?? ''}`;
  }
}

function sourceRange(source: string, start: number, end: number): SourceRange {
  return { start: sourcePoint(source, start), end: sourcePoint(source, end) };
}

function sourcePoint(source: string, offset: number): SourcePoint {
  const before = source.slice(0, offset);
  const lastNewline = before.lastIndexOf('\n');
  let line = 1;
  for (let index = 0; index < before.length; index += 1) {
    if (before.charCodeAt(index) === 10) line += 1;
  }
  return {
    offset,
    line,
    column: offset - lastNewline
  };
}

function compareSignals(left: AdvisorySignal, right: AdvisorySignal): number {
  return left.range.start.offset - right.range.start.offset || left.kind.localeCompare(right.kind);
}

function createCacheKey(document: SemanticDocument, language: string, identity: AnalyzerIdentity): string {
  return [
    identity.id,
    identity.version,
    language,
    document.profile.entityType,
    document.profile.version,
    document.source.rawMarkdown
  ].join('\0');
}

function normalizeLanguage(language: string): string {
  return language.trim().toLowerCase().split('-')[0] ?? '';
}

function unsupportedLanguageDiagnostic(identity: AnalyzerIdentity, language: string): SemanticDiagnostic {
  return {
    code: 'analysis.language.unsupported',
    severity: 'info',
    message: `Analyzer ${identity.id} does not support language: ${language || '(empty)'}`,
    range: null,
    sectionIndex: null,
    provenance: 'nlp-inferred',
    conformance: 'analysis',
    repair: {
      summary: 'Disable advisory analysis or select a supported language',
      kind: 'none',
      previewable: false
    },
    data: { language }
  };
}

function analyzerFailureDiagnostic(identity: AnalyzerIdentity, error: unknown): SemanticDiagnostic {
  const errorName = error instanceof Error && error.name ? error.name : 'Error';
  return {
    code: 'analysis.analyzer.unavailable',
    severity: 'warning',
    message: `Advisory analyzer ${identity.id} could not run locally.`,
    range: null,
    sectionIndex: null,
    provenance: 'nlp-inferred',
    conformance: 'analysis',
    repair: {
      summary: 'Retry without advisory analysis or check the local analyzer configuration',
      kind: 'none',
      previewable: false
    },
    data: { analyzerId: identity.id, analyzerVersion: identity.version, errorName }
  };
}

function cloneAnalyzerResult(result: AnalyzerResult): AnalyzerResult {
  return JSON.parse(JSON.stringify(result)) as AnalyzerResult;
}
