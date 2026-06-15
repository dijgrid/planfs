/**
 * Validate command
 * Validates the repository for errors
 */

import {
  loadRepository,
  validateRepositoryState,
  getAllEntities
} from 'planfs-core';

export interface ValidateOptions {
  verbose?: boolean;
}

export async function validateCommand(
  rootPath: string,
  options: ValidateOptions
): Promise<number> {
  try {
    console.log('Loading repository...');
    const repo = await loadRepository(rootPath);

    const entities = getAllEntities(repo);
    console.log(`Found ${entities.length} entities`);
    console.log(`  Tasks: ${repo.tasks.size}`);
    console.log(`  Epics: ${repo.epics.size}`);
    console.log(`  Milestones: ${repo.milestones.size}`);
    console.log(`  Decisions: ${repo.decisions.size}`);

    console.log('\nValidating...');
    const result = validateRepositoryState(repo);

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
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    return 1;
  }
}
