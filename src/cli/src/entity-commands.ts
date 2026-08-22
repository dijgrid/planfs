/**
 * CLI command registration.
 */

import type { Argv } from 'yargs';
import { nextCommand } from './commands/next';
import { listCommand } from './commands/list';
import { showCommand } from './commands/show';
import { inspectCommand } from './commands/inspect';
import { createCommand } from './commands/create';

export function registerEntityCommands(cli: Argv): Argv {
  return cli
    .command(
      'next',
      'List ranked next-work candidates',
      (y) =>
        y
          .option('assignee', {
            type: 'string',
            description: 'Filter by assignee'
          })
          .option('epic', {
            type: 'string',
            description: 'Filter by epic'
          })
          .option('milestone', {
            type: 'string',
            description: 'Filter by milestone'
          })
          .option('tag', {
            type: 'array',
            string: true,
            description: 'Filter by tag'
          })
          .option('status', {
            type: 'array',
            string: true,
            choices: ['todo', 'in-progress', 'review', 'done'],
            description: 'Filter by status'
          })
          .option('include-blocked', {
            type: 'boolean',
            default: false,
            description: 'Include blocked and missing-dependency tasks'
          })
          .option('explain', {
            type: 'boolean',
            default: false,
            description: 'Show all ranking reasons'
          })
          .option('limit', {
            type: 'number',
            description: 'Maximum number of candidates to show'
          })
          .option('format', {
            type: 'string',
            choices: ['text', 'json'],
            default: 'text',
            description: 'Output format'
          }),
      async (args) => {
        const exitCode = await nextCommand(process.cwd(), {
          assignee: args.assignee as string | undefined,
          epic: args.epic as string | undefined,
          milestone: args.milestone as string | undefined,
          tag: args.tag as string[] | undefined,
          status: args.status as string[] | undefined,
          includeBlocked: args.includeBlocked as boolean,
          explain: args.explain as boolean,
          limit: args.limit as number | undefined,
          format: args.format as 'text' | 'json'
        });
        process.exit(exitCode);
      }
    )
    .command(
      'list [type]',
      'List entities',
      (y) =>
        y
          .positional('type', {
            describe: 'Entity type to list',
            choices: ['tasks', 'epics', 'milestones', 'decisions'],
            default: 'tasks'
          })
          .option('status', {
            type: 'string',
            description: 'Filter by status'
          })
          .option('assignee', {
            type: 'string',
            description: 'Filter by assignee'
          })
          .option('epic', {
            type: 'string',
            description: 'Filter by epic'
          })
          .option('format', {
            type: 'string',
            choices: ['table', 'json'],
            default: 'table',
            description: 'Output format'
          }),
      async (args) => {
        const exitCode = await listCommand(process.cwd(), {
          type: args.type as 'tasks' | 'epics' | 'milestones' | 'decisions',
          status: args.status as string | undefined,
          assignee: args.assignee as string | undefined,
          epic: args.epic as string | undefined,
          format: args.format as 'table' | 'json'
        });
        process.exit(exitCode);
      }
    )
    .command(
      'show <id>',
      'Show entity details',
      (y) =>
        y
          .positional('id', {
            describe: 'Entity ID to show'
          })
          .option('format', {
            type: 'string',
            choices: ['pretty', 'json'],
            default: 'pretty'
          })
          .option('nlp', {
            type: 'boolean',
            default: false,
            description: 'Enable local advisory prose analysis'
          })
          .option('language', {
            type: 'string',
            default: 'en',
            description: 'Language for advisory prose analysis'
          }),
      async (args) => {
        const exitCode = await showCommand(process.cwd(), args.id as string, {
          format: args.format as 'pretty' | 'json',
          nlp: args.nlp as boolean,
          language: args.language as string
        });
        process.exit(exitCode);
      }
    )
    .command(
      'inspect <id>',
      'Inspect normalized semantic content and advisory suggestions',
      (y) =>
        y
          .positional('id', {
            describe: 'Entity ID to inspect'
          })
          .option('format', {
            type: 'string',
            choices: ['pretty', 'json'],
            default: 'pretty'
          })
          .option('view', {
            type: 'string',
            choices: [
              'all',
              'acceptance-criteria',
              'findings',
              'sections',
              'mentions',
              'relationships',
              'raw'
            ],
            default: 'all',
            description: 'Select a focused semantic view'
          })
          .option('nlp', {
            type: 'boolean',
            default: true,
            description: 'Run local advisory analysis (disable with --no-nlp)'
          })
          .option('language', {
            type: 'string',
            default: 'en',
            description: 'Language for local advisory analysis'
          }),
      async (args) => {
        const exitCode = await inspectCommand(process.cwd(), args.id as string, {
          format: args.format as 'pretty' | 'json',
          view: args.view as 'all' | 'acceptance-criteria' | 'findings' | 'sections' | 'mentions' | 'relationships' | 'raw',
          nlp: args.nlp as boolean,
          language: args.language as string
        });
        process.exitCode = exitCode;
      }
    )
    .command(
      'create <type>',
      'Create new entity',
      (y) =>
        y
          .positional('type', {
            describe: 'Entity type to create',
            choices: ['task', 'epic', 'milestone', 'decision']
          })
          .option('title', {
            alias: 't',
            type: 'string',
            description: 'Entity title'
          })
          .option('status', {
            type: 'string',
            description: 'Initial status'
          })
          .option('priority', {
            type: 'string',
            description: 'Priority (for tasks)'
          })
          .option('assignee', {
            type: 'string',
            description: 'Assignee'
          })
          .option('owner', {
            type: 'string',
            description: 'Owner for epics and milestones'
          })
          .option('description', {
            type: 'string',
            description: 'Description/body for epics and milestones'
          })
          .option('target-date', {
            type: 'string',
            description: 'Target date for milestones'
          })
          .option('dry-run', {
            type: 'boolean',
            default: false,
            description: 'Preview created Markdown without writing files'
          })
          .option('format', {
            type: 'string',
            choices: ['text', 'json'],
            default: 'text',
            description: 'Output format'
          }),
      async (args) => {
        const exitCode = await createCommand(
          process.cwd(),
          args.type as string,
          {
            title: args.title as string | undefined,
            status: args.status as string | undefined,
            priority: args.priority as string | undefined,
            assignee: args.assignee as string | undefined,
            owner: args.owner as string | undefined,
            description: args.description as string | undefined,
            targetDate: args.targetDate as string | undefined,
            dryRun: args.dryRun as boolean,
            format: args.format as 'text' | 'json'
          }
        );
        process.exit(exitCode);
      }
    )
  ;
}
