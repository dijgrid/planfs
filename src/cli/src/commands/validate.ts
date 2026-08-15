/**
 * Validate command
 * Validates the repository for errors
 */

import {
  loadRepository,
  validateRepositoryState,
  getAllEntities,
  validateSemanticRepository
} from 'planfs-core';
import type {
  CriterionCheckStatePolicy,
  SemanticRepositoryValidationResult,
  SemanticValidationDiagnostic,
  SemanticValidationTier,
  ValidationResult
} from 'planfs-core';

export interface ValidateOptions {
  verbose?: boolean;
  strict?: boolean;
  format?: 'text' | 'json';
  semantic?: SemanticValidationTier;
  lifecycle?: boolean;
  criterionCheckState?: CriterionCheckStatePolicy;
  nlp?: boolean;
  language?: string;
}

interface ValidateSummary {
  entities: number;
  tasks: number;
  epics: number;
  milestones: number;
  decisions: number;
}

interface ValidateOutput {
  valid: boolean;
  summary: ValidateSummary;
  severityCounts: { errors: number; warnings: number };
  categoryCounts: Record<string, number>;
  result: ValidationResult;
  semantic?: SemanticRepositoryValidationResult;
}

export async function validateCommand(
  rootPath: string,
  options: ValidateOptions
): Promise<number> {
  const format = options.format ?? 'text';

  try {
    if (format === 'text') {
      console.log('Loading repository...');
    }

    const repo = await loadRepository(rootPath);

    const entities = getAllEntities(repo);
    const summary: ValidateSummary = {
      entities: entities.length,
      tasks: repo.tasks.size,
      epics: repo.epics.size,
      milestones: repo.milestones.size,
      decisions: repo.decisions.size
    };

    if (format === 'text') {
      console.log(`Found ${summary.entities} entities`);
      console.log(`  Tasks: ${summary.tasks}`);
      console.log(`  Epics: ${summary.epics}`);
      console.log(`  Milestones: ${summary.milestones}`);
      console.log(`  Decisions: ${summary.decisions}`);
      console.log('\nValidating...');
    }

    const result = validateRepositoryState(repo);
    const semanticTier = options.semantic ?? (
      options.lifecycle === true || options.nlp === true ? 'automation-ready' : undefined
    );
    const semantic = semanticTier
      ? await validateSemanticRepository(repo, {
        tier: semanticTier,
        lifecycle: options.lifecycle,
        criterionCheckState: options.criterionCheckState,
        analysis: options.nlp,
        language: options.language
      })
      : undefined;
    const errors = result.errors.filter(e => e.severity === 'error');
    const warnings = result.errors.filter(e => e.severity === 'warning');
    const severityCounts = { errors: errors.length, warnings: warnings.length };
    const categoryCounts = result.errors.reduce<Record<string, number>>((counts, diagnostic) => {
      const category = diagnostic.message.split(':', 1)[0].toLowerCase().replace(/\s+/g, '-');
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    }, {});

    const semanticWarnings = semantic?.diagnostics.filter(diagnostic => diagnostic.severity === 'warning') ?? [];
    const semanticErrors = semantic?.diagnostics.filter(diagnostic => diagnostic.severity === 'error') ?? [];
    const overallValid = result.valid && semanticErrors.length === 0;
    const strictFailure = options.strict === true && (warnings.length > 0 || semanticWarnings.length > 0);

    if (format === 'json') {
      writeJson({
        valid: overallValid,
        summary,
        severityCounts,
        categoryCounts,
        result,
        ...(semantic ? { semantic } : {})
      });
      return overallValid && !strictFailure ? 0 : 1;
    }

    if (!overallValid) {
      console.log('✗ Validation failed with errors:\n');
    }
    if (overallValid) console.log('✓ Repository is valid!');
    console.log(`Warnings: ${warnings.length} | Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\nErrors (${errors.length}):`);
      for (const error of errors) printDiagnostic('✗', error, options.verbose);
    }
    if (warnings.length > 0 && (options.verbose || !result.valid)) {
      console.log(`\nWarnings (${warnings.length}):`);
      for (const warning of warnings) printDiagnostic('⚠', warning, options.verbose);
    }
    if (semantic) printSemanticValidation(semantic, options.verbose);
    if (strictFailure && errors.length === 0 && semanticErrors.length === 0) {
      console.log('✗ Strict validation failed because warnings are present.');
    }
    return errors.length > 0 || semanticErrors.length > 0 || strictFailure ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (format === 'json') {
      writeJson({
        valid: false,
        summary: {
          entities: 0,
          tasks: 0,
          epics: 0,
          milestones: 0,
          decisions: 0
        },
        severityCounts: { errors: 1, warnings: 0 },
        categoryCounts: { error: 1 },
        result: {
          valid: false,
          errors: [
            {
              message,
              severity: 'error'
            }
          ]
        }
      });
    } else {
      console.error('Error:', message);
    }

    return 1;
  }
}

function printDiagnostic(symbol: string, diagnostic: ValidationResult['errors'][number], verbose?: boolean): void {
  const id = diagnostic.id ? ` [${diagnostic.id}]` : '';
  console.log(`  ${symbol}${id} ${diagnostic.message}`);
  if (verbose && diagnostic.path) console.log(`    Path: ${diagnostic.path}`);
}

function writeJson(output: ValidateOutput): void {
  console.log(JSON.stringify(output, null, 2));
}

function printSemanticValidation(
  semantic: SemanticRepositoryValidationResult,
  verbose?: boolean
): void {
  console.log(`\nSemantic content (${semantic.tier}${semantic.lifecycle ? ', lifecycle' : ''}${semantic.analysisEnabled ? ', local analysis' : ''}):`);
  console.log(
    `  Info: ${semantic.severityCounts.info} | Warnings: ${semantic.severityCounts.warning} | Errors: ${semantic.severityCounts.error}`
  );
  if (semantic.diagnostics.length === 0) {
    console.log('  ✓ No semantic content diagnostics.');
    return;
  }
  for (const diagnostic of semantic.diagnostics) printSemanticDiagnostic(diagnostic, verbose);
}

function printSemanticDiagnostic(
  diagnostic: SemanticValidationDiagnostic,
  verbose?: boolean
): void {
  const symbol = diagnostic.severity === 'error' ? '✗' : diagnostic.severity === 'warning' ? '⚠' : 'ℹ';
  const location = diagnostic.range
    ? `:${diagnostic.range.start.line}:${diagnostic.range.start.column}`
    : '';
  console.log(`  ${symbol} [${diagnostic.entityId}] ${diagnostic.code}: ${diagnostic.message}`);
  console.log(`    ${diagnostic.filePath}${location}`);
  if (verbose) console.log(`    Repair: ${diagnostic.repair.summary}`);
}
