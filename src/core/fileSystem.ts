import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from './logging';

export interface CopyStats {
  filesCopied: number;
  directoriesCreated: number;
  bytesCopied: number;
  skipped: string[];
}

export class FileSystem {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async copyDirectory(
    source: string,
    destination: string,
    excludePatterns: string[] = [],
    dryRun: boolean = false
  ): Promise<CopyStats> {
    const stats: CopyStats = {
      filesCopied: 0,
      directoriesCreated: 0,
      bytesCopied: 0,
      skipped: [],
    };

    if (dryRun) {
      this.logger.info(`[DRY RUN] Would copy ${source} to ${destination}`);
    } else {
      await fs.mkdir(destination, { recursive: true });
      stats.directoriesCreated++;
    }

    await this.copyDirectoryRecursive(source, destination, source, excludePatterns, stats, dryRun);

    return stats;
  }

  private async copyDirectoryRecursive(
    source: string,
    destination: string,
    rootSource: string,
    excludePatterns: string[],
    stats: CopyStats,
    dryRun: boolean
  ): Promise<void> {
    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const relativePath = path.relative(rootSource, sourcePath);
      const destinationPath = path.join(destination, entry.name);

      // Check if path should be excluded
      if (this.shouldExclude(relativePath, excludePatterns)) {
        stats.skipped.push(relativePath);
        this.logger.debug(`Excluding: ${relativePath}`);
        continue;
      }

      if (entry.isDirectory()) {
        if (!dryRun) {
          await fs.mkdir(destinationPath, { recursive: true });
          stats.directoriesCreated++;
        }
        await this.copyDirectoryRecursive(
          sourcePath,
          destinationPath,
          rootSource,
          excludePatterns,
          stats,
          dryRun
        );
      } else if (entry.isFile()) {
        if (!dryRun) {
          const fileStats = await fs.stat(sourcePath);
          await fs.copyFile(sourcePath, destinationPath);
          stats.filesCopied++;
          stats.bytesCopied += fileStats.size;
        } else {
          stats.filesCopied++;
        }
      }
    }
  }

  private shouldExclude(relativePath: string, excludePatterns: string[]): boolean {
    const normalizedPath = relativePath.replace(/\\/g, '/'); // Normalize to forward slashes

    for (const pattern of excludePatterns) {
      const normalizedPattern = pattern.replace(/\\/g, '/');

      // Simple glob matching: support * and **
      if (this.matchesPattern(normalizedPath, normalizedPattern)) {
        return true;
      }
    }

    return false;
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    // ** matches any number of directories
    // * matches any characters except /
    const regexPattern = pattern
      .replace(/\*\*/g, '{{DOUBLE_STAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/{{DOUBLE_STAR}}/g, '.*')
      .replace(/\./g, '\\.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path) || path.includes(pattern);
  }

  async ensureDirectoryExists(dirPath: string, dryRun: boolean = false): Promise<void> {
    if (dryRun) {
      this.logger.debug(`[DRY RUN] Would create directory: ${dirPath}`);
      return;
    }

    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
      }
    }
  }

  async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async removeDirectory(dirPath: string, dryRun: boolean = false): Promise<void> {
    if (dryRun) {
      this.logger.info(`[DRY RUN] Would remove directory: ${dirPath}`);
      return;
    }

    await fs.rm(dirPath, { recursive: true, force: true });
  }

  async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(entryPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(entryPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore errors for size calculation
    }

    return totalSize;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}



