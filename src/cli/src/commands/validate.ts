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

    if (format === 'json') {
      writeJson({
        valid: result.valid,
        summary,
        result
      });
      return result.valid ? 0 : 1;
    }

    if (result.valid) {
      console.log('✓ Repository is valid!');
      return 0;
    } else {
      console.log('✗ Validation failed with errors:\n');

      // Group errors by severity
      const errors = result.errors.filter(e => e.severity === 'error');
      const warnings = result.errors.filter(e => e.severity === 'warning');

      if (errors.length > 0) {
        console.log(`\nErrors (${errors.length}):`);
        for (const error of errors) {
          const id = error.id ? ` [${error.id}]` : '';
          console.log(`  ✗${id} ${error.message}`);
          if (options.verbose && error.path) {
            console.log(`    Path: ${error.path}`);
          }
        }
      }

      if (warnings.length > 0) {
        console.log(`\nWarnings (${warnings.length}):`);
        for (const warning of warnings) {
          const id = warning.id ? ` [${warning.id}]` : '';
          console.log(`  ⚠${id} ${warning.message}`);
        }
      }

      return 1;
    }
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

function writeJson(output: ValidateOutput): void {
  console.log(JSON.stringify(output, null, 2));
}
