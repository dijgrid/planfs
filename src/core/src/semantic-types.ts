import { EntityType } from './types';

export type SemanticContractVersion = '1.0.0';
export type SemanticProfileVersion = '1.0.0';
export type SemanticProvenance = 'canonical' | 'alias' | 'rule-inferred' | 'nlp-inferred';

export interface SourcePoint {
  offset: number;
  line: number;
  column: number;
}

export interface SourceRange {
  start: SourcePoint;
  end: SourcePoint;
}

export interface SemanticSource {
  filePath: string;
  rawMarkdown: string;
}

export interface SemanticPreamble {
  markdown: string;
  text: string;
  range: SourceRange;
  empty: boolean;
}

export type SectionKey = string;
export type ContentShape = 'prose' | 'list' | 'task-list' | 'references' | 'mixed' | 'empty';

export interface SemanticSubsection {
  heading: string;
  headingLevel: 3 | 4 | 5 | 6;
  headingRange: SourceRange;
  range: SourceRange;
  markdown: string;
  text: string;
  children: SemanticSubsection[];
}

export interface OrderedSection {
  index: number;
  heading: string;
  normalizedHeading: string;
  headingLevel: 2;
  key: SectionKey | null;
  provenance: Exclude<SemanticProvenance, 'nlp-inferred'>;
  headingRange: SourceRange;
  contentRange: SourceRange;
  range: SourceRange;
  markdown: string;
  contentMarkdown: string;
  text: string;
  contentShape: ContentShape;
  empty: boolean;
  subsections: SemanticSubsection[];
}

export interface SemanticCriterion {
  id: string;
  checked: true | false | null;
  markdown: string;
  text: string;
  range: SourceRange;
  sectionIndex: number;
  listDepth: number;
  parentCriterionId: string | null;
  provenance: Exclude<SemanticProvenance, 'nlp-inferred'>;
}

export interface SemanticFinding {
  markdown: string;
  text: string;
  range: SourceRange;
  sectionIndex: number;
  provenance: Exclude<SemanticProvenance, 'nlp-inferred'>;
}

export interface SemanticQuestion {
  markdown: string;
  text: string;
  range: SourceRange;
  sectionIndex: number;
  provenance: Exclude<SemanticProvenance, 'nlp-inferred'>;
}

export interface SemanticDecisionStatement {
  markdown: string;
  text: string;
  range: SourceRange;
  sectionIndex: number;
  provenance: Exclude<SemanticProvenance, 'nlp-inferred'>;
}

export interface SemanticReference {
  kind: 'link' | 'autolink' | 'bare-entity-id';
  label: string | null;
  target: string;
  range: SourceRange;
  sectionIndex: number | null;
  provenance: Exclude<SemanticProvenance, 'nlp-inferred'>;
}

export type MentionEntityType = 'task' | 'epic' | 'milestone' | 'decision';

export interface EntityMention {
  id: string;
  entityType: MentionEntityType;
  form: 'prose' | 'link-label' | 'link-target';
  range: SourceRange;
  sectionIndex: number | null;
  referenceTarget: string | null;
  resolved: boolean | null;
  authoritative: false;
  provenance: 'rule-inferred' | 'nlp-inferred';
}

export interface KnownSectionView {
  [key: SectionKey]: OrderedSection[];
}

export interface ConformanceSummary {
  baseline: 'conformant' | 'nonconformant';
  automationReady: 'conformant' | 'nonconformant' | 'not-evaluated';
  lifecycle: 'conformant' | 'nonconformant' | 'not-applicable' | 'not-evaluated';
}

export type SemanticSeverity = 'info' | 'warning' | 'error';

export interface DiagnosticRepair {
  summary: string;
  kind: 'edit-markdown' | 'edit-frontmatter' | 'format' | 'none';
  previewable: boolean;
}

export interface SemanticDiagnostic {
  code: string;
  severity: SemanticSeverity;
  message: string;
  range: SourceRange | null;
  sectionIndex: number | null;
  provenance: SemanticProvenance;
  conformance: 'baseline' | 'automation-ready' | 'lifecycle' | 'analysis';
  repair: DiagnosticRepair;
  data?: Record<string, string | number | boolean | null>;
}

export interface AnalyzerIdentity {
  id: string;
  version: string;
}

export interface AnalyzerEvidence {
  text: string;
  range: SourceRange;
}

export interface AdvisorySignal {
  kind: string;
  message: string;
  language: string;
  analyzer: AnalyzerIdentity;
  provenance: 'nlp-inferred';
  range: SourceRange;
  evidence: AnalyzerEvidence[];
  confidence: number | null;
  authoritative: false;
  data: Record<string, string | number | boolean | null>;
}

export interface AnalyzerResult {
  analyzer: AnalyzerIdentity;
  language: string;
  signals: AdvisorySignal[];
  diagnostics: SemanticDiagnostic[];
}

export interface SemanticDocument {
  contractVersion: SemanticContractVersion;
  profile: { entityType: EntityType; version: SemanticProfileVersion };
  source: SemanticSource;
  preamble: SemanticPreamble;
  sections: OrderedSection[];
  knownSections: KnownSectionView;
  criteria: SemanticCriterion[];
  findings: SemanticFinding[];
  questions: SemanticQuestion[];
  decisions: SemanticDecisionStatement[];
  references: SemanticReference[];
  mentions: EntityMention[];
  diagnostics: SemanticDiagnostic[];
  conformance: ConformanceSummary;
  analyzerResults: AnalyzerResult[];
}

export interface AnalyzerRequest {
  document: SemanticDocument;
  language: string;
}

export interface SemanticAnalyzer {
  readonly identity: AnalyzerIdentity;
  readonly supportedLanguages: readonly string[];
  analyze(request: AnalyzerRequest): Promise<AnalyzerResult>;
}

export interface SemanticSectionDefinition {
  key: SectionKey;
  canonicalHeading: string;
  aliases: readonly string[];
  cardinality: '0..1';
  expectedContent: ContentShape | 'prose-or-list' | 'list-or-references';
}

export interface SemanticContentProfile {
  entityType: EntityType;
  version: SemanticProfileVersion;
  sections: readonly SemanticSectionDefinition[];
}

export interface ParseSemanticDocumentOptions {
  filePath?: string;
}
