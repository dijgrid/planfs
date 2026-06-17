/**
 * Pull request helper commands
 */

import {
  generatePullRequestSummary,
  getPullRequestProviderBoundaries
} from 'planfs-core';
import type { PullRequestProviderId } from 'planfs-core';

export type PullRequestAction = 'summary' | 'providers';

export interface PullRequestOptions {
  base?: string;
  provider?: PullRequestProviderId;
  format?: 'markdown' | 'json';
}

export async function pullRequestCommand(
  rootPath: string,
  action: PullRequestAction,
  options: PullRequestOptions
): Promise<number> {
  try {
    if (action === 'providers') {
      console.log(JSON.stringify(getPullRequestProviderBoundaries(), null, 2));
      return 0;
    }

    const summary = await generatePullRequestSummary(rootPath, {
      baseRef: options.base,
      provider: options.provider
    });

    if (options.format === 'json') {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(summary.markdown);
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
