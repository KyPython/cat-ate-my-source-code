import { ConfigLoader } from '../core/config';
import { BackupPlan } from '../core/backupPlan';
import { Logger } from '../core/logging';

export interface RestoreOptions {
  project: string;
  backup: string;
  dest: string;
  dryRun?: boolean;
  configPath?: string;
  verbose?: boolean;
}

export async function restoreCommand(options: RestoreOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);
  const configLoader = new ConfigLoader(logger);
  const backupPlan = new BackupPlan(logger);

  try {
    const config = await configLoader.loadConfig(options.configPath);
    const configPath = options.configPath || process.cwd();

    const project = configLoader.getProjectConfig(config, options.project);
    const target = configLoader.getBackupTarget(config);

    // Find the backup
    const backups = await backupPlan.listBackups(target, project.name, configPath);
    const backupInfo = backups.find((b) => b.timestamp === options.backup);

    if (!backupInfo) {
      throw new Error(
        `Backup "${options.backup}" not found for project "${options.project}". Use 'list' command to see available backups.`
      );
    }

    await backupPlan.restoreBackup(backupInfo.path, options.dest, options.dryRun || false);
  } catch (error: any) {
    logger.error(error.message);
    process.exit(1);
  }
}



