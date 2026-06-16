/**
 * Dependency graph and reporting utilities
 */

import { Epic, Milestone, Repository, Task, TaskStatus } from './types';

export interface TaskGraphNode {
  id: string;
  task: Task;
  dependsOn: string[];
  dependents: string[];
  missingDependencies: string[];
  level: number;
  critical: boolean;
}

export interface TaskGraph {
  nodes: Map<string, TaskGraphNode>;
  edges: Array<{ from: string; to: string }>;
  criticalPath: string[];
  missingDependencies: Array<{ taskId: string; dependencyId: string }>;
}

export interface EpicCompletionReport {
  epicId: string;
  title: string;
  total: number;
  done: number;
  percentDone: number;
}

export interface WorkloadReport {
  assignee: string;
  total: number;
  byStatus: Record<TaskStatus, number>;
}

export interface TimelineReport {
  milestoneId: string;
  title: string;
  targetDate: string;
  total: number;
  done: number;
  percentDone: number;
  status: Milestone['status'];
}

export interface RepositoryReports {
  epicCompletion: EpicCompletionReport[];
  workload: WorkloadReport[];
  timeline: TimelineReport[];
  blockedTasks: TaskGraphNode[];
}

const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];

export function buildTaskGraph(tasks: Iterable<Task>): TaskGraph {
  const taskMap = new Map<string, Task>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  const nodes = new Map<string, TaskGraphNode>();
  const edges: Array<{ from: string; to: string }> = [];
  const missingDependencies: Array<{ taskId: string; dependencyId: string }> = [];

  for (const task of taskMap.values()) {
    const dependsOn = task.dependsOn ?? [];
    const missing = dependsOn.filter(dependencyId => !taskMap.has(dependencyId));

    for (const dependencyId of dependsOn) {
      if (taskMap.has(dependencyId)) {
        edges.push({ from: dependencyId, to: task.id });
      } else {
        missingDependencies.push({ taskId: task.id, dependencyId });
      }
    }

    nodes.set(task.id, {
      id: task.id,
      task,
      dependsOn,
      dependents: [],
      missingDependencies: missing,
      level: 0,
      critical: false
    });
  }

  for (const edge of edges) {
    nodes.get(edge.from)?.dependents.push(edge.to);
  }

  const levelMemo = new Map<string, number>();
  for (const node of nodes.values()) {
    node.level = computeLevel(node.id, nodes, levelMemo, new Set());
  }

  const criticalPath = findCriticalPath(nodes);
  for (const taskId of criticalPath) {
    const node = nodes.get(taskId);
    if (node) {
      node.critical = true;
    }
  }

  return { nodes, edges, criticalPath, missingDependencies };
}

export function getTransitiveDependencies(
  taskId: string,
  graph: TaskGraph
): string[] {
  const dependencies = new Set<string>();
  collectDependencies(taskId, graph, dependencies);
  return Array.from(dependencies);
}

export function generateReports(repository: Repository): RepositoryReports {
  const graph = buildTaskGraph(repository.tasks.values());
  const tasks = Array.from(repository.tasks.values());

  return {
    epicCompletion: generateEpicCompletion(repository.epics, tasks),
    workload: generateWorkload(tasks),
    timeline: generateTimeline(repository.milestones, tasks),
    blockedTasks: Array.from(graph.nodes.values()).filter(
      node => node.missingDependencies.length > 0
    )
  };
}

function computeLevel(
  taskId: string,
  nodes: Map<string, TaskGraphNode>,
  memo: Map<string, number>,
  visiting: Set<string>
): number {
  const cached = memo.get(taskId);
  if (cached !== undefined) {
    return cached;
  }

  const node = nodes.get(taskId);
  if (!node || visiting.has(taskId)) {
    return 0;
  }

  visiting.add(taskId);
  const validDependencies = node.dependsOn.filter(dependencyId =>
    nodes.has(dependencyId)
  );
  const level =
    validDependencies.length === 0
      ? 0
      : Math.max(
          ...validDependencies.map(
            dependencyId =>
              computeLevel(dependencyId, nodes, memo, new Set(visiting)) + 1
          )
        );

  memo.set(taskId, level);
  return level;
}

function findCriticalPath(nodes: Map<string, TaskGraphNode>): string[] {
  const memo = new Map<string, string[]>();
  let longest: string[] = [];

  for (const node of nodes.values()) {
    const path = longestPathFrom(node.id, nodes, memo, new Set());
    if (path.length > longest.length) {
      longest = path;
    }
  }

  return longest;
}

function longestPathFrom(
  taskId: string,
  nodes: Map<string, TaskGraphNode>,
  memo: Map<string, string[]>,
  visiting: Set<string>
): string[] {
  const cached = memo.get(taskId);
  if (cached) {
    return cached;
  }

  const node = nodes.get(taskId);
  if (!node || visiting.has(taskId)) {
    return [];
  }

  visiting.add(taskId);

  let longestChildPath: string[] = [];
  for (const dependentId of node.dependents) {
    const childPath = longestPathFrom(
      dependentId,
      nodes,
      memo,
      new Set(visiting)
    );
    if (childPath.length > longestChildPath.length) {
      longestChildPath = childPath;
    }
  }

  const path = [taskId, ...longestChildPath];
  memo.set(taskId, path);
  return path;
}

function collectDependencies(
  taskId: string,
  graph: TaskGraph,
  dependencies: Set<string>
): void {
  const node = graph.nodes.get(taskId);
  if (!node) {
    return;
  }

  for (const dependencyId of node.dependsOn) {
    if (!dependencies.has(dependencyId)) {
      dependencies.add(dependencyId);
      collectDependencies(dependencyId, graph, dependencies);
    }
  }
}

function generateEpicCompletion(
  epics: Map<string, Epic>,
  tasks: Task[]
): EpicCompletionReport[] {
  return Array.from(epics.values()).map(epic => {
    const epicTasks = tasks.filter(task => task.epic === epic.id);
    const done = epicTasks.filter(task => task.status === 'done').length;

    return {
      epicId: epic.id,
      title: epic.title,
      total: epicTasks.length,
      done,
      percentDone: percent(done, epicTasks.length)
    };
  });
}

function generateWorkload(tasks: Task[]): WorkloadReport[] {
  const reports = new Map<string, WorkloadReport>();

  for (const task of tasks) {
    const assignee = task.assignee || 'Unassigned';
    let report = reports.get(assignee);

    if (!report) {
      report = {
        assignee,
        total: 0,
        byStatus: createStatusRecord()
      };
      reports.set(assignee, report);
    }

    report.total += 1;
    report.byStatus[task.status] += 1;
  }

  return Array.from(reports.values()).sort((a, b) =>
    a.assignee.localeCompare(b.assignee)
  );
}

function generateTimeline(
  milestones: Map<string, Milestone>,
  tasks: Task[]
): TimelineReport[] {
  return Array.from(milestones.values())
    .map(milestone => {
      const milestoneTasks = tasks.filter(task => task.milestone === milestone.id);
      const done = milestoneTasks.filter(task => task.status === 'done').length;

      return {
        milestoneId: milestone.id,
        title: milestone.title,
        targetDate: milestone.targetDate,
        total: milestoneTasks.length,
        done,
        percentDone: percent(done, milestoneTasks.length),
        status: milestone.status
      };
    })
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
}

function createStatusRecord(): Record<TaskStatus, number> {
  return TASK_STATUSES.reduce(
    (record, status) => ({
      ...record,
      [status]: 0
    }),
    {} as Record<TaskStatus, number>
  );
}

function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}
