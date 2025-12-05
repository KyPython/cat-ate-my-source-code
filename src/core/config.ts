import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Logger } from './logging';

export interface ProjectConfig {
  name: string;
  path: string;
  exclude?: string[];
}

export interface LocalBackupTarget {
  name: string;
  type: 'local';
  path: string;
}

export interface RemoteBackupTarget {
  name: string;
  type: 'remote';
  ssh?: {
    host: string;
    user?: string;
    port?: number;
    keyPath?: string;
  };
  path: string;
}

export type BackupTarget = LocalBackupTarget | RemoteBackupTarget;

export interface RetentionConfig {
  maxBackupsPerProject?: number;
}

export interface AppConfig {
  projects: ProjectConfig[];
  backupTargets: BackupTarget[];
  retention?: RetentionConfig;
  compression?: boolean;
}

const DEFAULT_CONFIG_NAME = 'cat-ate-my-source-code.config.json';
const DEFAULT_HOME_CONFIG_DIR = '.cat-ate-my-source-code';
const DEFAULT_HOME_CONFIG_FILE = 'config.json';

export class ConfigLoader {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async loadConfig(configPath?: string): Promise<AppConfig> {
    let configFile: string | null = null;

    if (configPath) {
      configFile = path.resolve(configPath);
    } else {
      // Try CWD first
      const cwdConfig = path.resolve(process.cwd(), DEFAULT_CONFIG_NAME);
      try {
        await fs.access(cwdConfig);
        configFile = cwdConfig;
      } catch {
        // Try home directory
        const homeConfig = path.join(
          os.homedir(),
          DEFAULT_HOME_CONFIG_DIR,
          DEFAULT_HOME_CONFIG_FILE
        );
        try {
          await fs.access(homeConfig);
          configFile = homeConfig;
        } catch {
          throw new Error(
            `Config file not found. Please create ${DEFAULT_CONFIG_NAME} in the current directory or ${homeConfig}`
          );
        }
      }
    }

    this.logger.debug(`Loading config from: ${configFile}`);

    try {
      const content = await fs.readFile(configFile, 'utf-8');
      const config: AppConfig = JSON.parse(content);
      await this.validateConfig(config, configFile);
      return config;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Config file not found: ${configFile}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in config file: ${error.message}`);
      }
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  private async validateConfig(config: AppConfig, configPath: string): Promise<void> {
    if (!config.projects || !Array.isArray(config.projects) || config.projects.length === 0) {
      throw new Error('Config must have at least one project defined');
    }

    if (!config.backupTargets || !Array.isArray(config.backupTargets) || config.backupTargets.length === 0) {
      throw new Error('Config must have at least one backup target defined');
    }

    const configDir = path.dirname(configPath);

    for (const project of config.projects) {
      if (!project.name) {
        throw new Error('Project must have a name');
      }
      if (!project.path) {
        throw new Error(`Project "${project.name}" must have a path`);
      }

      // Resolve project path relative to config file if relative
      const projectPath = path.isAbsolute(project.path)
        ? project.path
        : path.resolve(configDir, project.path);

      try {
        const stats = await fs.stat(projectPath);
        if (!stats.isDirectory()) {
          throw new Error(`Project path "${project.path}" is not a directory`);
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new Error(`Project path does not exist: ${project.path}`);
        }
        throw error;
      }
    }

    for (const target of config.backupTargets) {
      if (!target.name) {
        throw new Error('Backup target must have a name');
      }
      if (target.type === 'local') {
        if (!target.path) {
          throw new Error(`Backup target "${target.name}" must have a path`);
        }
        // For local targets, ensure the directory exists or can be created
        const targetPath = path.isAbsolute(target.path)
          ? target.path
          : path.resolve(configDir, target.path);
        try {
          await fs.access(targetPath);
        } catch {
          this.logger.warn(`Backup target path does not exist: ${target.path}. It will be created on first backup.`);
        }
      } else if (target.type === 'remote') {
        // Remote targets are validated but not checked (stubbed)
        if (!target.path) {
          throw new Error(`Remote backup target "${target.name}" must have a path`);
        }
        this.logger.debug(`Remote target "${target.name}" configured (implementation stubbed)`);
      } else {
        throw new Error(`Unknown backup target type: ${(target as any).type}`);
      }
    }

    if (config.retention?.maxBackupsPerProject !== undefined) {
      if (config.retention.maxBackupsPerProject < 1) {
        throw new Error('maxBackupsPerProject must be at least 1');
      }
    }
  }

  getProjectConfig(config: AppConfig, projectName: string): ProjectConfig {
    const project = config.projects.find((p) => p.name === projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found in config`);
    }
    return project;
  }

  getBackupTarget(config: AppConfig, targetName?: string): BackupTarget {
    if (targetName) {
      const target = config.backupTargets.find((t) => t.name === targetName);
      if (!target) {
        throw new Error(`Backup target "${targetName}" not found in config`);
      }
      return target;
    }
    // Default to first target
    return config.backupTargets[0];
  }
}



