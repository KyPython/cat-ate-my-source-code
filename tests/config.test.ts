import { ConfigLoader } from '../src/core/config';
import { Logger } from '../src/core/logging';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ConfigLoader', () => {
  let logger: Logger;
  let configLoader: ConfigLoader;
  let testConfigDir: string;

  beforeEach(() => {
    logger = new Logger(false);
    configLoader = new ConfigLoader(logger);
    testConfigDir = path.join(os.tmpdir(), `cat-test-${Date.now()}`);
  });

  afterEach(async () => {
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadConfig', () => {
    it('should load valid config from specified path', async () => {
      await fs.mkdir(testConfigDir, { recursive: true });
      const configPath = path.join(testConfigDir, 'config.json');
      const validConfig = {
        projects: [
          {
            name: 'test-project',
            path: testConfigDir,
            exclude: ['node_modules'],
          },
        ],
        backupTargets: [
          {
            name: 'local',
            type: 'local',
            path: testConfigDir,
          },
        ],
      };

      await fs.writeFile(configPath, JSON.stringify(validConfig, null, 2));
      const config = await configLoader.loadConfig(configPath);

      expect(config.projects).toHaveLength(1);
      expect(config.projects[0].name).toBe('test-project');
      expect(config.backupTargets).toHaveLength(1);
    });

    it('should throw error for missing config file', async () => {
      const nonExistentPath = path.join(testConfigDir, 'nonexistent.json');
      await expect(configLoader.loadConfig(nonExistentPath)).rejects.toThrow();
    });

    it('should throw error for invalid JSON', async () => {
      await fs.mkdir(testConfigDir, { recursive: true });
      const configPath = path.join(testConfigDir, 'config.json');
      await fs.writeFile(configPath, '{ invalid json }');

      await expect(configLoader.loadConfig(configPath)).rejects.toThrow('Invalid JSON');
    });

    it('should throw error for missing projects', async () => {
      await fs.mkdir(testConfigDir, { recursive: true });
      const configPath = path.join(testConfigDir, 'config.json');
      const invalidConfig = {
        backupTargets: [
          {
            name: 'local',
            type: 'local',
            path: testConfigDir,
          },
        ],
      };

      await fs.writeFile(configPath, JSON.stringify(invalidConfig));
      await expect(configLoader.loadConfig(configPath)).rejects.toThrow('at least one project');
    });

    it('should throw error for missing backup targets', async () => {
      await fs.mkdir(testConfigDir, { recursive: true });
      const configPath = path.join(testConfigDir, 'config.json');
      const invalidConfig = {
        projects: [
          {
            name: 'test',
            path: testConfigDir,
          },
        ],
      };

      await fs.writeFile(configPath, JSON.stringify(invalidConfig));
      await expect(configLoader.loadConfig(configPath)).rejects.toThrow('at least one backup target');
    });

    it('should throw error for non-existent project path', async () => {
      await fs.mkdir(testConfigDir, { recursive: true });
      const configPath = path.join(testConfigDir, 'config.json');
      const invalidConfig = {
        projects: [
          {
            name: 'test',
            path: '/nonexistent/path',
          },
        ],
        backupTargets: [
          {
            name: 'local',
            type: 'local',
            path: testConfigDir,
          },
        ],
      };

      await fs.writeFile(configPath, JSON.stringify(invalidConfig));
      await expect(configLoader.loadConfig(configPath)).rejects.toThrow('does not exist');
    });

    it('should validate retention maxBackupsPerProject', async () => {
      await fs.mkdir(testConfigDir, { recursive: true });
      const configPath = path.join(testConfigDir, 'config.json');
      const invalidConfig = {
        projects: [
          {
            name: 'test',
            path: testConfigDir,
          },
        ],
        backupTargets: [
          {
            name: 'local',
            type: 'local',
            path: testConfigDir,
          },
        ],
        retention: {
          maxBackupsPerProject: 0,
        },
      };

      await fs.writeFile(configPath, JSON.stringify(invalidConfig));
      await expect(configLoader.loadConfig(configPath)).rejects.toThrow('at least 1');
    });
  });

  describe('getProjectConfig', () => {
    it('should return project config by name', async () => {
      await fs.mkdir(testConfigDir, { recursive: true });
      const configPath = path.join(testConfigDir, 'config.json');
      const config = {
        projects: [
          {
            name: 'project1',
            path: testConfigDir,
          },
          {
            name: 'project2',
            path: testConfigDir,
          },
        ],
        backupTargets: [
          {
            name: 'local',
            type: 'local',
            path: testConfigDir,
          },
        ],
      };

      await fs.writeFile(configPath, JSON.stringify(config));
      const loadedConfig = await configLoader.loadConfig(configPath);

      const project = configLoader.getProjectConfig(loadedConfig, 'project2');
      expect(project.name).toBe('project2');
    });

    it('should throw error for non-existent project', async () => {
      await fs.mkdir(testConfigDir, { recursive: true });
      const configPath = path.join(testConfigDir, 'config.json');
      const config = {
        projects: [
          {
            name: 'project1',
            path: testConfigDir,
          },
        ],
        backupTargets: [
          {
            name: 'local',
            type: 'local',
            path: testConfigDir,
          },
        ],
      };

      await fs.writeFile(configPath, JSON.stringify(config));
      const loadedConfig = await configLoader.loadConfig(configPath);

      expect(() => {
        configLoader.getProjectConfig(loadedConfig, 'nonexistent');
      }).toThrow('not found');
    });
  });

  describe('getBackupTarget', () => {
    it('should return target by name', async () => {
      await fs.mkdir(testConfigDir, { recursive: true });
      const configPath = path.join(testConfigDir, 'config.json');
      const config = {
        projects: [
          {
            name: 'test',
            path: testConfigDir,
          },
        ],
        backupTargets: [
          {
            name: 'target1',
            type: 'local',
            path: testConfigDir,
          },
          {
            name: 'target2',
            type: 'local',
            path: testConfigDir,
          },
        ],
      };

      await fs.writeFile(configPath, JSON.stringify(config));
      const loadedConfig = await configLoader.loadConfig(configPath);

      const target = configLoader.getBackupTarget(loadedConfig, 'target2');
      expect(target.name).toBe('target2');
    });

    it('should return first target when no name specified', async () => {
      await fs.mkdir(testConfigDir, { recursive: true });
      const configPath = path.join(testConfigDir, 'config.json');
      const config = {
        projects: [
          {
            name: 'test',
            path: testConfigDir,
          },
        ],
        backupTargets: [
          {
            name: 'target1',
            type: 'local',
            path: testConfigDir,
          },
        ],
      };

      await fs.writeFile(configPath, JSON.stringify(config));
      const loadedConfig = await configLoader.loadConfig(configPath);

      const target = configLoader.getBackupTarget(loadedConfig);
      expect(target.name).toBe('target1');
    });
  });
});



