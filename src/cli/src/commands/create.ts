/**
 * Create command
 * Create new entities
 */

import {
  Entity,
  Repository,
  loadRepository,
  saveEntity,
  createTaskTemplate,
  createEpicTemplate,
  createMilestoneTemplate,
  getNextTaskId,
  getNextEpicId,
  getNextMilestoneId,
  generateEntityContent,
  initializeRepository,
  validateRepositoryState
} from 'planfs-core';

export interface CreateOptions {
  title?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  owner?: string;
  description?: string;
  targetDate?: string;
  dryRun?: boolean;
  format?: 'text' | 'json';
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

    const repo = await loadRepositoryForCreate(rootPath, Boolean(options.dryRun));

    if (!options.dryRun && !repo) {
      console.log('Initializing repository...');
      await initializeRepository(rootPath);
    }
    const repository = repo ?? await loadRepository(rootPath);

    let entity: Entity;
    if (entityType === 'task') {
      const taskId = getNextTaskId(repository);
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
      entity = task;
    } else if (entityType === 'epic') {
      const epicId = getNextEpicId(repository, options.title);
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
      entity = epic;
    } else {
      if (!options.targetDate) {
        console.error('Error: --target-date is required when creating milestones');
        return 1;
      }
      const milestoneId = getNextMilestoneId(repository, options.title);
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
      entity = milestone;
    }

    const preview = generateEntityContent(entity);
    validateCreatePreview(repository, entity);
    if (!options.dryRun) {
      await saveEntity(rootPath, entity);
    }

    if (options.format === 'json') {
      console.log(JSON.stringify({
        type: entity.type,
        id: entity.id,
        dryRun: Boolean(options.dryRun),
        entity,
        preview
      }, null, 2));
      return 0;
    }

    printCreated(entity.type, entity.id, entity.title, entity.status, Boolean(options.dryRun));
    if (options.dryRun) {
      console.log('\n--- preview ---');
      console.log(preview.trimEnd());
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

function printCreated(
  entityType: string,
  id: string,
  title: string,
  status: string,
  dryRun = false
): void {
  console.log(`✓ ${dryRun ? 'Previewed' : 'Created'} ${entityType}: ${id}`);
  console.log(`  Title: ${title}`);
  console.log(`  Status: ${status}`);
}

async function loadRepositoryForCreate(
  rootPath: string,
  dryRun: boolean
): Promise<Repository | undefined> {
  try {
    return await loadRepository(rootPath);
  } catch {
    if (!dryRun) {
      return undefined;
    }
    return {
      root: rootPath,
      tasks: new Map(),
      epics: new Map(),
      milestones: new Map(),
      decisions: new Map(),
      archivedTasks: new Map(),
      archivedEpics: new Map()
    };
  }
}

function validateCreatePreview(
  repository: Repository,
  entity: Entity
): void {
  const previewRepository = {
    ...repository,
    tasks: new Map(repository.tasks),
    epics: new Map(repository.epics),
    milestones: new Map(repository.milestones),
    decisions: new Map(repository.decisions)
  };

  if (entity.type === 'task') {
    previewRepository.tasks.set(entity.id, entity);
  } else if (entity.type === 'epic') {
    previewRepository.epics.set(entity.id, entity);
  } else if (entity.type === 'milestone') {
    previewRepository.milestones.set(entity.id, entity);
  } else {
    previewRepository.decisions.set(entity.id, entity);
  }

  const errors = validateRepositoryState(previewRepository).errors
    .filter(error => error.severity === 'error');
  if (errors.length > 0) {
    throw new Error(`Create failed validation: ${errors.slice(0, 3).map(error => error.message).join('; ')}`);
  }
}
