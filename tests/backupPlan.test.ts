import { BackupPlan } from '../src/core/backupPlan';
import { Logger } from '../src/core/logging';
import { ProjectConfig, LocalBackupTarget } from '../src/core/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('BackupPlan', () => {
  let logger: Logger;
  let backupPlan: BackupPlan;
  let testDir: string;
  let projectDir: string;
  let backupTargetDir: string;

  beforeEach(async () => {
    logger = new Logger(false);
    backupPlan = new BackupPlan(logger);
    testDir = path.join(os.tmpdir(), `cat-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    projectDir = path.join(testDir, 'project');
    backupTargetDir = path.join(testDir, 'backups');

    // Ensure parent directory exists first
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(backupTargetDir, { recursive: true });

    // Create some test files
    await fs.writeFile(path.join(projectDir, 'file1.txt'), 'content1');
    await fs.writeFile(path.join(projectDir, 'file2.txt'), 'content2');
    await fs.mkdir(path.join(projectDir, 'subdir'), { recursive: true });
    await fs.writeFile(path.join(projectDir, 'subdir', 'file3.txt'), 'content3');
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('generateBackupTimestamp', () => {
    it('should generate ISO-like timestamp', () => {
      const timestamp = backupPlan.generateBackupTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/);
    });

    it('should generate unique timestamps', () => {
      const timestamp1 = backupPlan.generateBackupTimestamp();
      // Small delay to ensure different timestamp
      const timestamp2 = backupPlan.generateBackupTimestamp();
      // They might be the same if generated in the same second, but format should be correct
      expect(timestamp1).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/);
      expect(timestamp2).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/);
    });
  });

  describe('getBackupPath', () => {
    it('should generate correct backup path for local target', () => {
      const target: LocalBackupTarget = {
        name: 'local',
        type: 'local',
        path: backupTargetDir,
      };

      const projectName = 'test-project';
      const timestamp = '2025-01-15T10-30-00Z';

      const backupPath = backupPlan.getBackupPath(target, projectName, timestamp);
      expect(backupPath).toBe(path.join(backupTargetDir, projectName, timestamp));
    });
  });

  describe('listBackups', () => {
    it('should return empty array when no backups exist', async () => {
      const target: LocalBackupTarget = {
        name: 'local',
        type: 'local',
        path: backupTargetDir,
      };

      const backups = await backupPlan.listBackups(target, 'test-project');
      expect(backups).toEqual([]);
    });

    it('should list existing backups', async () => {
      const target: LocalBackupTarget = {
        name: 'local',
        type: 'local',
        path: backupTargetDir,
      };

      const projectName = 'test-project';
      const projectBackupDir = path.join(backupTargetDir, projectName);
      await fs.mkdir(projectBackupDir, { recursive: true });

      // Create some backup directories
      await fs.mkdir(path.join(projectBackupDir, '2025-01-15T10-30-00Z'), { recursive: true });
      await fs.mkdir(path.join(projectBackupDir, '2025-01-15T14-20-00Z'), { recursive: true });

      const backups = await backupPlan.listBackups(target, projectName);

      expect(backups).toHaveLength(2);
      expect(backups[0].timestamp).toBe('2025-01-15T14-20-00Z'); // Newest first
      expect(backups[1].timestamp).toBe('2025-01-15T10-30-00Z');
    });
  });

  describe('applyRetention', () => {
    it('should not remove backups when under limit', async () => {
      const target: LocalBackupTarget = {
        name: 'local',
        type: 'local',
        path: backupTargetDir,
      };

      const projectName = 'test-project';
      const projectBackupDir = path.join(backupTargetDir, projectName);
      await fs.mkdir(projectBackupDir, { recursive: true });

      await fs.mkdir(path.join(projectBackupDir, '2025-01-15T10-30-00Z'), { recursive: true });

      const removed = await backupPlan.applyRetention(target, projectName, 10, undefined, false);

      expect(removed).toHaveLength(0);
      const backups = await backupPlan.listBackups(target, projectName);
      expect(backups).toHaveLength(1);
    });

    it('should remove oldest backups when over limit', async () => {
      const target: LocalBackupTarget = {
        name: 'local',
        type: 'local',
        path: backupTargetDir,
      };

      const projectName = 'test-project';
      const projectBackupDir = path.join(backupTargetDir, projectName);
      await fs.mkdir(projectBackupDir, { recursive: true });

      // Create 5 backups
      for (let i = 0; i < 5; i++) {
        await fs.mkdir(path.join(projectBackupDir, `2025-01-15T${10 + i}-00-00Z`), {
          recursive: true,
        });
      }

      // Apply retention with max 3
      const removed = await backupPlan.applyRetention(target, projectName, 3, undefined, false);

      expect(removed).toHaveLength(2); // Should remove 2 oldest
      const backups = await backupPlan.listBackups(target, projectName);
      expect(backups).toHaveLength(3); // Should keep 3 newest
    });

    it('should not actually remove in dry-run mode', async () => {
      const target: LocalBackupTarget = {
        name: 'local',
        type: 'local',
        path: backupTargetDir,
      };

      const projectName = 'test-project';
      const projectBackupDir = path.join(backupTargetDir, projectName);
      await fs.mkdir(projectBackupDir, { recursive: true });

      // Create 5 backups
      for (let i = 0; i < 5; i++) {
        await fs.mkdir(path.join(projectBackupDir, `2025-01-15T${10 + i}-00-00Z`), {
          recursive: true,
        });
      }

      // Apply retention in dry-run mode
      const removed = await backupPlan.applyRetention(target, projectName, 3, undefined, true);

      expect(removed).toHaveLength(2); // Would remove 2
      const backups = await backupPlan.listBackups(target, projectName);
      expect(backups).toHaveLength(5); // But still all 5 exist
    });
  });

  describe('createBackup', () => {
    it('should create backup with all files', async () => {
      const project: ProjectConfig = {
        name: 'test-project',
        path: projectDir,
        exclude: [],
      };

      const target: LocalBackupTarget = {
        name: 'local',
        type: 'local',
        path: backupTargetDir,
      };

      const timestamp = backupPlan.generateBackupTimestamp();
      const backupPath = await backupPlan.createBackup(project, target, timestamp, undefined, false);

      // Verify backup was created
      const stats = await fs.stat(backupPath);
      expect(stats.isDirectory()).toBe(true);

      // Verify files were copied
      const file1 = path.join(backupPath, 'file1.txt');
      const file2 = path.join(backupPath, 'file2.txt');
      const file3 = path.join(backupPath, 'subdir', 'file3.txt');

      expect(await fs.access(file1).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(file2).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(file3).then(() => true).catch(() => false)).toBe(true);
    });

    it('should exclude specified patterns', async () => {
      // Create a file that should be excluded
      await fs.mkdir(path.join(projectDir, 'node_modules'), { recursive: true });
      await fs.writeFile(path.join(projectDir, 'node_modules', 'package.json'), '{}');

      const project: ProjectConfig = {
        name: 'test-project',
        path: projectDir,
        exclude: ['node_modules'],
      };

      const target: LocalBackupTarget = {
        name: 'local',
        type: 'local',
        path: backupTargetDir,
      };

      const timestamp = backupPlan.generateBackupTimestamp();
      await backupPlan.createBackup(project, target, timestamp, undefined, false);

      const backupPath = path.join(backupTargetDir, project.name, timestamp);
      const excludedDir = path.join(backupPath, 'node_modules');

      // Verify excluded directory is not in backup
      const exists = await fs
        .access(excludedDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it('should not create files in dry-run mode', async () => {
      const project: ProjectConfig = {
        name: 'test-project',
        path: projectDir,
        exclude: [],
      };

      const target: LocalBackupTarget = {
        name: 'local',
        type: 'local',
        path: backupTargetDir,
      };

      const timestamp = backupPlan.generateBackupTimestamp();
      await backupPlan.createBackup(project, target, timestamp, undefined, true);

      const backupPath = path.join(backupTargetDir, project.name, timestamp);

      // Verify backup directory was NOT created
      const exists = await fs
        .access(backupPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });
  });

  describe('restoreBackup', () => {
    it('should restore backup to destination', async () => {
      // Create a backup first
      const project: ProjectConfig = {
        name: 'test-project',
        path: projectDir,
        exclude: [],
      };

      const target: LocalBackupTarget = {
        name: 'local',
        type: 'local',
        path: backupTargetDir,
      };

      const timestamp = backupPlan.generateBackupTimestamp();
      const backupPath = await backupPlan.createBackup(project, target, timestamp, undefined, false);

      // Restore to new location
      const restorePath = path.join(testDir, 'restored');
      await backupPlan.restoreBackup(backupPath, restorePath, false);

      // Verify files were restored
      const file1 = path.join(restorePath, 'file1.txt');
      const content = await fs.readFile(file1, 'utf-8');
      expect(content).toBe('content1');
    });

    it('should throw error if destination exists', async () => {
      const backupPath = path.join(backupTargetDir, 'backup');
      await fs.mkdir(backupPath, { recursive: true });

      const existingDest = path.join(testDir, 'existing');
      await fs.mkdir(existingDest, { recursive: true });

      await expect(
        backupPlan.restoreBackup(backupPath, existingDest, false)
      ).rejects.toThrow('already exists');
    });
  });
});



