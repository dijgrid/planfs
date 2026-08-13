/**
 * Validate command
 * Validates the repository for errors
 */

import {
  loadRepository,
  validateRepositoryState,
  getAllEntities
} from 'planfs-core';
import type { ValidationResult } from 'planfs-core';

export interface ValidateOptions {
  verbose?: boolean;
  strict?: boolean;
  format?: 'text' | 'json';
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
    const errors = result.errors.filter(e => e.severity === 'error');
    const warnings = result.errors.filter(e => e.severity === 'warning');
    const severityCounts = { errors: errors.length, warnings: warnings.length };
    const categoryCounts = result.errors.reduce<Record<string, number>>((counts, diagnostic) => {
      const category = diagnostic.message.split(':', 1)[0].toLowerCase().replace(/\s+/g, '-');
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    }, {});

    if (format === 'json') {
      writeJson({
        valid: result.valid,
        summary,
        severityCounts,
        categoryCounts,
        result
      });
      return result.valid && (!options.strict || warnings.length === 0) ? 0 : 1;
    }

    if (!result.valid) {
      console.log('✗ Validation failed with errors:\n');
    }
    if (result.valid) console.log('✓ Repository is valid!');
    console.log(`Warnings: ${warnings.length} | Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\nErrors (${errors.length}):`);
      for (const error of errors) printDiagnostic('✗', error, options.verbose);
    }
    if (warnings.length > 0 && (options.verbose || !result.valid)) {
      console.log(`\nWarnings (${warnings.length}):`);
      for (const warning of warnings) printDiagnostic('⚠', warning, options.verbose);
    }
    if (options.strict && warnings.length > 0 && errors.length === 0) {
      console.log('✗ Strict validation failed because warnings are present.');
    }
    return errors.length > 0 || (options.strict && warnings.length > 0) ? 1 : 0;
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
