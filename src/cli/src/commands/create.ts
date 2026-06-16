/**
 * Create command
 * Create new entities
 */

import {
  loadRepository,
  saveEntity,
  createTaskTemplate,
  createEpicTemplate,
  createMilestoneTemplate,
  getNextTaskId,
  getNextEpicId,
  getNextMilestoneId,
  initializeRepository
} from 'planfs-core';

export interface CreateOptions {
  title?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  owner?: string;
  description?: string;
  targetDate?: string;
  nonInteractive?: boolean;
}

export async function createCommand(
  rootPath: string,
  entityType: string,
  options: CreateOptions
): Promise<number> {
  try {
    if (!['task', 'epic', 'milestone'].includes(entityType)) {
      console.error(`Error: creating ${entityType} entities is not supported yet`);
      return 1;
    }

    if (!options.title) {
      if (options.nonInteractive) {
        console.error('Error: --title is required in non-interactive mode');
        return 1;
      }
      // In interactive mode, we would prompt for input
      // For MVP, we require --title
      console.error('Error: --title is required');
      return 1;
    }

    // Ensure repository is initialized
    try {
      await loadRepository(rootPath);
    } catch {
      console.log('Initializing repository...');
      await initializeRepository(rootPath);
    }

    const repo = await loadRepository(rootPath);
    if (entityType === 'task') {
      const taskId = getNextTaskId(repo);
      const task = createTaskTemplate(taskId, options.title);

      if (options.status) {
        task.status = options.status as any;
      }
      if (options.priority) {
        task.priority = options.priority as any;
      }
      if (options.assignee) {
        task.assignee = options.assignee;
      }

      await saveEntity(rootPath, task);
      printCreated('task', task.id, task.title, task.status);
      return 0;
    }

    if (entityType === 'epic') {
      const epicId = getNextEpicId(repo, options.title);
      const epic = createEpicTemplate(epicId, options.title);

      if (options.status) {
        epic.status = options.status as any;
      }
      if (options.owner) {
        epic.owner = options.owner;
      }
      if (options.description) {
        epic.description = options.description;
        epic.body = options.description;
      }

      await saveEntity(rootPath, epic);
      printCreated('epic', epic.id, epic.title, epic.status);
      return 0;
    }

    if (!options.targetDate) {
      console.error('Error: --target-date is required when creating milestones');
      return 1;
    }

    const milestoneId = getNextMilestoneId(repo, options.title);
    const milestone = createMilestoneTemplate(
      milestoneId,
      options.title,
      options.targetDate
    );

    if (options.status) {
      milestone.status = options.status as any;
    }
    if (options.owner) {
      milestone.owner = options.owner;
    }
    if (options.description) {
      milestone.description = options.description;
      milestone.body = options.description;
    }

    await saveEntity(rootPath, milestone);
    printCreated('milestone', milestone.id, milestone.title, milestone.status);

    return 0;
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    return 1;
  }
}

function printCreated(
  entityType: string,
  id: string,
  title: string,
  status: string
): void {
  console.log(`✓ Created ${entityType}: ${id}`);
  console.log(`  Title: ${title}`);
  console.log(`  Status: ${status}`);
}
