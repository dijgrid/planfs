/**
 * List command
 * Lists tasks and other entities
 */

import {
  loadRepository,
  getTasksByStatus,
  getTasksByAssignee,
  getTasksByEpic
} from 'planfs-core';
import { Entity, Task } from 'planfs-core';

export interface ListOptions {
  type?: 'tasks' | 'epics' | 'milestones' | 'decisions';
  status?: string;
  assignee?: string;
  epic?: string;
  format?: 'table' | 'json';
}

export async function listCommand(
  rootPath: string,
  options: ListOptions
): Promise<number> {
  try {
    const repo = await loadRepository(rootPath);
    const entityType = options.type || 'tasks';

    let results: Entity[] = [];

    if (entityType === 'tasks') {
      let tasks = Array.from(repo.tasks.values());

      if (options.status) {
        tasks = getTasksByStatus(repo, options.status as Task['status']);
      }

      if (options.assignee) {
        tasks = getTasksByAssignee(repo, options.assignee);
      }

      if (options.epic) {
        tasks = getTasksByEpic(repo, options.epic);
      }

      results = tasks;
    } else if (entityType === 'epics') {
      results = Array.from(repo.epics.values());
    } else if (entityType === 'milestones') {
      results = Array.from(repo.milestones.values());
    } else if (entityType === 'decisions') {
      results = Array.from(repo.decisions.values());
    }

    if (results.length === 0) {
      console.log('No entities found');
      return 0;
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      // Table format
      console.log(
        `\n${entityType.toUpperCase()} (${results.length} total)\n`
      );

      if (entityType === 'tasks') {
        const tasks = results as Task[];
        console.log(
          'ID          | Title                        | Status       | Priority | Assignee'
        );
        console.log(
          '------------|------------------------------|--------------|----------|----------'
        );
        for (const task of tasks) {
          const id = formatCell(task.id, 11);
          const title = formatCell(task.title || '', 28);
          const status = formatCell(task.status || '', 12);
          const priority = formatCell(task.priority || '-', 8);
          const assignee = task.assignee || '-';
          console.log(`${id} | ${title} | ${status} | ${priority} | ${assignee}`);
        }
      } else {
        // Generic table for other types
        console.log('ID          | Title                        | Status');
        console.log(
          '------------|------------------------------|----------'
        );
        for (const entity of results) {
          const id = formatCell(entity.id, 11);
          const title = formatCell(entity.title || '', 28);
          const status = entity.status as string || '-';
          console.log(`${id} | ${title} | ${status}`);
        }
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

function formatCell(value: string, width: number): string {
  if (value.length > width) {
    return `${value.slice(0, width - 1)}…`;
  }
  return value.padEnd(width);
}
