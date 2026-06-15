/**
 * Create command
 * Create new entities
 */

import {
  loadRepository,
  saveEntity,
  createTaskTemplate,
  getNextTaskId,
  initializeRepository
} from 'planfs-core';

export interface CreateOptions {
  title?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  nonInteractive?: boolean;
}

export async function createCommand(
  rootPath: string,
  entityType: string,
  options: CreateOptions
): Promise<number> {
  try {
    if (entityType !== 'task') {
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

    console.log(`✓ Created task: ${task.id}`);
    console.log(`  Title: ${task.title}`);
    console.log(`  Status: ${task.status}`);

    return 0;
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    );
    return 1;
  }
}
