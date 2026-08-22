/**
 * Serialize PlanFS entities to their Markdown representation.
 */

import { stringify as stringifyYaml } from 'yaml';
import { Decision, Entity, Epic, Milestone, Task } from './types';

export function generateEntityContent(entity: Entity): string {
  const metadata: Record<string, unknown> = { ...entity.metadata };

  metadata.id = entity.id;
  metadata.title = entity.title || '';
  metadata.status = entity.status || '';
  if (entity.archive) metadata.archive = entity.archive;

  switch (entity.type) {
    case 'task': {
      const task = entity as Task;
      if (task.priority) metadata.priority = task.priority;
      if (task.assignee) metadata.assignee = task.assignee;
      if (task.epic) metadata.epic = task.epic;
      if (task.milestone) metadata.milestone = task.milestone;
      if (task.dependsOn) metadata.dependsOn = task.dependsOn;
      if (task.tags) metadata.tags = task.tags;
      if (task.dueDate) metadata.dueDate = task.dueDate;
      if (task.estimate) metadata.estimate = task.estimate;
      if (task.refinementState) metadata.refinementState = task.refinementState;
      if (task.backlogOrder !== undefined) metadata.backlogOrder = task.backlogOrder;
      if (task.links) metadata.links = task.links;
      break;
    }
    case 'epic': {
      const epic = entity as Epic;
      if (epic.priority) metadata.priority = epic.priority;
      if (epic.owner) metadata.owner = epic.owner;
      if (epic.description) metadata.description = epic.description;
      if (epic.targetDate) metadata.targetDate = epic.targetDate;
      if (epic.tags) metadata.tags = epic.tags;
      if (epic.links) metadata.links = epic.links;
      break;
    }
    case 'milestone': {
      const milestone = entity as Milestone;
      metadata.targetDate = milestone.targetDate;
      if (milestone.description) metadata.description = milestone.description;
      if (milestone.owner) metadata.owner = milestone.owner;
      if (milestone.links) metadata.links = milestone.links;
      break;
    }
    case 'decision': {
      const decision = entity as Decision;
      if (decision.date) metadata.date = decision.date;
      if (decision.context) metadata.context = decision.context;
      if (decision.decision) metadata.decision = decision.decision;
      if (decision.consequences) metadata.consequences = decision.consequences;
      if (decision.author) metadata.author = decision.author;
      if (decision.supersedes) metadata.supersedes = decision.supersedes;
      if (decision.supersededBy) metadata.supersededBy = decision.supersededBy;
      break;
    }
  }

  if (entity.createdAt) metadata.createdAt = entity.createdAt;
  if (entity.updatedAt) metadata.updatedAt = entity.updatedAt;

  return `---\n${stringifyYaml(metadata).trimEnd()}\n---\n\n${entity.body}`;
}
