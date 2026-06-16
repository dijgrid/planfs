/**
 * Git helper commands
 */

import {
  suggestCommitMessage,
  validateCommitMessage
} from 'planfs-core';

export type GitAction = 'commit-message' | 'validate-message';

export interface GitCommandOptions {
  base?: string;
  format?: 'text' | 'json';
}

export async function gitCommand(
  rootPath: string,
  action: GitAction,
  message: string | undefined,
  options: GitCommandOptions
): Promise<number> {
  try {
    if (action === 'commit-message') {
      const suggestion = await suggestCommitMessage(rootPath, {
        baseRef: options.base
      });

      if (options.format === 'json') {
        console.log(JSON.stringify(suggestion, null, 2));
      } else {
        console.log(suggestion.message);
      }

      return 0;
    }

    if (!message) {
      console.error('Error: commit message is required');
      return 1;
    }

    const result = await validateCommitMessage(rootPath, message);

    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.valid) {
      console.log('Commit message task references are valid.');
      for (const warning of result.warnings) {
        console.log(`Warning: ${warning}`);
      }
    } else {
      console.log(
        `Commit message references missing task IDs: ${result.missingTaskIds.join(', ')}`
      );
    }

    return result.valid ? 0 : 1;
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    return 1;
  }
}
