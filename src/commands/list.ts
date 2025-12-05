import { ConfigLoader } from '../core/config';
import { BackupPlan } from '../core/backupPlan';
import { FileSystem } from '../core/fileSystem';
import { Logger } from '../core/logging';

export interface ListOptions {
  project?: string;
  target?: string;
  configPath?: string;
  verbose?: boolean;
}

export async function listCommand(options: ListOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);
  const configLoader = new ConfigLoader(logger);
  const backupPlan = new BackupPlan(logger);
  const fileSystem = new FileSystem(logger);

  try {
    const config = await configLoader.loadConfig(options.configPath);
    const configPath = options.configPath || process.cwd();

    const target = configLoader.getBackupTarget(config, options.target);

    const projectsToShow = options.project
      ? [configLoader.getProjectConfig(config, options.project)]
      : config.projects;

    if (projectsToShow.length === 0) {
      logger.info('No projects found in config');
      return;
    }

    for (const project of projectsToShow) {
      logger.info(`\nBackups for project: ${project.name}`);
      logger.info('─'.repeat(60));

      const backups = await backupPlan.listBackups(target, project.name, configPath);

      if (backups.length === 0) {
        logger.info('  No backups found');
        continue;
      }

      for (const backup of backups) {
        try {
          const size = await fileSystem.getDirectorySize(backup.path);
          logger.info(`  ${backup.timestamp}  (${fileSystem.formatBytes(size)})`);
        } catch {
          logger.info(`  ${backup.timestamp}  (size unknown)`);
        }
      }

      logger.info(`\n  Total: ${backups.length} backup(s)`);
    }
  } catch (error: any) {
    logger.error(error.message);
    process.exit(1);
  }
}



