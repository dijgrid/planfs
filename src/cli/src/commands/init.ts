/**
 * Init command
 * Initializes PlanFS repository structure
 */

import { initializeRepository } from 'planfs-core';

export interface InitOptions {
  format?: 'text' | 'json';
}

export async function initCommand(
  rootPath: string,
  options: InitOptions
): Promise<number> {
  try {
    const result = await initializeRepository(rootPath);

    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
      return 0;
    }

    console.log('Initialized PlanFS repository');

    if (result.created.length > 0) {
      console.log('Created:');
      for (const dir of result.created) {
        console.log(`  - ${dir}`);
      }
    }

    if (result.existing.length > 0) {
      console.log('Already existed:');
      for (const dir of result.existing) {
        console.log(`  - ${dir}`);
      }
    }

    return 0;
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    return 1;
  }
}
