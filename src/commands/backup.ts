import { ConfigLoader, AppConfig } from '../core/config';
import { BackupPlan } from '../core/backupPlan';
import { Logger } from '../core/logging';

export interface BackupOptions {
  project?: string;
  all?: boolean;
  target?: string;
  dryRun?: boolean;
  configPath?: string;
  verbose?: boolean;
}

export async function backupCommand(options: BackupOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);
  const configLoader = new ConfigLoader(logger);
  const backupPlan = new BackupPlan(logger);

  try {
    const config = await configLoader.loadConfig(options.configPath);
    const configPath = options.configPath || process.cwd();

    const projectsToBackup = options.all
      ? config.projects
      : options.project
      ? [configLoader.getProjectConfig(config, options.project)]
      : [];

    if (projectsToBackup.length === 0) {
      throw new Error('Either --project <name> or --all must be specified');
    }

    const target = configLoader.getBackupTarget(config, options.target);
    const maxBackups = config.retention?.maxBackupsPerProject || 10;

    for (const project of projectsToBackup) {
      logger.info(`\nProcessing project: ${project.name}`);

      const timestamp = backupPlan.generateBackupTimestamp();
      await backupPlan.createBackup(
        project,
        target,
        timestamp,
        configPath,
        options.dryRun || false
      );

      // Apply retention policy
      if (!options.dryRun) {
        await backupPlan.applyRetention(
          target,
          project.name,
          maxBackups,
          configPath,
          false
        );
      } else {
        await backupPlan.applyRetention(
          target,
          project.name,
          maxBackups,
          configPath,
          true
        );
      }
    }

    logger.success('\nBackup completed successfully');
  } catch (error: any) {
    logger.error(error.message);
    process.exit(1);
  }
}



