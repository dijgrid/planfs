#!/usr/bin/env node
/**
 * Main CLI entry point
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { validateCommand } from './commands/validate';
import { listCommand } from './commands/list';
import { showCommand } from './commands/show';
import { createCommand } from './commands/create';
import { branchCommand } from './commands/branch';
import { gitCommand, GitAction } from './commands/git';
import pkg from '../package.json';

export async function main(): Promise<void> {
  await yargs(hideBin(process.argv))
    .version(pkg.version)
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
            choices: ['task']
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
          }),
      async (args) => {
        const exitCode = await createCommand(
          process.cwd(),
          args.type as string,
          {
            title: args.title as string | undefined,
            status: args.status as string | undefined,
            priority: args.priority as string | undefined,
            assignee: args.assignee as string | undefined
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
