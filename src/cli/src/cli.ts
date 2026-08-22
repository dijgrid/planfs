#!/usr/bin/env node
/**
 * Main CLI entry point.
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { registerEntityCommands } from './entity-commands';
import { registerPlanningCommands } from './planning-commands';
import { registerWorkflowCommands } from './workflow-commands';
import pkg from '../package.json';

export async function main(): Promise<void> {
  const cli = registerEntityCommands(
    registerWorkflowCommands(
      registerPlanningCommands(
        yargs(hideBin(process.argv)).version(pkg.version)
      )
    )
  );

  await cli
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
