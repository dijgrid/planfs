/**
 * Core entity types for PlanFS
 */

export type EntityType = 'task' | 'epic' | 'milestone' | 'decision';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type EpicStatus = 'active' | 'completed' | 'on-hold' | 'archived';
export type MilestoneStatus = 'active' | 'completed' | 'delayed';
export type DecisionStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  type: EntityType;
  filePath: string;
  metadata: Record<string, unknown>;
  body: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Task entity
 */
export interface Task extends BaseEntity {
  type: 'task';
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  epic?: string;
  milestone?: string;
  dependsOn?: string[];
  tags?: string[];
  dueDate?: string;
  estimate?: string;
  links?: Record<string, string>;
}

/**
 * Epic entity
 */
export interface Epic extends BaseEntity {
  type: 'epic';
  title: string;
  status: EpicStatus;
  priority?: TaskPriority;
  owner?: string;
  description?: string;
  targetDate?: string;
  tags?: string[];
  links?: Record<string, string>;
}

/**
 * Milestone entity
 */
export interface Milestone extends BaseEntity {
  type: 'milestone';
  title: string;
  status: MilestoneStatus;
  targetDate: string;
  description?: string;
  owner?: string;
  links?: Record<string, string>;
}

/**
 * Decision entity
 */
export interface Decision extends BaseEntity {
  type: 'decision';
  title: string;
  status: DecisionStatus;
  date?: string;
  context?: string;
  decision?: string;
  consequences?: string;
  author?: string;
  supersedes?: string;
  supersededBy?: string;
}

/**
 * Union type for all entities
 */
export type Entity = Task | Epic | Milestone | Decision;

/**
 * Repository snapshot containing all loaded entities
 */
export interface Repository {
  root: string;
  tasks: Map<string, Task>;
  epics: Map<string, Epic>;
  milestones: Map<string, Milestone>;
  decisions: Map<string, Decision>;
}

/**
 * Validation result
 */
export interface ValidationError {
  id?: string;
  path?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
