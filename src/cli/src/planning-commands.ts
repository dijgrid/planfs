/**
 * CLI command registration.
 */

import type { Argv } from 'yargs';
import { aiCommand, AiAction, AiSummarySection } from './commands/ai';
import { initCommand } from './commands/init';
import { validateCommand } from './commands/validate';
import { doctorCommand } from './commands/doctor';
import { migrateCommand } from './commands/migrate';
import { formatCommand } from './commands/format';

export function registerPlanningCommands(cli: Argv): Argv {
  return cli
    .command(
      'ai <action>',
      'AI-oriented planning summary, semantic context, and update helpers',
      (y) =>
        y
          .positional('action', {
            describe: 'AI helper to run',
            choices: ['summary', 'context', 'update-task', 'bulk-update-tasks', 'initialize']
          })
          .option('id', {
            type: 'string',
            description: 'Entity ID for context or task ID to update'
          })
          .option('ids', {
            type: 'array',
            string: true,
            description: 'Task IDs to bulk update, comma-separated or repeated'
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
          .option('estimate', {
            type: 'string',
            description: 'Set task estimate'
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
          .option('only', {
            type: 'string',
            choices: ['open', 'ready', 'blocked', 'review', 'stale', 'recent'],
            description: 'Return only one planning summary section'
          })
          .option('compact', {
            type: 'boolean',
            default: false,
            description: 'Emit minified JSON for lower-overhead agent context'
          })
          .option('nlp', {
            type: 'boolean',
            default: false,
            description: 'Enable local advisory prose analysis for semantic context'
          })
          .option('language', {
            type: 'string',
            default: 'en',
            description: 'Language for advisory semantic-context analysis'
          })
          .option('expected-updated-at', {
            type: 'string',
            description: 'Refuse a task update if updatedAt changed since preview (use none for an unset timestamp)'
          })
          .option('command', {
            type: 'string',
            description: 'CLI command written by ai initialize (default: planfs)'
          })
          .option('dry-run', {
            type: 'boolean',
            default: false,
            description: 'Preview task updates or awareness initialization without writing files'
          })
          .option('file', {
            type: 'string',
            default: 'AGENTS.md',
            description: 'Agent instruction file to create or update'
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
            ids: args.ids as string[] | undefined,
            assignee: args.assignee as string | undefined,
            epic: args.epic as string | undefined,
            milestone: args.milestone as string | undefined,
            estimate: args.estimate as string | undefined,
            status: args.status as string[] | undefined,
            priority: args.priority as string | undefined,
            refinementState: args.refinementState as string[] | undefined,
            dueDate: args.dueDate as string | undefined,
            tags: args.tags as string | undefined,
            limit: args.limit as number | undefined,
            dryRun: args.dryRun as boolean,
            file: args.file as string | undefined,
            format: args.format as 'json' | 'text',
            only: args.only as AiSummarySection | undefined,
            compact: args.compact as boolean,
            nlp: args.nlp as boolean,
            language: args.language as string,
            expectedUpdatedAt: args.expectedUpdatedAt as string | undefined,
            command: args.command as string | undefined
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
          .option('strict', {
            type: 'boolean',
            default: false,
            description: 'Fail when validation warnings are present'
          })
          .option('semantic', {
            type: 'string',
            choices: ['baseline', 'automation-ready'],
            description: 'Explicitly validate a semantic Markdown content tier'
          })
          .option('lifecycle', {
            type: 'boolean',
            default: false,
            description: 'Add read-only lifecycle-sensitive semantic policy checks'
          })
          .option('criterion-check-state', {
            type: 'string',
            choices: ['ignore', 'info', 'warning', 'error'],
            default: 'warning',
            description: 'Severity for ordinary criteria without [ ] or [x] markers'
          })
          .option('nlp', {
            type: 'boolean',
            default: false,
            description: 'Include optional local advisory prose analysis'
          })
          .option('language', {
            type: 'string',
            default: 'en',
            description: 'Language for optional advisory prose analysis'
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
          strict: args.strict as boolean,
          format: args.format as 'text' | 'json',
          semantic: args.semantic as 'baseline' | 'automation-ready' | undefined,
          lifecycle: args.lifecycle as boolean,
          criterionCheckState: args.criterionCheckState as 'ignore' | 'info' | 'warning' | 'error',
          nlp: args.nlp as boolean,
          language: args.language as string
        });
        process.exitCode = exitCode;
      }
    )
    .command(
      'doctor',
      'Report actionable plan-health issues separately from historical references',
      (y) => y.option('format', { type: 'string', choices: ['text', 'json'], default: 'text' }),
      async (args) => {
        process.exit(await doctorCommand(process.cwd(), { format: args.format as 'text' | 'json' }));
      }
    )
    .command(
      'migrate',
      'Preview or apply a PlanFS format migration',
      (y) => y.option('apply', { type: 'boolean', default: false }).option('format', { type: 'string', choices: ['text', 'json'], default: 'text' }),
      async (args) => {
        process.exit(await migrateCommand(process.cwd(), { apply: args.apply as boolean, format: args.format as 'text' | 'json' }));
      }
    )
    .command(
      'format [ids..]',
      'Check, preview, or explicitly apply conservative semantic Markdown formatting',
      (y) =>
        y
          .positional('ids', {
            type: 'string',
            array: true,
            description: 'Entity IDs to format (comma-separated or repeated)'
          })
          .option('all', {
            type: 'boolean',
            default: false,
            description: 'Select every active repository entity'
          })
          .option('check', {
            type: 'boolean',
            default: false,
            description: 'Exit non-zero when a selected file needs formatting'
          })
          .option('apply', {
            type: 'boolean',
            default: false,
            description: 'Apply a previously previewed snapshot'
          })
          .option('expected-fingerprint', {
            type: 'array',
            string: true,
            description: 'Required apply token: sha256:... for one entity or ENTITY-ID=sha256:... for a batch'
          })
          .option('format', {
            type: 'string',
            choices: ['text', 'json'],
            default: 'text',
            description: 'Output format'
          }),
      async (args) => {
        const exitCode = await formatCommand(process.cwd(), {
          ids: args.ids as string[] | undefined,
          all: args.all as boolean,
          check: args.check as boolean,
          apply: args.apply as boolean,
          expectedFingerprint: args.expectedFingerprint as string[] | undefined,
          format: args.format as 'text' | 'json'
        });
        process.exitCode = exitCode;
      }
    )
  ;
}
