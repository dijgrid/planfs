/** Semantic entity inspection command. */

import {
  getAllEntities,
  inspectSemanticEntity,
  loadRepository,
  selectSemanticInspectionView
} from 'planfs-core';
import type {
  AuthoritativeRelationships,
  SemanticAdvisoryConclusion,
  SemanticInspectionResult,
  SemanticInspectionView,
  SemanticValidationDiagnostic
} from 'planfs-core';

export interface InspectOptions {
  format?: 'pretty' | 'json';
  view?: SemanticInspectionView;
  nlp?: boolean;
  language?: string;
}

export async function inspectCommand(
  rootPath: string,
  entityId: string,
  options: InspectOptions = {}
): Promise<number> {
  try {
    const repository = await loadRepository(rootPath);
    const entity = getAllEntities(repository).find(candidate => candidate.id === entityId);
    if (!entity) {
      console.error(`Entity not found: ${entityId}`);
      return 1;
    }

    const inspection = await inspectSemanticEntity(entity, {
      tier: 'automation-ready',
      analysis: options.nlp !== false,
      language: options.language ?? 'en'
    });
    const view = options.view ?? 'all';

    if (options.format === 'json') {
      console.log(JSON.stringify(selectSemanticInspectionView(inspection, view), null, 2));
    } else {
      printInspection(inspection, view);
    }
    return 0;
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function printInspection(inspection: SemanticInspectionResult, view: SemanticInspectionView): void {
  console.log(`\n${inspection.entity.type.toUpperCase()}: ${inspection.entity.id}`);
  console.log('='.repeat(60));
  console.log(`${inspection.entity.title} [${inspection.entity.status}]`);

  switch (view) {
    case 'acceptance-criteria':
      printCriteria(inspection);
      break;
    case 'findings':
      printFindings(inspection);
      break;
    case 'sections':
      printSections(inspection);
      break;
    case 'mentions':
      printMentions(inspection);
      break;
    case 'relationships':
      printRelationships(inspection.authoritative.relationships);
      printMentions(inspection);
      break;
    case 'raw':
      console.log('\nRaw Markdown:');
      console.log('-'.repeat(60));
      console.log(inspection.semantic.source.rawMarkdown || '(empty)');
      break;
    case 'all':
      printRelationships(inspection.authoritative.relationships);
      console.log('\nSummary:');
      console.log(inspection.semantic.preamble.text || '(none)');
      printCriteria(inspection);
      printFindings(inspection);
      printSections(inspection);
      printConclusions(inspection.advisory.conclusions, inspection.analysis !== null);
      break;
  }

  printDiagnostics(inspection.diagnostics);
}

function printRelationships(relationships: AuthoritativeRelationships): void {
  console.log('\nAuthoritative relationships:');
  console.log(`  Depends on: ${relationships.dependsOn.join(', ') || '(none)'}`);
  console.log(`  Epic: ${relationships.epic ?? '(none)'}`);
  console.log(`  Milestone: ${relationships.milestone ?? '(none)'}`);
  console.log(`  Supersedes: ${relationships.supersedes ?? '(none)'}`);
  console.log(`  Superseded by: ${relationships.supersededBy ?? '(none)'}`);
}

function printCriteria(inspection: SemanticInspectionResult): void {
  console.log('\nAcceptance criteria:');
  if (inspection.semantic.criteria.length === 0) {
    console.log('  (none)');
    return;
  }
  for (const criterion of inspection.semantic.criteria) {
    const marker = criterion.checked === true ? '[x]' : criterion.checked === false ? '[ ]' : '[-]';
    console.log(`  ${marker} ${criterion.text} (${location(criterion.range)})`);
  }
}

function printFindings(inspection: SemanticInspectionResult): void {
  console.log('\nFindings:');
  if (inspection.semantic.findings.length === 0) {
    console.log('  (none)');
    return;
  }
  for (const finding of inspection.semantic.findings) {
    console.log(`  - ${finding.text} (${location(finding.range)})`);
  }
}

function printSections(inspection: SemanticInspectionResult): void {
  console.log('\nOrdered sections:');
  if (inspection.semantic.sections.length === 0) {
    console.log('  (none)');
    return;
  }
  for (const section of inspection.semantic.sections) {
    const identity = section.key ?? 'custom';
    console.log(
      `  ${section.index + 1}. ${section.heading} [${identity}, ${section.provenance}, ${section.contentShape}] (${location(section.headingRange)})`
    );
  }
}

function printMentions(inspection: SemanticInspectionResult): void {
  console.log('\nAdvisory body mentions:');
  if (inspection.advisory.mentions.length === 0) {
    console.log('  (none)');
    return;
  }
  for (const mention of inspection.advisory.mentions) {
    console.log(`  - ${mention.id} via ${mention.form} (${location(mention.range)})`);
  }
  console.log('  Prose mentions are advisory and never change frontmatter relationships.');
}

function printConclusions(
  conclusions: SemanticAdvisoryConclusion[],
  analysisEnabled: boolean
): void {
  console.log('\nAdvisory suggestions:');
  if (!analysisEnabled) {
    console.log('  (local analysis disabled)');
    return;
  }
  if (conclusions.length === 0) {
    console.log('  (no actionable suggestions)');
    return;
  }
  for (const conclusion of conclusions) {
    console.log(`  - ${conclusion.message} (${location(conclusion.range)})`);
    console.log(`    ${conclusion.repair.summary}`);
  }
  console.log('  Suggestions are advisory; no Markdown or metadata was changed.');
}

function printDiagnostics(diagnostics: SemanticValidationDiagnostic[]): void {
  console.log('\nDiagnostics:');
  if (diagnostics.length === 0) {
    console.log('  (none)');
    return;
  }
  for (const diagnostic of diagnostics) {
    const at = diagnostic.range ? ` (${location(diagnostic.range)})` : '';
    console.log(`  ${diagnostic.severity.toUpperCase()} ${diagnostic.code}${at}: ${diagnostic.message}`);
    console.log(`    Repair: ${diagnostic.repair.summary}`);
  }
}

function location(range: { start: { line: number; column: number } }): string {
  return `${range.start.line}:${range.start.column}`;
}
