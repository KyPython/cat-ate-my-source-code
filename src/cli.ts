#!/usr/bin/env node

import { Command } from 'commander';
import { backupCommand } from './commands/backup';
import { restoreCommand } from './commands/restore';
import { listCommand } from './commands/list';
import { checkCommand } from './commands/check';

const program = new Command();

program
  .name('cat-ate-my-source-code')
  .description('A pragmatic backup & restore CLI tool for code projects')
  .version('1.0.0');

program
  .command('backup')
  .description('Backup a project or all projects')
  .option('-p, --project <name>', 'Project name to backup')
  .option('-a, --all', 'Backup all projects')
  .option('-t, --target <name>', 'Backup target name (default: first target)')
  .option('--dry-run', 'Show what would be backed up without actually backing up')
  .option('--config <path>', 'Path to config file')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    await backupCommand({
      project: options.project,
      all: options.all,
      target: options.target,
      dryRun: options.dryRun,
      configPath: options.config,
      verbose: options.verbose,
    });
  });

program
  .command('restore')
  .description('Restore a backup to a destination')
  .requiredOption('-p, --project <name>', 'Project name')
  .requiredOption('-b, --backup <timestamp>', 'Backup timestamp (from list command)')
  .requiredOption('-d, --dest <path>', 'Destination path for restored files')
  .option('--dry-run', 'Show what would be restored without actually restoring')
  .option('--config <path>', 'Path to config file')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    await restoreCommand({
      project: options.project,
      backup: options.backup,
      dest: options.dest,
      dryRun: options.dryRun,
      configPath: options.config,
      verbose: options.verbose,
    });
  });

program
  .command('list')
  .description('List available backups')
  .option('-p, --project <name>', 'Project name (default: all projects)')
  .option('-t, --target <name>', 'Backup target name (default: first target)')
  .option('--config <path>', 'Path to config file')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    await listCommand({
      project: options.project,
      target: options.target,
      configPath: options.config,
      verbose: options.verbose,
    });
  });

program
  .command('check')
  .description('Validate configuration file')
  .option('--config <path>', 'Path to config file')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    await checkCommand({
      configPath: options.config,
      verbose: options.verbose,
    });
  });

program.parse();



