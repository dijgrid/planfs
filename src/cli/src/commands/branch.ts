/**
 * Branch command
 * Shows planning changes for the current Git branch
 */

import { getBranchPlanningContext } from 'planfs-core';

export interface BranchOptions {
  base?: string;
  format?: 'text' | 'json';
}

export async function branchCommand(
  rootPath: string,
  options: BranchOptions
): Promise<number> {
  try {
    const context = await getBranchPlanningContext(rootPath, {
      baseRef: options.base
    });

    if (options.format === 'json') {
      console.log(JSON.stringify(context, null, 2));
      return 0;
    }

    console.log(`\nBranch: ${context.currentBranch}`);
    console.log(`Base: ${context.baseRef}`);
    console.log(`Related tasks: ${formatList(context.relatedTaskIds)}`);
    console.log(`Changed PlanFS files: ${context.changedFiles.length}`);
    console.log('');
    console.log(context.pullRequestPreview.summary);

    printTaskSection(
      'Added tasks',
      context.addedTasks.map(task => `${task.id} ${task.title}`)
    );
    printTaskSection(
      'Modified tasks',
      context.modifiedTasks.map(task => {
        const previous = task.previous
          ? ` (${task.previous.status} -> ${task.status})`
          : '';
        return `${task.id} ${task.title}${previous}`;
      })
    );
    printTaskSection('Deleted tasks', context.deletedTaskIds);

    if (context.conflicts.length > 0) {
      console.log('\nPlanFS conflicts:');
      for (const conflict of context.conflicts) {
        console.log(`  - ${conflict.path} [${conflict.status}]`);
        console.log(`    ${conflict.suggestion}`);
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

function printTaskSection(title: string, rows: string[]): void {
  console.log(`\n${title}:`);
  if (rows.length === 0) {
    console.log('  none');
    return;
  }

  for (const row of rows) {
    console.log(`  - ${row}`);
  }
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : 'none';
}
