/**
 * Show command
 * Display details for a specific entity
 */

import { getTaskPullRequestRefs, loadRepository } from 'planfs-core';
import type { Task } from 'planfs-core';

export interface ShowOptions {
  format?: 'pretty' | 'json';
}

export async function showCommand(
  rootPath: string,
  entityId: string,
  options: ShowOptions
): Promise<number> {
  try {
    const repo = await loadRepository(rootPath);
    const entities = [
      ...Array.from(repo.tasks.values()),
      ...Array.from(repo.epics.values()),
      ...Array.from(repo.milestones.values()),
      ...Array.from(repo.decisions.values())
    ];

    const entity = entities.find(e => e.id === entityId);

    if (!entity) {
      console.error(`Entity not found: ${entityId}`);
      return 1;
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(entity, null, 2));
    } else {
      // Pretty format
      console.log(`\n${entity.type.toUpperCase()}: ${entity.id}`);
      console.log('='.repeat(60));
      console.log(`Title: ${entity.title}`);
      if (entity.status) {
        console.log(`Status: ${entity.status}`);
      }

      // Type-specific details
      if (entity.type === 'task') {
        const task = entity as Task;
        if (task.priority) console.log(`Priority: ${task.priority}`);
        if (task.assignee) console.log(`Assignee: ${task.assignee}`);
        if (task.epic) console.log(`Epic: ${task.epic}`);
        if (task.milestone) console.log(`Milestone: ${task.milestone}`);
        if (task.dueDate) console.log(`Due Date: ${task.dueDate}`);
        if (task.dependsOn && task.dependsOn.length > 0) {
          console.log(`Depends on: ${task.dependsOn.join(', ')}`);
        }
        const pullRequests = getTaskPullRequestRefs(task);
        if (pullRequests.length > 0) {
          console.log('Pull Requests:');
          for (const pr of pullRequests) {
            console.log(`  - ${pr.provider}: ${pr.status} (${pr.url})`);
          }
        }
      } else if (entity.type === 'milestone') {
        const milestone = entity as any;
        if (milestone.targetDate) console.log(`Target Date: ${milestone.targetDate}`);
        if (milestone.owner) console.log(`Owner: ${milestone.owner}`);
      }

      console.log('\nDescription:');
      console.log('-'.repeat(60));
      console.log(entity.body || '(none)');
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
