/**
 * Show command
 * Display details for a specific entity
 */

import {
  getTaskPullRequestRefs,
  loadRepository,
  parseSemanticDocument,
  runSemanticAnalysis
} from 'planfs-core';
import type { AnalyzerResult, Task } from 'planfs-core';

export interface ShowOptions {
  format?: 'pretty' | 'json';
  nlp?: boolean;
  language?: string;
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

    let analysis: AnalyzerResult | null = null;
    if (options.nlp === true) {
      const document = parseSemanticDocument(entity.type, entity.body, {
        filePath: entity.filePath
      });
      analysis = await runSemanticAnalysis(document, {
        enabled: true,
        language: options.language ?? 'en'
      });
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(options.nlp === true ? { entity, analysis } : entity, null, 2));
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
      if (analysis) printAnalysis(analysis);
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

function printAnalysis(analysis: AnalyzerResult): void {
  console.log('\nAdvisory prose analysis:');
  console.log('-'.repeat(60));
  console.log(`Analyzer: ${analysis.analyzer.id}@${analysis.analyzer.version} (${analysis.language})`);
  if (analysis.signals.length === 0) console.log('(no advisory signals)');
  for (const signal of analysis.signals) {
    console.log(
      `  - ${signal.kind} at ${signal.range.start.line}:${signal.range.start.column}: ${signal.message}`
    );
  }
  for (const diagnostic of analysis.diagnostics) {
    console.log(`  ! ${diagnostic.code}: ${diagnostic.message}`);
  }
  console.log('Advisory only; frontmatter and repository relationships are unchanged.');
}
