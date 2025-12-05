import { ConfigLoader } from '../core/config';
import { Logger } from '../core/logging';

export interface CheckOptions {
  configPath?: string;
  verbose?: boolean;
}

export async function checkCommand(options: CheckOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);
  const configLoader = new ConfigLoader(logger);

  try {
    logger.info('Validating configuration...\n');

    const config = await configLoader.loadConfig(options.configPath);

    logger.success('✓ Configuration file is valid\n');

    logger.info('Projects:');
    for (const project of config.projects) {
      logger.info(`  • ${project.name} - ${project.path}`);
      if (project.exclude && project.exclude.length > 0) {
        logger.info(`    Excludes: ${project.exclude.join(', ')}`);
      }
    }

    logger.info('\nBackup Targets:');
    for (const target of config.backupTargets) {
      logger.info(`  • ${target.name} (${target.type}) - ${target.path}`);
      if (target.type === 'remote') {
        logger.warn('    Remote backups are not yet fully implemented');
      }
    }

    if (config.retention) {
      logger.info('\nRetention Policy:');
      logger.info(
        `  Max backups per project: ${config.retention.maxBackupsPerProject || 'unlimited'}`
      );
    }

    if (config.compression) {
      logger.info('\nCompression: Enabled (not yet implemented)');
    }

    logger.success('\n✓ All checks passed');
  } catch (error: any) {
    logger.error(error.message);
    process.exit(1);
  }
}



