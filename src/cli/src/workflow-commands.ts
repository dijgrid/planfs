/**
 * CLI command registration.
 */

import type { Argv } from 'yargs';
import type { PullRequestProviderId } from 'planfs-core';
import { updateCommand } from './commands/update';
import { filterCommand, FilterAction } from './commands/filter';
import { historyCommand } from './commands/history';
import { branchCommand } from './commands/branch';
import { gitCommand, GitAction } from './commands/git';
import { pullRequestCommand, PullRequestAction } from './commands/pr';
import { archiveCommand, ArchiveAction } from './commands/archive';
import { backlogCommand, BacklogAction } from './commands/backlog';

export function registerWorkflowCommands(cli: Argv): Argv {
  return cli
    .command(
      'update <id>', 'Preview or update common entity metadata',
      (y) => y.positional('id', { type: 'string' }).option('title', { type: 'string' }).option('status', { type: 'string' }).option('owner', { type: 'string' }).option('assignee', { type: 'string' }).option('priority', { type: 'string' }).option('target-date', { type: 'string' }).option('clear', { type: 'array', string: true, description: 'Explicitly clear optional fields' }).option('expected-updated-at', { type: 'string' }).option('dry-run', { type: 'boolean', default: false }).option('format', { type: 'string', choices: ['text', 'json'], default: 'text' }),
      async (args) => {
        const patch: Record<string, unknown> = { title: args.title, status: args.status, owner: args.owner, assignee: args.assignee, priority: args.priority, targetDate: args.targetDate };
        for (const field of args.clear as string[] ?? []) patch[field] = '__clear__';
        process.exit(await updateCommand(process.cwd(), args.id as string, { patch, expectedUpdatedAt: args.expectedUpdatedAt as string | undefined, dryRun: args.dryRun as boolean, format: args.format as 'text' | 'json' }));
      }
    )
    .command(
      'filter <action>', 'Manage repository-shared saved filters',
      (y) => y.positional('action', { choices: ['list', 'show', 'save', 'delete'] }).option('id', { type: 'string' }).option('name', { type: 'string' }).option('description', { type: 'string' }).option('criteria', { type: 'string', description: 'Filter criteria as JSON' }).option('dry-run', { type: 'boolean', default: false }).option('format', { type: 'string', choices: ['text', 'json'], default: 'text' }),
      async (args) => process.exit(await filterCommand(process.cwd(), args.action as FilterAction, { id: args.id as string | undefined, name: args.name as string | undefined, description: args.description as string | undefined, criteria: args.criteria as string | undefined, dryRun: args.dryRun as boolean, format: args.format as 'text' | 'json' }))
    )
    .command(
      'history <id>', 'Show Git history for a PlanFS entity',
      (y) => y.positional('id', { type: 'string' }).option('format', { type: 'string', choices: ['text', 'json'], default: 'text' }),
      async (args) => process.exit(await historyCommand(process.cwd(), args.id as string, args.format as 'text' | 'json'))
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
      'archive <action>',
      'Archive, restore, and browse hidden PlanFS tasks and epics',
      (y) =>
        y
          .positional('action', {
            describe: 'Archive workflow to run',
            choices: ['list', 'archive', 'restore', 'delete']
          })
          .option('id', {
            type: 'string',
            description: 'Task or epic ID'
          })
          .option('include-children', {
            type: 'boolean',
            default: false,
            description: 'When archiving an epic, also archive child tasks'
          })
          .option('dry-run', {
            type: 'boolean',
            default: false,
            description: 'Preview archive changes without writing files'
          })
          .option('expected-updated-at', {
            type: 'string',
            description: 'Refuse archive if the target updatedAt has changed'
          })
          .option('yes', {
            type: 'boolean',
            default: false,
            description: 'Confirm permanent archive deletion'
          })
          .option('disposition', { type: 'string', choices: ['completed', 'cancelled', 'duplicate', 'deferred', 'superseded'], description: 'Reason for archiving unfinished work' })
          .option('note', { type: 'string', description: 'Optional archive note' })
          .option('format', {
            type: 'string',
            choices: ['text', 'json'],
            default: 'text',
            description: 'Output format'
          }),
      async (args) => {
        const exitCode = await archiveCommand(
          process.cwd(),
          args.action as ArchiveAction,
          {
            id: args.id as string | undefined,
            includeChildren: args.includeChildren as boolean,
            dryRun: args.dryRun as boolean,
            expectedUpdatedAt: args.expectedUpdatedAt as string | undefined,
            yes: args.yes as boolean,
            disposition: args.disposition as 'completed' | 'cancelled' | 'duplicate' | 'deferred' | 'superseded' | undefined,
            note: args.note as string | undefined,
            format: args.format as 'text' | 'json'
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
  ;
}
