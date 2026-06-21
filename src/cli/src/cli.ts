#!/usr/bin/env node
/**
 * Main CLI entry point
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { PullRequestProviderId } from 'planfs-core';
import { validateCommand } from './commands/validate';
import { aiCommand, AiAction } from './commands/ai';
import { initCommand } from './commands/init';
import { listCommand } from './commands/list';
import { nextCommand } from './commands/next';
import { showCommand } from './commands/show';
import { createCommand } from './commands/create';
import { backlogCommand, BacklogAction } from './commands/backlog';
import { branchCommand } from './commands/branch';
import { gitCommand, GitAction } from './commands/git';
import { pullRequestCommand, PullRequestAction } from './commands/pr';
import pkg from '../package.json';

export async function main(): Promise<void> {
  await yargs(hideBin(process.argv))
    .version(pkg.version)
    .command(
      'ai <action>',
      'AI-oriented planning summary and update helpers',
      (y) =>
        y
          .positional('action', {
            describe: 'AI helper to run',
            choices: ['summary', 'update-task']
          })
          .option('id', {
            type: 'string',
            description: 'Task ID to update'
          })
          .option('assignee', {
            type: 'string',
            description: 'Scope summary or set task assignee'
          })
          .option('epic', {
            type: 'string',
            description: 'Scope summary or set task epic'
          })
          .option('milestone', {
            type: 'string',
            description: 'Scope summary or set task milestone'
          })
          .option('status', {
            type: 'array',
            string: true,
            choices: ['todo', 'in-progress', 'review', 'done'],
            description: 'Scope summary by status or set task status'
          })
          .option('priority', {
            type: 'string',
            choices: ['low', 'medium', 'high', 'critical'],
            description: 'Set task priority'
          })
          .option('refinement-state', {
            type: 'array',
            string: true,
            choices: ['captured', 'needs-refinement', 'ready', 'deferred', 'discarded'],
            description: 'Scope summary by refinement state or set task refinement state'
          })
          .option('due-date', {
            type: 'string',
            description: 'Set task due date'
          })
          .option('tags', {
            type: 'string',
            description: 'Set task tags as a comma-separated list'
          })
          .option('limit', {
            type: 'number',
            description: 'Maximum number of summary items per list'
          })
          .option('dry-run', {
            type: 'boolean',
            default: false,
            description: 'Preview task updates without writing files'
          })
          .option('format', {
            type: 'string',
            choices: ['json', 'text'],
            default: 'json',
            description: 'Output format'
          }),
      async (args) => {
        const exitCode = await aiCommand(
          process.cwd(),
          args.action as AiAction,
          {
            id: args.id as string | undefined,
            assignee: args.assignee as string | undefined,
            epic: args.epic as string | undefined,
            milestone: args.milestone as string | undefined,
            status: args.status as string[] | undefined,
            priority: args.priority as string | undefined,
            refinementState: args.refinementState as string[] | undefined,
            dueDate: args.dueDate as string | undefined,
            tags: args.tags as string | undefined,
            limit: args.limit as number | undefined,
            dryRun: args.dryRun as boolean,
            format: args.format as 'json' | 'text'
          }
        );
        process.exit(exitCode);
      }
    )
    .command(
      'init',
      'Initialize PlanFS repository structure',
      (y) =>
        y.option('format', {
          type: 'string',
          choices: ['text', 'json'],
          default: 'text',
          description: 'Output format'
        }),
      async (args) => {
        const exitCode = await initCommand(process.cwd(), {
          format: args.format as 'text' | 'json'
        });
        process.exit(exitCode);
      }
    )
    .command(
      'validate',
      'Validate the PlanFS repository',
      (y) =>
        y
          .option('verbose', {
            alias: 'v',
            type: 'boolean',
            description: 'Show detailed output',
            default: false
          })
          .option('format', {
            type: 'string',
            choices: ['text', 'json'],
            default: 'text',
            description: 'Output format'
          }),
      async (args) => {
        const exitCode = await validateCommand(process.cwd(), {
          verbose: args.verbose as boolean,
          format: args.format as 'text' | 'json'
        });
        process.exit(exitCode);
      }
    )
    .command(
      'branch',
      'Show PlanFS changes on the current Git branch',
      (y) =>
        y
          .option('base', {
            type: 'string',
            description: 'Base branch or ref to compare against'
          })
          .option('format', {
            type: 'string',
            choices: ['text', 'json'],
            default: 'text',
            description: 'Output format'
          }),
      async (args) => {
        const exitCode = await branchCommand(process.cwd(), {
          base: args.base as string | undefined,
          format: args.format as 'text' | 'json'
        });
        process.exit(exitCode);
      }
    )
    .command(
      'git <action> [message..]',
      'Use Git-aware PlanFS helpers',
      (y) =>
        y
          .positional('action', {
            describe: 'Git helper to run',
            choices: ['commit-message', 'validate-message']
          })
          .positional('message', {
            describe: 'Commit message to validate',
            type: 'string'
          })
          .option('base', {
            type: 'string',
            description: 'Base branch or ref for commit message suggestions'
          })
          .option('format', {
            type: 'string',
            choices: ['text', 'json'],
            default: 'text',
            description: 'Output format'
          }),
      async (args) => {
        const message = Array.isArray(args.message)
          ? args.message.join(' ')
          : args.message as string | undefined;
        const exitCode = await gitCommand(
          process.cwd(),
          args.action as GitAction,
          message,
          {
            base: args.base as string | undefined,
            format: args.format as 'text' | 'json'
          }
        );
        process.exit(exitCode);
      }
    )
    .command(
      'pr <action>',
      'Generate pull request planning context',
      (y) =>
        y
          .positional('action', {
            describe: 'Pull request helper to run',
            choices: ['summary', 'providers']
          })
          .option('base', {
            type: 'string',
            description: 'Base branch or ref to compare against'
          })
          .option('provider', {
            type: 'string',
            choices: ['github', 'gitlab', 'azure-devops'],
            default: 'github',
            description: 'Pull request provider'
          })
          .option('format', {
            type: 'string',
            choices: ['markdown', 'json'],
            default: 'markdown',
            description: 'Output format'
          }),
      async (args) => {
        const exitCode = await pullRequestCommand(
          process.cwd(),
          args.action as PullRequestAction,
          {
            base: args.base as string | undefined,
            provider: args.provider as PullRequestProviderId,
            format: args.format as 'markdown' | 'json'
          }
        );
        process.exit(exitCode);
      }
    )
    .command(
      'backlog <action>',
      'Manage backlog intake, refinement, and hygiene',
      (y) =>
        y
          .positional('action', {
            describe: 'Backlog workflow to run',
            choices: ['list', 'capture', 'set-state', 'review']
          })
          .option('title', {
            alias: 't',
            type: 'string',
            description: 'Title for captured backlog items'
          })
          .option('id', {
            type: 'string',
            description: 'Task ID to update'
          })
          .option('state', {
            type: 'string',
            choices: ['captured', 'needs-refinement', 'ready', 'deferred', 'discarded'],
            description: 'Backlog refinement state'
          })
          .option('assignee', {
            type: 'string',
            description: 'Filter or set assignee'
          })
          .option('epic', {
            type: 'string',
            description: 'Filter or set epic'
          })
          .option('milestone', {
            type: 'string',
            description: 'Filter or set milestone'
          })
          .option('priority', {
            type: 'string',
            choices: ['low', 'medium', 'high', 'critical'],
            description: 'Filter or set priority'
          })
          .option('tag', {
            type: 'array',
            string: true,
            description: 'Filter by tag'
          })
          .option('query', {
            type: 'string',
            description: 'Filter by text query'
          })
          .option('body', {
            type: 'string',
            description: 'Markdown body for captured backlog items'
          })
          .option('limit', {
            type: 'number',
            description: 'Maximum number of items to show'
          })
          .option('format', {
            type: 'string',
            choices: ['text', 'json'],
            default: 'text',
            description: 'Output format'
          }),
      async (args) => {
        const exitCode = await backlogCommand(
          process.cwd(),
          args.action as BacklogAction,
          {
            title: args.title as string | undefined,
            id: args.id as string | undefined,
            state: args.state as string | undefined,
            assignee: args.assignee as string | undefined,
            epic: args.epic as string | undefined,
            milestone: args.milestone as string | undefined,
            priority: args.priority as string | undefined,
            tag: args.tag as string[] | undefined,
            query: args.query as string | undefined,
            body: args.body as string | undefined,
            limit: args.limit as number | undefined,
            format: args.format as 'text' | 'json'
          }
        );
        process.exit(exitCode);
      }
    )
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
          }),
      async (args) => {
        const exitCode = await showCommand(process.cwd(), args.id as string, {
          format: args.format as 'pretty' | 'json'
        });
        process.exit(exitCode);
      }
    )
    .command(
      'create <type>',
      'Create new entity',
      (y) =>
        y
          .positional('type', {
            describe: 'Entity type to create',
            choices: ['task', 'epic', 'milestone']
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
            targetDate: args.targetDate as string | undefined
          }
        );
        process.exit(exitCode);
      }
    )
    .demandCommand(1, 'You must provide a command')
    .help()
    .strict()
    .parseAsync();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
