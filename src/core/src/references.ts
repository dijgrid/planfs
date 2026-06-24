/**
 * Shared reference semantics for active and archived planning entities.
 */

import { Entity, Repository, Task } from './types';

export function listArchivedReferenceEntities(repository: Repository): Entity[] {
  return [
    ...Array.from(repository.archivedTasks?.values() ?? []),
    ...Array.from(repository.archivedEpics?.values() ?? [])
  ];
}

export function findTaskReference(repository: Repository, taskId: string): Task | undefined {
  return repository.tasks.get(taskId) ?? repository.archivedTasks?.get(taskId);
}

export function isArchivedReference(entity: Entity | undefined): boolean {
  return Boolean(entity?.archive);
}

export function isTaskReferenceSatisfied(repository: Repository, taskId: string): boolean {
  return Boolean(findTaskReference(repository, taskId));
}

export function isTaskDependencyBlocking(repository: Repository, taskId: string): boolean {
  const task = repository.tasks.get(taskId);
  return Boolean(task && task.status !== 'done');
}
