import * as path from 'path';
import * as fs from 'fs/promises';
import { Logger } from './logging';
import { FileSystem } from './fileSystem';
import { AppConfig, ProjectConfig, BackupTarget, LocalBackupTarget } from './config';

export interface BackupInfo {
  timestamp: string;
  path: string;
  projectName: string;
}

export class BackupPlan {
  private logger: Logger;
  private fileSystem: FileSystem;

  constructor(logger: Logger) {
    this.logger = logger;
    this.fileSystem = new FileSystem(logger);
  }

  generateBackupTimestamp(): string {
    const now = new Date();
    // toISOString() returns: 2025-12-05T06:59:31.153Z
    // We want: 2025-12-05T06-59-31Z (no milliseconds)
    return now.toISOString().split('.')[0].replace(/:/g, '-') + 'Z';
  }

  getBackupPath(
    target: BackupTarget,
    projectName: string,
    timestamp: string,
    configPath?: string
  ): string {
    if (target.type === 'local') {
      const targetPath = path.isAbsolute(target.path)
        ? target.path
        : configPath
        ? path.resolve(path.dirname(configPath), target.path)
        : path.resolve(process.cwd(), target.path);

      return path.join(targetPath, projectName, timestamp);
    } else {
      // Remote target - return path structure (actual implementation stubbed)
      return path.join(target.path, projectName, timestamp);
    }
  }

  async listBackups(
    target: BackupTarget,
    projectName: string,
    configPath?: string
  ): Promise<BackupInfo[]> {
    if (target.type !== 'local') {
      this.logger.warn('Listing remote backups is not yet implemented');
      return [];
    }

    const localTarget = target as LocalBackupTarget;
    const projectBackupDir = path.isAbsolute(localTarget.path)
      ? path.join(localTarget.path, projectName)
      : configPath
      ? path.resolve(path.dirname(configPath), localTarget.path, projectName)
      : path.resolve(process.cwd(), localTarget.path, projectName);

    const backups: BackupInfo[] = [];

    try {
      const entries = await fs.readdir(projectBackupDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const backupPath = path.join(projectBackupDir, entry.name);
          backups.push({
            timestamp: entry.name,
            path: backupPath,
            projectName,
          });
        }
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to list backups: ${error.message}`);
      }
      // Directory doesn't exist yet, return empty array
    }

    return backups;
  }

  async applyRetention(
    target: BackupTarget,
    projectName: string,
    maxBackups: number,
    configPath?: string,
    dryRun: boolean = false
  ): Promise<string[]> {
    if (target.type !== 'local') {
      this.logger.warn('Retention for remote backups is not yet implemented');
      return [];
    }

    const backups = await this.listBackups(target, projectName, configPath);
    const toRemove: string[] = [];

    if (backups.length > maxBackups) {
      const excess = backups.slice(maxBackups);
      for (const backup of excess) {
        toRemove.push(backup.path);
        if (!dryRun) {
          await this.fileSystem.removeDirectory(backup.path, false);
          this.logger.info(`Removed old backup: ${backup.timestamp}`);
        } else {
          this.logger.info(`[DRY RUN] Would remove old backup: ${backup.timestamp}`);
        }
      }
    }

    return toRemove;
  }

  async createBackup(
    project: ProjectConfig,
    target: BackupTarget,
    timestamp: string,
    configPath?: string,
    dryRun: boolean = false
  ): Promise<string> {
    if (target.type !== 'local') {
      throw new Error('Remote backups are not yet implemented. Use a local target.');
    }

    const backupPath = this.getBackupPath(target, project.name, timestamp, configPath);
    const excludePatterns = project.exclude || [];

    // Resolve project path
    const projectPath = path.isAbsolute(project.path)
      ? project.path
      : configPath
      ? path.resolve(path.dirname(configPath), project.path)
      : path.resolve(process.cwd(), project.path);

    this.logger.info(`Backing up ${project.name} from ${projectPath} to ${backupPath}`);

    if (!dryRun) {
      await this.fileSystem.ensureDirectoryExists(backupPath, false);
    }

    const stats = await this.fileSystem.copyDirectory(
      projectPath,
      backupPath,
      excludePatterns,
      dryRun
    );

    if (dryRun) {
      this.logger.info(`[DRY RUN] Would copy ${stats.filesCopied} files`);
      if (stats.skipped.length > 0) {
        this.logger.info(`[DRY RUN] Would skip ${stats.skipped.length} paths`);
      }
    } else {
      this.logger.success(
        `Backed up ${stats.filesCopied} files (${this.fileSystem.formatBytes(stats.bytesCopied)})`
      );
      if (stats.skipped.length > 0) {
        this.logger.info(`Skipped ${stats.skipped.length} paths (excluded)`);
        if (this.logger) {
          // Only show skipped paths in verbose mode
          for (const skipped of stats.skipped.slice(0, 10)) {
            this.logger.debug(`  Skipped: ${skipped}`);
          }
          if (stats.skipped.length > 10) {
            this.logger.debug(`  ... and ${stats.skipped.length - 10} more`);
          }
        }
      }
    }

    return backupPath;
  }

  async restoreBackup(
    backupPath: string,
    destination: string,
    dryRun: boolean = false
  ): Promise<void> {
    const exists = await this.fileSystem.directoryExists(destination);
    if (exists) {
      throw new Error(
        `Destination directory already exists: ${destination}. Use --in-place to overwrite (not yet implemented) or choose a different destination.`
      );
    }

    this.logger.info(`Restoring backup from ${backupPath} to ${destination}`);

    if (!dryRun) {
      await this.fileSystem.ensureDirectoryExists(destination, false);
      await this.fileSystem.copyDirectory(backupPath, destination, [], false);
      this.logger.success(`Restored backup to ${destination}`);
    } else {
      this.logger.info(`[DRY RUN] Would restore backup to ${destination}`);
    }
  }
}



